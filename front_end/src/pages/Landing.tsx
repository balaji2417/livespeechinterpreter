import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Mic,
  Globe,
  Zap,
  Shield,
  ArrowRight,
  Stethoscope,
  Scale,
  MessageSquare,
  Volume2,
  Languages,
  Brain,
  Layers,
  ChevronRight,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import StarfieldBackground from "@/components/StarfieldBackground";
import vistaLogo from "@/assets/vista-logo.png";
import vistaLogoDark from "@/assets/vista-logo-dark.png";

const Landing = () => {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      {/* Animated starfield */}
      <StarfieldBackground />

      {/* ─── Navbar ─── */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-card/60 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2.5">
            <img
              src={isDark ? vistaLogoDark : vistaLogo}
              alt="VISTA"
              className="w-8 h-8"
            />
            <span className="text-base font-bold tracking-tight">VISTA</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#domains" className="hover:text-foreground transition-colors">Domains</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
            <a href="#architecture" className="hover:text-foreground transition-colors">Architecture</a>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={() => navigate("/translate")}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
            >
              Launch App
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden z-10">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-primary/3 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center px-6 pt-24 pb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted/50 text-xs text-muted-foreground mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Real-time voice translation is live
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight mb-6">
            Break Language Barriers{" "}
            <span className="text-primary">Instantly</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            VISTA listens, transcribes, and translates your speech in real-time
            with domain-aware precision for medical, legal, and general
            conversations.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate("/translate")}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Mic className="w-5 h-5" />
              Start Translating
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#how-it-works"
              className="flex items-center gap-2 px-6 py-3 rounded-xl border border-border text-foreground font-medium hover:bg-muted transition-colors"
            >
              See How It Works
            </a>
          </div>

          {/* Stats bar */}
          <div className="flex items-center justify-center gap-8 md:gap-12 mt-16 pt-8 border-t border-border/50">
            {[
              { label: "Languages", value: "EN ↔ ES" },
              { label: "Domains", value: "3" },
              { label: "Latency", value: "<2s" },
              { label: "TTS Output", value: "Auto" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-lg md:text-2xl font-bold text-foreground">
                  {stat.value}
                </div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wider mt-0.5">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="py-20 px-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
              Powerful Features
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Real-Time Voice Translation
            </h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              Speak naturally and watch your words transform into another
              language — transcribed, translated, and spoken back instantly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: Mic,
                title: "Live Speech Capture",
                desc: "Browser-native speech recognition captures your voice with continuous listening and interim results.",
              },
              {
                icon: Languages,
                title: "Neural Translation",
                desc: "Domain-aware NMT pipeline translates each sentence as you finish speaking it.",
              },
              {
                icon: Volume2,
                title: "Auto Text-to-Speech",
                desc: "Translated text is automatically spoken aloud in the target language using browser TTS.",
              },
              {
                icon: Globe,
                title: "Side-by-Side View",
                desc: "Numbered, synced panels show source and translation line-by-line with hover highlighting.",
              },
              {
                icon: Zap,
                title: "Sub-2s Latency",
                desc: "Cloud Run API processes translations in under 2 seconds for a seamless conversation flow.",
              },
              {
                icon: Shield,
                title: "Privacy First",
                desc: "All speech processing happens in your browser. Only text is sent to the translation API.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group p-6 rounded-xl border border-border/60 bg-card hover:border-primary/30 hover:shadow-[0_0_20px_-5px_hsl(var(--primary)/0.1)] transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Domains ─── */}
      <section id="domains" className="py-20 px-6 bg-muted/30 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
              Domain-Aware
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Specialized Translation Modes
            </h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              VISTA doesn't just translate words — it understands context.
              Choose a domain for terminology-accurate results.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: MessageSquare,
                title: "General",
                desc: "Everyday conversations, casual dialogue, and common phrases translated naturally and fluently.",
                example: '"How are you?" → "¿Cómo estás?"',
                color: "text-blue-500",
                bg: "bg-blue-500/10",
              },
              {
                icon: Stethoscope,
                title: "Medical",
                desc: "Clinical terminology, patient communication, and healthcare vocabulary with precise accuracy.",
                example: '"The patient requires surgery" → "El paciente requiere cirugía"',
                color: "text-emerald-500",
                bg: "bg-emerald-500/10",
              },
              {
                icon: Scale,
                title: "Legal",
                desc: "Legal terminology, contracts, court proceedings, and formal documentation language.",
                example: '"The contract must be signed" → "El contrato debe ser firmado"',
                color: "text-amber-500",
                bg: "bg-amber-500/10",
              },
            ].map((d) => (
              <div
                key={d.title}
                className="p-6 rounded-xl border border-border/60 bg-card hover:border-primary/20 transition-all"
              >
                <div
                  className={`w-12 h-12 rounded-xl ${d.bg} flex items-center justify-center mb-5`}
                >
                  <d.icon className={`w-6 h-6 ${d.color}`} />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {d.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {d.desc}
                </p>
                <div className="px-3 py-2 rounded-lg bg-muted/50 border border-border/40">
                  <p className="text-xs font-mono text-muted-foreground">
                    {d.example}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="py-20 px-6 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
              How It Works
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Three Steps to Real-Time Translation
            </h2>
          </div>

          <div className="space-y-0">
            {[
              {
                step: "01",
                title: "Speak",
                desc: "Click the microphone and start talking. VISTA captures your speech in real-time using the Web Speech API with continuous listening.",
                icon: Mic,
              },
              {
                step: "02",
                title: "Translate",
                desc: "Each completed sentence is instantly sent to our Cloud Run translation API. Domain-aware NMT models produce accurate, contextual translations.",
                icon: Brain,
              },
              {
                step: "03",
                title: "Listen",
                desc: "Translated text appears side-by-side and is automatically spoken aloud in the target language via browser text-to-speech.",
                icon: Volume2,
              },
            ].map((s, i) => (
              <div key={s.step} className="flex gap-6 items-start">
                {/* Timeline */}
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center shrink-0">
                    <s.icon className="w-5 h-5 text-primary" />
                  </div>
                  {i < 2 && (
                    <div className="w-px h-16 bg-border mt-2" />
                  )}
                </div>
                {/* Content */}
                <div className="pb-10">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono font-bold text-primary uppercase tracking-widest">
                      Step {s.step}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {s.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">
                    {s.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Architecture ─── */}
      <section id="architecture" className="py-20 px-6 bg-muted/30 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
              Under The Hood
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Built for Speed & Accuracy
            </h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              A modern pipeline combining browser APIs with cloud-hosted neural
              translation models.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              {
                icon: Mic,
                title: "ASR — Automatic Speech Recognition",
                desc: "Web Speech API with continuous mode, interim results, and automatic language detection based on source selection.",
              },
              {
                icon: Brain,
                title: "NMT — Neural Machine Translation",
                desc: "Domain-aware translation models (General, Medical, Legal) deployed on Google Cloud Run with auto-scaling.",
              },
              {
                icon: Volume2,
                title: "TTS — Text-to-Speech Synthesis",
                desc: "Browser-native SpeechSynthesis API with automatic voice matching for the target language.",
              },
              {
                icon: Layers,
                title: "Pipeline Orchestration",
                desc: "Real-time streaming pipeline: ASR → NMT → TTS with per-sentence processing and parallel execution.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex gap-4 p-5 rounded-xl border border-border/60 bg-card"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm mb-1">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-20 px-6 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Ready to Break the Language Barrier?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Start translating in real-time. No sign-up required — just click and
            speak.
          </p>
          <button
            onClick={() => navigate("/translate")}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-medium text-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Mic className="w-5 h-5" />
            Launch VISTA
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border/50 py-8 px-6 relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img
              src={isDark ? vistaLogoDark : vistaLogo}
              alt="VISTA"
              className="w-6 h-6"
            />
            <span className="text-sm font-semibold">VISTA</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#domains" className="hover:text-foreground transition-colors">Domains</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
            <a href="#architecture" className="hover:text-foreground transition-colors">Architecture</a>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2025 VISTA. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;