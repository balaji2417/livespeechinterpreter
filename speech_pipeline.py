import os
import sys
import time
import queue
import threading
import requests
import pyaudio
from google.cloud import speech, texttospeech

# ── Config ────────────────────────────────────────────────────────────────────
TRANSLATE_API = "https://translation-api-1050963407386.us-central1.run.app/translate"
GCP_KEY       = os.path.join(os.path.dirname(__file__), "gcp-key.json")

# Set GCP credentials
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = GCP_KEY

# Audio config
RATE          = 16000
CHUNK         = int(RATE / 10)  # 100ms chunks
CHANNELS      = 1
FORMAT        = pyaudio.paInt16

# Translation config
DIRECTION     = "en_to_es"   # Change to "es_to_en" for Spanish → English
DOMAIN        = "medical"    # or "legal"

# ── Colors for terminal output ────────────────────────────────────────────────
GREEN  = "\033[92m"
BLUE   = "\033[94m"
ORANGE = "\033[93m"
RED    = "\033[91m"
RESET  = "\033[0m"
BOLD   = "\033[1m"

# ── Google Speech-to-Text ─────────────────────────────────────────────────────
class MicrophoneStream:
    def __init__(self, rate, chunk):
        self.rate  = rate
        self.chunk = chunk
        self._buff = queue.Queue()
        self.closed = True
        self._audio = None
        self._stream = None

    def __enter__(self):
        self._audio = pyaudio.PyAudio()
        self._stream = self._audio.open(
            format=FORMAT,
            channels=CHANNELS,
            rate=self.rate,
            input=True,
            frames_per_buffer=self.chunk,
            stream_callback=self._fill_buffer,
        )
        self.closed = False
        return self

    def __exit__(self, type, value, traceback):
        self._stream.stop_stream()
        self._stream.close()
        self.closed = True
        self._buff.put(None)
        self._audio.terminate()

    def _fill_buffer(self, in_data, frame_count, time_info, status_flags):
        self._buff.put(in_data)
        return None, pyaudio.paContinue

    def generator(self):
        while not self.closed:
            chunk = self._buff.get()
            if chunk is None:
                return
            data = [chunk]
            while True:
                try:
                    chunk = self._buff.get(block=False)
                    if chunk is None:
                        return
                    data.append(chunk)
                except queue.Empty:
                    break
            yield b"".join(data)


def listen_print_loop(responses, tts_client, translate_fn):
    for response in responses:
        if not response.results:
            continue
        result = response.results[0]
        if not result.alternatives:
            continue

        transcript = result.alternatives[0].transcript

        if result.is_final:
            print(f"\n{BOLD}{BLUE}🎤 You said:{RESET} {transcript}")
            translate_fn(transcript, tts_client)
        else:
            # Show interim result on same line
            print(f"\r{ORANGE}🎤 Listening: {transcript}{RESET}", end="", flush=True)


# ── Translation ───────────────────────────────────────────────────────────────
def translate_text(text: str, tts_client) -> str:
    if not text.strip():
        return ""
    try:
        print(f"{ORANGE}⏳ Translating...{RESET}")
        response = requests.post(
            TRANSLATE_API,
            json={
                "text": text,
                "direction": DIRECTION,
                "domain": DOMAIN,
            },
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()
        translated = data["translated_text"]
        latency = data["latency_ms"]
        print(f"{BOLD}{GREEN}🌐 Translation:{RESET} {translated}")
        print(f"{ORANGE}⚡ Latency: {latency:.0f}ms{RESET}")
        speak_text(translated, tts_client)
        return translated
    except Exception as e:
        print(f"{RED}❌ Translation error: {e}{RESET}")
        return ""


# ── Google Text-to-Speech ─────────────────────────────────────────────────────
def speak_text(text: str, tts_client):
    try:
        # Detect language for TTS voice
        if DIRECTION == "en_to_es":
            lang_code = "es-ES"
            voice_name = "es-ES-Standard-A"
        else:
            lang_code = "en-US"
            voice_name = "en-US-Standard-C"

        synthesis_input = texttospeech.SynthesisInput(text=text)
        voice = texttospeech.VoiceSelectionParams(
            language_code=lang_code,
            name=voice_name,
        )
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.LINEAR16,
            sample_rate_hertz=RATE,
        )

        response = tts_client.synthesize_speech(
            input=synthesis_input,
            voice=voice,
            audio_config=audio_config,
        )

        # Play audio
        play_audio(response.audio_content)

    except Exception as e:
        print(f"{RED}❌ TTS error: {e}{RESET}")


def play_audio(audio_bytes: bytes):
    audio = pyaudio.PyAudio()
    # Skip the WAV header (44 bytes) for LINEAR16
    raw_audio = audio_bytes[44:] if audio_bytes[:4] == b"RIFF" else audio_bytes
    stream = audio.open(
        format=FORMAT,
        channels=CHANNELS,
        rate=RATE,
        output=True,
    )
    stream.write(raw_audio)
    stream.stop_stream()
    stream.close()
    audio.terminate()


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    print(f"\n{BOLD}{'='*60}{RESET}")
    print(f"{BOLD}{BLUE}  Live Speech Interpreter{RESET}")
    print(f"{BOLD}{'='*60}{RESET}")

    direction_label = "English → Spanish" if DIRECTION == "en_to_es" else "Spanish → English"
    print(f"  Direction : {BOLD}{direction_label}{RESET}")
    print(f"  Domain    : {BOLD}{DOMAIN.capitalize()}{RESET}")
    print(f"  API       : {TRANSLATE_API}")
    print(f"{BOLD}{'='*60}{RESET}\n")

    # Check API health first
    print(f"{ORANGE}Checking API health...{RESET}")
    try:
        r = requests.get(TRANSLATE_API.replace("/translate", "/health"), timeout=10)
        data = r.json()
        if data.get("model_ready"):
            print(f"{GREEN}✓ API is ready{RESET}\n")
        else:
            print(f"{RED}⚠ API is still loading model. Please wait a few minutes.{RESET}\n")
            sys.exit(1)
    except Exception as e:
        print(f"{RED}❌ Cannot reach API: {e}{RESET}\n")
        sys.exit(1)

    # Initialize STT client
    stt_client = speech.SpeechClient()
    tts_client = texttospeech.TextToSpeechClient()

    # STT config
    stt_config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
        sample_rate_hertz=RATE,
        language_code="en-US" if DIRECTION == "en_to_es" else "es-ES",
        enable_automatic_punctuation=True,
        model="latest_long",
    )
    streaming_config = speech.StreamingRecognitionConfig(
        config=stt_config,
        interim_results=True,
    )

    print(f"{BOLD}{GREEN}🎙  Speak now... (Ctrl+C to stop){RESET}\n")

    with MicrophoneStream(RATE, CHUNK) as stream:
        audio_generator = stream.generator()
        requests_gen = (
            speech.StreamingRecognizeRequest(audio_content=chunk)
            for chunk in audio_generator
        )
        responses = stt_client.streaming_recognize(streaming_config, requests_gen)
        listen_print_loop(responses, tts_client, translate_text)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n\n{BOLD}{GREEN}✓ Speech interpreter stopped.{RESET}\n")
