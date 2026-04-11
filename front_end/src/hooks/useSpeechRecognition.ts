import { useState, useRef, useCallback, useEffect } from "react";

export interface TranslationLine {
  source: string;
  translated: string;
  pending: boolean;
}

interface UseSpeechRecognitionOptions {
  sourceLang: string;
  targetLang: string;
  domain: string;
  autoSpeak: boolean;
  apiBase: string;
}

export function useSpeechRecognition({
  sourceLang,
  targetLang,
  domain,
  autoSpeak,
  apiBase,
}: UseSpeechRecognitionOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [lines, setLines] = useState<TranslationLine[]>([]);
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState("");
  const [supported, setSupported] = useState(true);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const isRecordingRef = useRef(false);
  const sourceLangRef = useRef(sourceLang);
  const targetLangRef = useRef(targetLang);
  const domainRef = useRef(domain);
  const autoSpeakRef = useRef(autoSpeak);

  useEffect(() => { sourceLangRef.current = sourceLang; }, [sourceLang]);
  useEffect(() => { targetLangRef.current = targetLang; }, [targetLang]);
  useEffect(() => { domainRef.current = domain; }, [domain]);
  useEffect(() => { autoSpeakRef.current = autoSpeak; }, [autoSpeak]);

  // Init speech recognition
  useEffect(() => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;
  }, []);

  // Update recognition language
  useEffect(() => {
    if (recognitionRef.current) {
      const langMap: Record<string, string> = {
        english: "en-US",
        spanish: "es-ES",
      };
      recognitionRef.current.lang = langMap[sourceLang] || "en-US";
    }
  }, [sourceLang]);

  // Preload TTS voices
  useEffect(() => {
    window.speechSynthesis?.getVoices();
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () =>
        window.speechSynthesis.getVoices();
    }
  }, []);

  const speakText = useCallback((text: string, lang: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const langMap: Record<string, string> = {
      english: "en-US",
      spanish: "es-ES",
    };
    utterance.lang = langMap[lang] || "en-US";
    utterance.rate = 0.95;
    const voices = window.speechSynthesis.getVoices();
    const langCode = lang === "spanish" ? "es" : "en";
    const match = voices.find((v) => v.lang.startsWith(langCode));
    if (match) utterance.voice = match;
    window.speechSynthesis.speak(utterance);
  }, []);

  const translateLine = useCallback(
    async (text: string, lineIndex: number) => {
      const dirMap: Record<string, string> = {
        "english-spanish": "en_to_es",
        "spanish-english": "es_to_en",
      };
      const direction =
        dirMap[`${sourceLangRef.current}-${targetLangRef.current}`] ||
        "en_to_es";

      try {
        const res = await fetch(`${apiBase}/translate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: text.trim(),
            direction,
            domain: domainRef.current,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || `Error ${res.status}`);
        }
        const data = await res.json();
        const translated =
          data.translated_text || data.translation || JSON.stringify(data);
        setLines((prev) =>
          prev.map((l, i) =>
            i === lineIndex ? { ...l, translated, pending: false } : l
          )
        );
        if (autoSpeakRef.current)
          speakText(translated, targetLangRef.current);
      } catch (e: any) {
        setLines((prev) =>
          prev.map((l, i) =>
            i === lineIndex
              ? { ...l, translated: `Error: ${e.message}`, pending: false }
              : l
          )
        );
      }
    },
    [apiBase, speakText]
  );

  const startRecording = useCallback(() => {
    if (!recognitionRef.current) return;
    const recognition = recognitionRef.current;
    setLines([]);
    setInterimText("");
    setError("");
    setRecordingTime(0);
    let finalizedCount = 0;

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          const trimmed = t.trim();
          if (trimmed) {
            const idx = finalizedCount;
            finalizedCount++;
            setLines((prev) => [
              ...prev,
              { source: trimmed, translated: "", pending: true },
            ]);
            translateLine(trimmed, idx);
          }
          setInterimText("");
        } else {
          interim = t;
        }
      }
      if (interim) setInterimText(interim);
    };

    recognition.onerror = (event: any) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        setError(`Speech error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      if (isRecordingRef.current) {
        try {
          recognition.start();
        } catch (_e) {
          // ignore restart errors
        }
      }
    };

    try {
      recognition.start();
      setIsRecording(true);
      isRecordingRef.current = true;
      timerRef.current = setInterval(
        () => setRecordingTime((t) => t + 1),
        1000
      );
    } catch (_e) {
      setError("Could not start microphone. Check permissions.");
    }
  }, [translateLine]);

  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.abort();
    }
    setIsRecording(false);
    clearInterval(timerRef.current);
    setInterimText("");
  }, []);

  const clearAll = useCallback(() => {
    setLines([]);
    setInterimText("");
    setError("");
    setRecordingTime(0);
  }, []);

  return {
    isRecording,
    recordingTime,
    lines,
    interimText,
    error,
    supported,
    speakText,
    startRecording,
    stopRecording,
    clearAll,
  };
}