
import { useState, useEffect, useRef, useCallback } from "react";

const API_BASE = "https://translation-api-1050963407386.us-central1.run.app";

const DOMAINS = [
  { id: "general", label: "General", icon: "💬" },
  { id: "medical", label: "Medical", icon: "🏥" },
  { id: "legal", label: "Legal", icon: "⚖️" },
];

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
];

const colors = {
  bg: "#0a0f1e",
  bgCard: "rgba(30, 41, 74, 0.5)",
  border: "rgba(71, 85, 132, 0.4)",
  indigo: "#818cf8",
  indigoBg: "rgba(99, 102, 241, 0.15)",
  indigoBorder: "rgba(99, 102, 241, 0.35)",
  red: "#f87171",
  redBg: "rgba(239, 68, 68, 0.9)",
  emerald: "#6ee7b7",
  text: "#e2e8f0",
  textMuted: "#94a3b8",
  textDim: "#475569",
};

const baseBtn = {
  border: "none",
  cursor: "pointer",
  fontFamily: "inherit",
  transition: "all 0.2s ease",
};

export default function TranslationApp() {
  const [sourceLang, setSourceLang] = useState("en");
  const [targetLang, setTargetLang] = useState("es");
  const [domain, setDomain] = useState("general");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [apiStatus, setApiStatus] = useState("checking");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [supported, setSupported] = useState(true);
  const [autoSpeak, setAutoSpeak] = useState(true);

  // Live transcript lines: [{ source: "...", translated: "...", pending: bool }]
  const [lines, setLines] = useState([]);
  const [interimText, setInterimText] = useState("");

  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const isRecordingRef = useRef(false);
  const sourceLangRef = useRef(sourceLang);
  const targetLangRef = useRef(targetLang);
  const domainRef = useRef(domain);
  const linesEndRef = useRef(null);

  useEffect(() => { sourceLangRef.current = sourceLang; }, [sourceLang]);
  useEffect(() => { targetLangRef.current = targetLang; }, [targetLang]);
  useEffect(() => { domainRef.current = domain; }, [domain]);

  // Auto-scroll
  useEffect(() => {
    if (linesEndRef.current) {
      linesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [lines, interimText]);

  // Health check
  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then((r) => (r.ok ? setApiStatus("online") : setApiStatus("offline")))
      .catch(() => setApiStatus("offline"));
  }, []);

  // Check browser support
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;
  }, []);

  useEffect(() => {
    if (recognitionRef.current) {
      const langMap = { en: "en-US", es: "es-ES" };
      recognitionRef.current.lang = langMap[sourceLang] || "en-US";
    }
  }, [sourceLang]);

  // Inject keyframes
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      @keyframes ping { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(2.2); opacity: 0; } }
      @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
      * { box-sizing: border-box; }
      ::-webkit-scrollbar { width: 6px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: rgba(71,85,132,0.4); border-radius: 3px; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const speakText = useCallback((text, langCode) => {
    if (!autoSpeakRef.current) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const langMap = { en: "en-US", es: "es-ES" };
    utterance.lang = langMap[langCode] || "en-US";
    utterance.rate = 0.95;
    utterance.pitch = 1;
    // Try to find a matching voice
    const voices = window.speechSynthesis.getVoices();
    const match = voices.find((v) => v.lang.startsWith(langCode));
    if (match) utterance.voice = match;
    window.speechSynthesis.speak(utterance);
  }, []);

  const autoSpeakRef = useRef(autoSpeak);
  useEffect(() => { autoSpeakRef.current = autoSpeak; }, [autoSpeak]);

  // Preload voices
  useEffect(() => {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }, []);

  const translateLine = useCallback(async (text, lineIndex) => {
    const direction = `${sourceLangRef.current}_to_${targetLangRef.current}`;
    try {
      const res = await fetch(`${API_BASE}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), direction, domain: domainRef.current }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Error ${res.status}`);
      }
      const data = await res.json();
      const translated = data.translated_text || data.translation || JSON.stringify(data);
      setLines((prev) => prev.map((l, i) => i === lineIndex ? { ...l, translated, pending: false } : l));
      speakText(translated, targetLangRef.current);
    } catch (e) {
      setLines((prev) => prev.map((l, i) => i === lineIndex ? { ...l, translated: `⚠️ ${e.message}`, pending: false } : l));
    }
  }, [speakText]);

  const startRecording = () => {
    if (!recognitionRef.current) return;
    const recognition = recognitionRef.current;
    setLines([]);
    setInterimText("");
    setError("");
    setRecordingTime(0);

    let finalizedCount = 0;

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          const trimmed = t.trim();
          if (trimmed) {
            const idx = finalizedCount;
            finalizedCount++;
            setLines((prev) => [...prev, { source: trimmed, translated: "", pending: true }]);
            translateLine(trimmed, idx);
          }
          setInterimText("");
        } else {
          interim = t;
        }
      }
      if (interim) setInterimText(interim);
    };

    recognition.onerror = (event) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        setError(`Speech error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      if (isRecordingRef.current) {
        try { recognition.start(); } catch (e) {}
      }
    };

    try {
      recognition.start();
      setIsRecording(true);
      isRecordingRef.current = true;
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch (e) {
      setError("Could not start microphone. Check permissions.");
    }
  };

  const stopRecording = () => {
    isRecordingRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.abort();
    }
    setIsRecording(false);
    clearInterval(timerRef.current);
    setInterimText("");
  };

  const clearAll = () => {
    setLines([]); setInterimText(""); setError(""); setRecordingTime(0);
  };

  const copyAll = () => {
    const text = lines.map((l) => `${l.source}\n→ ${l.translated || "..."}`).join("\n\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const swapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
  };

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const statusDot = apiStatus === "online" ? colors.emerald : apiStatus === "offline" ? colors.red : "#facc15";

  if (!supported) {
    return (
      <div style={{ minHeight: "100vh", background: colors.bg, color: "white", display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎙️</div>
          <h2 style={{ fontSize: 20, marginBottom: 8 }}>Browser Not Supported</h2>
          <p style={{ color: colors.textMuted }}>Speech Recognition is not available. Please use Chrome or Edge.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${colors.bg} 0%, #0f172a 50%, #1a1145 100%)`, color: "white", padding: "24px 16px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: colors.indigoBg, border: `1px solid ${colors.indigoBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🌐</div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, background: "linear-gradient(90deg, white, #a5b4fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Live Voice Translator</h1>
              <p style={{ fontSize: 11, color: colors.textMuted, margin: 0 }}>Real-time speech translation</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 20, background: "rgba(30,41,59,0.6)", border: `1px solid ${colors.border}` }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusDot, animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 11, color: colors.textMuted }}>{apiStatus === "online" ? "API Online" : apiStatus === "offline" ? "API Offline" : "Checking..."}</span>
          </div>
        </div>

        {/* Controls row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          {DOMAINS.map((d) => (
            <button key={d.id} onClick={() => setDomain(d.id)} style={{
              ...baseBtn, padding: "7px 14px", borderRadius: 10, fontSize: 13, fontWeight: 500,
              background: domain === d.id ? colors.indigoBg : "rgba(30,41,59,0.4)",
              border: `1px solid ${domain === d.id ? colors.indigoBorder : "rgba(51,65,85,0.3)"}`,
              color: domain === d.id ? colors.indigo : colors.textMuted,
            }}>
              {d.icon} {d.label}
            </button>
          ))}

          <div style={{ width: 1, height: 24, background: colors.border, margin: "0 4px" }} />

          <select value={sourceLang} onChange={(e) => setSourceLang(e.target.value)} style={{
            background: "rgba(30,41,59,0.6)", border: `1px solid ${colors.border}`, borderRadius: 10,
            padding: "7px 14px", fontSize: 13, color: colors.text, appearance: "none", cursor: "pointer", outline: "none", textAlign: "center",
          }}>
            {LANGUAGES.map((l) => <option key={l.code} value={l.code} style={{ background: "#1e293b" }}>{l.label}</option>)}
          </select>

          <button onClick={swapLanguages} disabled={isRecording} style={{
            ...baseBtn, padding: "6px 10px", borderRadius: 10, background: colors.indigoBg,
            border: `1px solid ${colors.indigoBorder}`, color: colors.indigo, fontSize: 16,
            opacity: isRecording ? 0.4 : 1,
          }}>⇄</button>

          <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)} style={{
            background: "rgba(30,41,59,0.6)", border: `1px solid ${colors.border}`, borderRadius: 10,
            padding: "7px 14px", fontSize: 13, color: colors.text, appearance: "none", cursor: "pointer", outline: "none", textAlign: "center",
          }}>
            {LANGUAGES.map((l) => <option key={l.code} value={l.code} style={{ background: "#1e293b" }}>{l.label}</option>)}
          </select>
        </div>

        {/* Mic + status */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 24 }}>
          <button onClick={isRecording ? stopRecording : startRecording} style={{
            ...baseBtn, position: "relative", width: 64, height: 64, borderRadius: "50%",
            background: isRecording ? colors.redBg : "#6366f1",
            boxShadow: isRecording ? "0 0 40px rgba(239,68,68,0.4)" : "0 0 30px rgba(99,102,241,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, color: "white",
          }}>
            {isRecording && (
              <div style={{
                position: "absolute", inset: -6, borderRadius: "50%",
                border: "2px solid rgba(239,68,68,0.4)",
                animation: "ping 1.5s cubic-bezier(0,0,0.2,1) infinite",
              }} />
            )}
            {isRecording ? "⏹" : "🎙️"}
          </button>

          {isRecording ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: colors.red, animation: "pulse 1s infinite" }} />
              <span style={{ fontSize: 16, color: "#fca5a5", fontFamily: "monospace", fontWeight: 600 }}>{formatTime(recordingTime)}</span>
              <span style={{ fontSize: 12, color: colors.textDim }}>• Live translating</span>
            </div>
          ) : (
            <span style={{ fontSize: 13, color: colors.textDim }}>
              {lines.length > 0 ? `${lines.length} segment${lines.length > 1 ? "s" : ""} translated` : "Tap mic to start"}
            </span>
          )}

          {/* Auto-speak toggle */}
          <button onClick={() => setAutoSpeak(!autoSpeak)} style={{
            ...baseBtn, padding: "6px 12px", borderRadius: 8,
            background: autoSpeak ? "rgba(16,185,129,0.15)" : "rgba(30,41,59,0.6)",
            border: `1px solid ${autoSpeak ? "rgba(16,185,129,0.35)" : colors.border}`,
            color: autoSpeak ? colors.emerald : colors.textMuted, fontSize: 12,
          }}>
            {autoSpeak ? "🔊 Auto-speak ON" : "🔇 Auto-speak OFF"}
          </button>

          {lines.length > 0 && !isRecording && (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={copyAll} style={{ ...baseBtn, padding: "6px 12px", borderRadius: 8, background: "rgba(30,41,59,0.6)", border: `1px solid ${colors.border}`, color: colors.textMuted, fontSize: 12 }}>
                {copied ? "✅ Copied" : "📋 Copy all"}
              </button>
              <button onClick={clearAll} style={{ ...baseBtn, padding: "6px 12px", borderRadius: 8, background: "rgba(30,41,59,0.6)", border: `1px solid ${colors.border}`, color: colors.textMuted, fontSize: 12 }}>
                🗑️ Clear
              </button>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, padding: "10px 16px", marginBottom: 16, textAlign: "center" }}>
            <span style={{ color: colors.red, fontSize: 13 }}>{error}</span>
          </div>
        )}

        {/* Live translation feed */}
        <div style={{
          background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: 16,
          padding: 20, minHeight: 300, maxHeight: 500, overflowY: "auto", backdropFilter: "blur(8px)",
        }}>
          {/* Column headers */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 40px 1fr", gap: 12, marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${colors.border}` }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: colors.indigo, textTransform: "uppercase", letterSpacing: 1 }}>
              {LANGUAGES.find((l) => l.code === sourceLang)?.label} — Source
            </span>
            <span />
            <span style={{ fontSize: 11, fontWeight: 600, color: colors.emerald, textTransform: "uppercase", letterSpacing: 1 }}>
              {LANGUAGES.find((l) => l.code === targetLang)?.label} — Translation
            </span>
          </div>

          {/* Lines */}
          {lines.length === 0 && !interimText && (
            <div style={{ textAlign: "center", padding: "60px 0", color: colors.textDim }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎙️</div>
              <p style={{ fontSize: 15, margin: "0 0 4px" }}>Start speaking to see live translations</p>
              <p style={{ fontSize: 12, margin: 0 }}>Each sentence translates as you finish it</p>
            </div>
          )}

          {lines.map((line, i) => (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "1fr 40px 1fr", gap: 12, marginBottom: 12,
              animation: "fadeIn 0.3s ease", padding: "10px 0",
              borderBottom: i < lines.length - 1 ? `1px solid rgba(71,85,132,0.2)` : "none",
            }}>
              <div style={{ fontSize: 15, lineHeight: 1.6, color: colors.text }}>{line.source}</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: colors.textDim, fontSize: 16 }}>→</div>
              <div style={{ fontSize: 15, lineHeight: 1.6 }}>
                {line.pending ? (
                  <span style={{ color: colors.textDim, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span> Translating...
                  </span>
                ) : (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <span style={{ color: "rgba(167,243,208,0.9)", flex: 1 }}>{line.translated}</span>
                    <button onClick={() => speakText(line.translated, targetLang)} style={{
                      ...baseBtn, padding: "4px 6px", borderRadius: 6, background: "rgba(16,185,129,0.1)",
                      border: `1px solid rgba(16,185,129,0.25)`, color: colors.emerald, fontSize: 14,
                      flexShrink: 0, marginTop: 2,
                    }}>🔊</button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Interim (currently being spoken) */}
          {interimText && (
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 40px 1fr", gap: 12, padding: "10px 0",
              borderTop: lines.length > 0 ? `1px solid rgba(71,85,132,0.2)` : "none",
            }}>
              <div style={{ fontSize: 15, lineHeight: 1.6, color: "rgba(129,140,248,0.5)", fontStyle: "italic" }}>
                {interimText}
                <span style={{ animation: "pulse 1s infinite" }}>|</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: colors.textDim, fontSize: 16 }}>→</div>
              <div style={{ fontSize: 14, color: colors.textDim, fontStyle: "italic", display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ display: "flex", gap: 3 }}>
                  {[0, 150, 300].map((d) => (
                    <div key={d} style={{ width: 4, height: 4, borderRadius: "50%", background: colors.indigo, animation: `bounce 0.8s ${d}ms infinite` }} />
                  ))}
                </div>
                Waiting for sentence...
              </div>
            </div>
          )}

          <div ref={linesEndRef} />
        </div>

        {/* Footer */}
        <p style={{ textAlign: "center", fontSize: 11, color: colors.textDim, margin: "16px 0 0" }}>
          Real-time: each sentence translates instantly • Domain: {DOMAINS.find((d) => d.id === domain)?.label} • {sourceLang} → {targetLang}
        </p>
      </div>
    </div>
  );
}