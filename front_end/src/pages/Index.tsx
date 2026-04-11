import { useState, useEffect, useCallback } from "react";
import { ArrowLeftRight, Volume2, Settings, ChevronDown } from "lucide-react";
import VistaHeader from "@/components/VistaHeader";
import LanguagePanel from "@/components/LanguagePanel";
import MicButton from "@/components/MicButton";
import WaveformVisualizer from "@/components/WaveformVisualizer";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

const API_BASE = "https://translation-api-1050963407386.us-central1.run.app";

const DOMAINS = [
  { id: "general", label: "General", icon: "💬" },
  { id: "medical", label: "Medical", icon: "🏥" },
  { id: "legal", label: "Legal", icon: "⚖️" },
];

const languageLabels: Record<string, { name: string; code: string }> = {
  english: { name: "English", code: "EN" },
  spanish: { name: "Español", code: "ES" },
};

const Index = () => {
  const [sourceLanguage, setSourceLanguage] = useState<"english" | "spanish">(
    "english"
  );
  const [domain, setDomain] = useState("general");
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [apiStatus, setApiStatus] = useState<
    "checking" | "online" | "offline"
  >("checking");
  const [copied, setCopied] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);

  const targetLanguage =
    sourceLanguage === "english" ? "spanish" : "english";

  const {
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
  } = useSpeechRecognition({
    sourceLang: sourceLanguage,
    targetLang: targetLanguage,
    domain,
    autoSpeak,
    apiBase: API_BASE,
  });

  // Health check
  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then((r) =>
        r.ok ? setApiStatus("online") : setApiStatus("offline")
      )
      .catch(() => setApiStatus("offline"));
  }, []);

  const handleToggleMic = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const handleSwapLanguages = useCallback(() => {
    if (isRecording) return;
    setSourceLanguage((prev) =>
      prev === "english" ? "spanish" : "english"
    );
    clearAll();
  }, [isRecording, clearAll]);

  const handleCopyAll = () => {
    const text = lines
      .map(
        (l, i) =>
          `[${i + 1}] ${l.source}\n  → ${l.translated || "..."}`
      )
      .join("\n\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = (text: string) => {
    speakText(text, targetLanguage);
  };

  if (!supported) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md px-6">
          <div className="text-5xl mb-4">🎙️</div>
          <h2 className="text-xl font-bold mb-2 text-foreground">
            Browser Not Supported
          </h2>
          <p className="text-muted-foreground">
            Speech Recognition requires Chrome or Edge.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <VistaHeader apiStatus={apiStatus} />

      {/* Language selector */}
      <div className="flex items-center justify-center gap-3 px-6 py-4">
        <span className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider">
          {languageLabels[sourceLanguage].code}
        </span>
        <span className="text-sm font-medium text-foreground">
          {languageLabels[sourceLanguage].name}
        </span>
        <button
          onClick={handleSwapLanguages}
          disabled={isRecording}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-all disabled:opacity-40"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
        </button>
        <span className="text-sm font-medium text-foreground">
          {languageLabels[targetLanguage].name}
        </span>
        <span className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider">
          {languageLabels[targetLanguage].code}
        </span>
      </div>

      {/* Translation panels */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 px-6 pb-4 max-w-5xl mx-auto w-full">
        <LanguagePanel
          language={languageLabels[sourceLanguage].name}
          languageCode={languageLabels[sourceLanguage].code}
          isSource={true}
          isActive={isRecording}
          lines={lines}
          interimText={interimText}
          onClear={clearAll}
          highlightIndex={highlightIndex}
          onHover={setHighlightIndex}
        />
        <LanguagePanel
          language={languageLabels[targetLanguage].name}
          languageCode={languageLabels[targetLanguage].code}
          isSource={false}
          isActive={false}
          lines={lines}
          interimText={interimText}
          onSpeak={handleSpeak}
          onCopyAll={handleCopyAll}
          copied={copied}
          highlightIndex={highlightIndex}
          onHover={setHighlightIndex}
        />
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-auto max-w-5xl px-6 pb-2">
          <div className="bg-destructive/10 border border-destructive/25 rounded-lg px-4 py-2 text-center">
            <span className="text-sm text-destructive">{error}</span>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col items-center gap-3 pb-6 pt-2">
        <WaveformVisualizer
          isActive={isRecording}
          recordingTime={recordingTime}
        />
        <MicButton isListening={isRecording} onToggle={handleToggleMic} />

        {/* Line count indicator */}
        {lines.length > 0 && (
          <span className="text-[11px] text-muted-foreground">
            {lines.length} segment{lines.length !== 1 ? "s" : ""} •{" "}
            {lines.filter((l) => !l.pending).length} translated
          </span>
        )}

        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={() => setAutoSpeak(!autoSpeak)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
              autoSpeak ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Volume2 className="w-3 h-3" />
            Auto-play {autoSpeak ? "ON" : "OFF"}
          </button>

          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Settings className="w-3 h-3" />
              Settings
              <ChevronDown
                className={`w-2.5 h-2.5 transition-transform ${
                  showSettings ? "rotate-180" : ""
                }`}
              />
            </button>

            {showSettings && (
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 bg-card border border-border rounded-xl shadow-lg p-4 space-y-3 z-20 animate-fade-in-up">
                <p className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
                  Domain
                </p>
                <div className="flex gap-1.5">
                  {DOMAINS.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setDomain(d.id)}
                      className={`flex-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-colors ${
                        domain === d.id
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "bg-muted border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {d.icon} {d.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;