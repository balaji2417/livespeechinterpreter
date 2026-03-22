import os
import json
import time
import torch
import argparse
from datasets import Dataset

# ✅ Fix tokenizers parallelism warning upfront
os.environ["TOKENIZERS_PARALLELISM"] = "false"

from transformers import (
    AutoProcessor,
    Gemma3ForConditionalGeneration,
    BitsAndBytesConfig,
    TrainerCallback,
)
from peft import (
    LoraConfig,
    get_peft_model,
    prepare_model_for_kbit_training,
    TaskType,
)
from trl import SFTTrainer, SFTConfig
from google.cloud import storage
from huggingface_hub import login

# ── Debug Callback ────────────────────────────────────────────────────────────
class DebugCallback(TrainerCallback):
    def on_train_begin(self, args, state, control, **kwargs):
        print(f"🚀 TRAINING STARTED | Total steps: {state.max_steps} | Epochs: {args.num_train_epochs}")
        print(f"🚀 Batch: {args.per_device_train_batch_size} | Grad accum: {args.gradient_accumulation_steps} | Effective batch: {args.per_device_train_batch_size * args.gradient_accumulation_steps}")

    def on_step_end(self, args, state, control, **kwargs):
        if state.global_step % 10 == 0:
            mem_alloc = torch.cuda.memory_allocated() / 1e9
            mem_reserved = torch.cuda.memory_reserved() / 1e9
            loss = state.log_history[-1].get("loss", "N/A") if state.log_history else "N/A"
            pct = (state.global_step / state.max_steps) * 100 if state.max_steps else 0
            print(
                f"✅ Step {state.global_step}/{state.max_steps} ({pct:.1f}%) | "
                f"Loss: {loss} | "
                f"GPU: {mem_alloc:.2f}GB alloc / {mem_reserved:.2f}GB reserved"
            )

    def on_epoch_end(self, args, state, control, **kwargs):
        loss = state.log_history[-1].get("loss", "N/A") if state.log_history else "N/A"
        print(f"🎉 EPOCH {int(state.epoch)}/{int(args.num_train_epochs)} COMPLETE | Steps: {state.global_step}/{state.max_steps} | Loss: {loss}")

    def on_train_end(self, args, state, control, **kwargs):
        print(f"🏁 TRAINING COMPLETE | Final step: {state.global_step} | Final loss: {state.log_history[-1].get('loss', 'N/A') if state.log_history else 'N/A'}")

# ── Args ──────────────────────────────────────────────────────────────────────
parser = argparse.ArgumentParser()
parser.add_argument("--gcs_train", type=str, required=True)
parser.add_argument("--gcs_val", type=str, required=True)
parser.add_argument("--model_name", type=str, default="google/gemma-3-4b-it")
parser.add_argument("--output_dir", type=str, default="/tmp/model_output")
parser.add_argument("--gcs_output", type=str, required=True)
parser.add_argument("--epochs", type=int, default=2)           # ✅ 2 epochs — faster, still quality
parser.add_argument("--batch_size", type=int, default=4)       # ✅ 4 — T4 handles with seq_len=128
parser.add_argument("--max_seq_length", type=int, default=128)
parser.add_argument("--lora_r", type=int, default=16)          # ✅ back to 16 for stability
parser.add_argument("--lora_alpha", type=int, default=32)      # ✅ 2x ratio
parser.add_argument("--lora_dropout", type=float, default=0.05)
parser.add_argument("--learning_rate", type=float, default=5e-5)  # ✅ 4x lower — fixes exploding loss
parser.add_argument("--hf_token", type=str, default=None)
args = parser.parse_args()

# ── GCS Helpers ───────────────────────────────────────────────────────────────
def download_from_gcs(gcs_path, local_path):
    client = storage.Client()
    bucket_name = gcs_path.replace("gs://", "").split("/")[0]
    blob_name = "/".join(gcs_path.replace("gs://", "").split("/")[1:])
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_name)
    blob.download_to_filename(local_path)
    print(f"Downloaded {gcs_path} -> {local_path}")

def upload_to_gcs(local_path, gcs_path):
    client = storage.Client()
    bucket_name = gcs_path.replace("gs://", "").split("/")[0]
    prefix = "/".join(gcs_path.replace("gs://", "").split("/")[1:])
    bucket = client.bucket(bucket_name)

    for root, dirs, files in os.walk(local_path):
        for file in files:
            local_file = os.path.join(root, file)
            relative = os.path.relpath(local_file, local_path)
            blob_name = os.path.join(prefix, relative)
            blob = bucket.blob(blob_name)
            blob.upload_from_filename(local_file)
            print(f"Uploaded {local_file} -> gs://{bucket_name}/{blob_name}")

# ── Download Data ─────────────────────────────────────────────────────────────
print("Downloading training data from GCS...")
download_from_gcs(args.gcs_train, "/tmp/train.jsonl")
download_from_gcs(args.gcs_val, "/tmp/val.jsonl")

def load_jsonl(path):
    records = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records

print("Loading datasets...")
train_records = load_jsonl("/tmp/train.jsonl")
val_records = load_jsonl("/tmp/val.jsonl")

MAX_TRAIN = 50000   # ✅ reduced from 100K — halves training time, still sufficient
MAX_VAL = 5000      # ✅ reduced from 10K
train_records = train_records[:MAX_TRAIN]
val_records = val_records[:MAX_VAL]
print(f"✅ DATA CHECK: Train={len(train_records)} | Val={len(val_records)}")

def format_prompt(record):
    return (
        f"### Instruction:\n{record['instruction']}\n\n"
        f"### Input:\n{record['input']}\n\n"
        f"### Response:\n{record['output']}"
    )

train_data = Dataset.from_list([{"text": format_prompt(r)} for r in train_records])
val_data = Dataset.from_list([{"text": format_prompt(r)} for r in val_records])
print(f"✅ SAMPLE RECORD PREVIEW:\n{train_data[0]['text'][:300]}")

# ── HF Auth ───────────────────────────────────────────────────────────────────
hf_token = os.getenv("HUGGINGFACE_HUB_TOKEN") or args.hf_token
if not hf_token:
    raise ValueError("HUGGINGFACE_HUB_TOKEN or --hf_token must be provided")

print(f"✅ HF token detected: {bool(hf_token)}")
os.environ["HUGGINGFACE_HUB_TOKEN"] = hf_token
os.environ["HF_TOKEN"] = hf_token
login(token=hf_token, add_to_git_credential=False)

# ── GPU Sanity Check ──────────────────────────────────────────────────────────
print(f"✅ CUDA available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"✅ GPU: {torch.cuda.get_device_name(0)}")
    print(f"✅ GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")
else:
    raise RuntimeError("❌ No GPU detected! Check your Vertex AI machine type.")

# ── Model & Processor ─────────────────────────────────────────────────────────
print(f"Loading model: {args.model_name}")

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_use_double_quant=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.float16,  # ✅ float16 correct for T4 (no bfloat16)
)

processor = AutoProcessor.from_pretrained(
    args.model_name,
    token=hf_token,
    trust_remote_code=True,
    use_fast=True,  # ✅ fixes "slow processor" warning
)

tokenizer = processor.tokenizer
tokenizer.pad_token = tokenizer.eos_token
tokenizer.padding_side = "right"

model = Gemma3ForConditionalGeneration.from_pretrained(
    args.model_name,
    quantization_config=bnb_config,
    device_map="auto",
    trust_remote_code=True,
    token=hf_token,
    attn_implementation="eager",  # ✅ fixes gradient instability on Gemma3
)

model = prepare_model_for_kbit_training(model)

# ✅ Explicitly disable use_cache
model.config.use_cache = False
print(f"✅ use_cache = {model.config.use_cache}")   # must print False
print(f"✅ Model device: {next(model.parameters()).device}")

# ── LoRA Config ───────────────────────────────────────────────────────────────
lora_config = LoraConfig(
    r=args.lora_r,           # ✅ 16 for stability
    lora_alpha=args.lora_alpha,  # ✅ 32 (2x ratio)
    target_modules=[
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj"
    ],
    lora_dropout=args.lora_dropout,
    bias="none",
    task_type=TaskType.CAUSAL_LM,
)

model = get_peft_model(model, lora_config)
model.print_trainable_parameters()
# ✅ Expect: trainable params ~8M | trainable%: ~0.19–0.75%

# ── SFT Config ────────────────────────────────────────────────────────────────
sft_config = SFTConfig(
    output_dir=args.output_dir,
    num_train_epochs=args.epochs,
    per_device_train_batch_size=args.batch_size,       # ✅ 2
    per_device_eval_batch_size=args.batch_size,
    gradient_accumulation_steps=4,                     # ✅ reduced from 8 → 4 (effective batch = 16)
    warmup_steps=100,
    learning_rate=args.learning_rate,
    fp16=True,
    logging_steps=10,                                    # ✅ log every 10 steps (was 50) so you can see progress
    eval_strategy="no",
    save_strategy="epoch",
    save_total_limit=2,
    load_best_model_at_end=False,
    report_to="none",
    dataloader_num_workers=2,
    group_by_length=True,
    max_seq_length=args.max_seq_length,                # ✅ 128
    dataset_text_field="text",
    packing=True,                                      # ✅ enabled (was False) — ~2x throughput gain
)

# ── Trainer ───────────────────────────────────────────────────────────────────
trainer = SFTTrainer(
    model=model,
    args=sft_config,
    train_dataset=train_data,
    eval_dataset=val_data,
    processing_class=tokenizer,
    callbacks=[DebugCallback()],  # ✅ live step/epoch/loss/GPU logging
)

print("🚀 Starting QLoRA fine-tuning...")
train_start = time.time()
trainer.train()
train_end = time.time()
elapsed = (train_end - train_start) / 3600

print(f"✅ Training finished in {elapsed:.2f} hours")
print(f"✅ FINAL LOG: {trainer.state.log_history[-1]}")
print(f"✅ Total steps completed: {trainer.state.global_step}")

print("Saving model...")
trainer.save_model(args.output_dir)
tokenizer.save_pretrained(args.output_dir)

print(f"Uploading model to {args.gcs_output}...")
upload_to_gcs(args.output_dir, args.gcs_output)

print("🏁 Training complete!")