import os
import torch
import logging
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import AutoProcessor, AutoTokenizer, Gemma3ForConditionalGeneration
from peft import PeftModel
from google.cloud import storage, bigquery
import uvicorn
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────
MODEL_ID    = "google/gemma-3-4b-it"
ADAPTER_GCS = os.environ.get("ADAPTER_GCS", "gs://livespeechinterpreter-training/models/gemma3-4b-translation-v17")
HF_TOKEN    = os.environ.get("HF_TOKEN", "")
PROJECT_ID  = os.environ.get("PROJECT_ID", "mlops-489703")
BQ_DATASET  = os.environ.get("BQ_DATASET", "translation_monitoring")
BQ_TABLE    = os.environ.get("BQ_TABLE", "inference_logs")

# ── Global state ──────────────────────────────────────────────────────────────
processor   = None
model       = None
model_ready = False

# ── GCS adapter download ──────────────────────────────────────────────────────
def download_adapter(gcs_path: str, local_path: str):
    client = storage.Client()
    bucket_name = gcs_path.replace("gs://", "").split("/")[0]
    prefix = "/".join(gcs_path.replace("gs://", "").split("/")[1:])
    bucket = client.bucket(bucket_name)
    blobs = list(bucket.list_blobs(prefix=prefix))
    os.makedirs(local_path, exist_ok=True)
    for blob in blobs:
        relative = blob.name[len(prefix):].lstrip("/")
        if not relative:
            continue
        local_file = os.path.join(local_path, relative)
        os.makedirs(os.path.dirname(local_file), exist_ok=True)
        blob.download_to_filename(local_file)
        logger.info(f"Downloaded {blob.name} → {local_file}")

# ── Background model loader ───────────────────────────────────────────────────
async def load_model_async():
    global processor, model, model_ready
    try:
        logger.info("Starting background model load...")
        hf_token = HF_TOKEN if HF_TOKEN else None

        # Load tokenizer only (lightweight)
        logger.info("Loading tokenizer...")
        processor = AutoTokenizer.from_pretrained(
            MODEL_ID,
            token=hf_token,
            use_fast=True,
        )
        processor.pad_token = processor.eos_token
        logger.info("Tokenizer loaded.")

        # Load model in bfloat16 to save memory on CPU
        logger.info("Loading base model in bfloat16...")
        base_model = Gemma3ForConditionalGeneration.from_pretrained(
            MODEL_ID,
            torch_dtype=torch.bfloat16,
            device_map="cpu",
            token=hf_token,
            attn_implementation="eager",
            low_cpu_mem_usage=True,
        )
        logger.info("Base model loaded.")

        # Download and apply LoRA adapter
        logger.info(f"Downloading adapter from {ADAPTER_GCS}...")
        download_adapter(ADAPTER_GCS, "/tmp/adapter")

        model = PeftModel.from_pretrained(
            base_model,
            "/tmp/adapter",
            torch_dtype=torch.bfloat16,
        )
        model.eval()
        model_ready = True
        logger.info("Model fully loaded and ready!")

    except Exception as e:
        logger.error(f"Model loading failed: {e}")
        raise

# ── Lifespan ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    asyncio.create_task(load_model_async())
    yield

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Live Speech Interpreter API",
    description="Real-time English-Spanish translation using fine-tuned Gemma 3 4B",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Schemas ───────────────────────────────────────────────────────────────────
class TranslationRequest(BaseModel):
    text: str
    direction: str = "en_to_es"
    domain: str = "medical"

class TranslationResponse(BaseModel):
    input_text: str
    translated_text: str
    direction: str
    domain: str
    latency_ms: float

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_ready: bool

# ── BigQuery logging ──────────────────────────────────────────────────────────
def log_to_bq(req: TranslationRequest, resp: TranslationResponse):
    try:
        client = bigquery.Client(project=PROJECT_ID)
        table_id = f"{PROJECT_ID}.{BQ_DATASET}.{BQ_TABLE}"
        rows = [{
            "timestamp": datetime.utcnow().isoformat(),
            "input_text": req.text,
            "translated_text": resp.translated_text,
            "direction": req.direction,
            "domain": req.domain,
            "latency_ms": resp.latency_ms,
            "input_len": len(req.text.split()),
            "output_len": len(resp.translated_text.split()),
        }]
        errors = client.insert_rows_json(table_id, rows)
        if errors:
            logger.error(f"BQ insert errors: {errors}")
    except Exception as e:
        logger.error(f"BQ logging failed: {e}")

# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {
        "message": "Live Speech Interpreter API",
        "version": "1.0.0",
        "model_ready": model_ready,
        "endpoints": {
            "health": "/health",
            "translate": "/translate",
            "docs": "/docs"
        }
    }

@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="healthy" if model_ready else "loading",
        model_loaded=model is not None,
        model_ready=model_ready,
    )

@app.post("/translate", response_model=TranslationResponse)
async def translate(request: TranslationRequest):
    if not model_ready:
        raise HTTPException(
            status_code=503,
            detail="Model is still loading. Please try again in a few minutes."
        )

    start = datetime.utcnow()

    if request.direction == "en_to_es":
        instruction = f"Translate the following {request.domain} sentence from English to Spanish."
    else:
        instruction = f"Translate the following {request.domain} sentence from Spanish to English."

    prompt = (
        f"### Instruction:\n{instruction}\n\n"
        f"### Input:\n{request.text}\n\n"
        f"### Response:\n"
    )

    inputs = processor(
        prompt,
        return_tensors="pt",
        truncation=True,
        max_length=512,
    )

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=128,
            do_sample=False,
            pad_token_id=processor.eos_token_id,
            temperature=1.0,
        )

    input_length = inputs["input_ids"].shape[1]
    generated_ids = outputs[0][input_length:]
    translated = processor.decode(generated_ids, skip_special_tokens=True).strip()

    latency_ms = (datetime.utcnow() - start).total_seconds() * 1000

    response = TranslationResponse(
        input_text=request.text,
        translated_text=translated,
        direction=request.direction,
        domain=request.domain,
        latency_ms=round(latency_ms, 2),
    )

    log_to_bq(request, response)
    return response

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)