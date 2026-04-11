import { useEffect, useRef } from "react";
import { Mic, Volume2, Copy, Check, Trash2 } from "lucide-react";
import type { TranslationLine } from "@/hooks/useSpeechRecognition";

interface LanguagePanelProps {
  language: string;
  languageCode: string;
  isSource: boolean;
  isActive: boolean;
  lines: TranslationLine[];
  interimText?: string;
  onSpeak?: (text: string) => void;
  onClear?: () => void;
  onCopyAll?: () => void;
  copied?: boolean;
  highlightIndex?: number | null;
  onHover?: (index: number | null) => void;
}

const LanguagePanel = ({
  language,
  languageCode,
  isSource,
  isActive,
  lines,
  interimText = "",
  onSpeak,
  onClear,
  onCopyAll,
  copied = false,
  highlightIndex = null,
  onHover,
}: LanguagePanelProps) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines, interimText]);

  const hasContent = lines.length > 0 || interimText;

  return (
    <div
      className={`flex-1 flex flex-col rounded-xl border transition-all duration-300 ${
        isActive
          ? "border-primary/30 shadow-[0_0_15px_-3px_hsl(var(--primary)/0.15)]"
          : "border-border/60"
      } bg-card`}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/40">
        <span className="text-[10px] font-mono font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded uppercase tracking-wider">
          {languageCode}
        </span>
        <span className="text-sm font-medium text-foreground">{language}</span>

        {isSource && isActive && (
          <div className="ml-auto flex items-center gap-1.5">
            <Mic className="w-3 h-3 text-primary" />
            <span className="text-[11px] text-primary font-medium tracking-wide">
              LIVE
            </span>
          </div>
        )}

        {isSource && hasContent && !isActive && onClear && (
          <button
            onClick={onClear}
            className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <Trash2 className="w-3 h-3" /> Clear
          </button>
        )}

        {!isSource && hasContent && onCopyAll && (
          <button
            onClick={onCopyAll}
            className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-green-500" /> Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" /> Copy
              </>
            )}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[400px] px-4 py-3">
        {!hasContent ? (
          <p className="text-muted-foreground/40 text-sm">
            {isSource
              ? isActive
                ? "Listening…"
                : "Start speaking to see transcription"
              : "Translation will appear here"}
          </p>
        ) : (
          <div className="space-y-0">
            {lines.map((line, i) => {
              const isHighlighted = highlightIndex === i;
              const isPending = !isSource && line.pending;
              const showTranslation = !isSource && !line.pending;

              return (
                <div
                  key={i}
                  className={`flex items-start gap-2.5 py-2.5 border-b border-border/20 last:border-b-0 transition-colors duration-200 animate-fade-in-up ${
                    isHighlighted ? "bg-primary/5 -mx-4 px-4 rounded-lg" : ""
                  }`}
                  onMouseEnter={() => onHover?.(i)}
                  onMouseLeave={() => onHover?.(null)}
                >
                  {/* Line number */}
                  <span
                    className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 transition-colors ${
                      isHighlighted
                        ? "bg-primary text-primary-foreground"
                        : isPending
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i + 1}
                  </span>

                  {/* Text content */}
                  <div className="flex-1 min-w-0">
                    {isSource ? (
                      <p className="text-foreground/90 leading-relaxed text-sm">
                        {line.source}
                      </p>
                    ) : isPending ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="inline-block w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        Translating…
                      </div>
                    ) : (
                      <p className="text-foreground/90 leading-relaxed text-sm">
                        {line.translated}
                      </p>
                    )}
                  </div>

                  {/* Speaker button (target only, when translated) */}
                  {showTranslation && onSpeak && (
                    <button
                      onClick={() => onSpeak(line.translated)}
                      className="shrink-0 mt-0.5 p-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors opacity-60 hover:opacity-100"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}

            {/* Interim text (source only) */}
            {isSource && interimText && (
              <div className="flex items-start gap-2.5 py-2.5">
                <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 bg-primary/20 text-primary animate-pulse">
                  {lines.length + 1}
                </span>
                <p className="text-muted-foreground/60 text-sm italic leading-relaxed flex-1">
                  {interimText}
                  <span className="animate-pulse">|</span>
                </p>
              </div>
            )}

            {/* Waiting placeholder on target side while source has interim */}
            {!isSource && interimText && (
              <div className="flex items-start gap-2.5 py-2.5">
                <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 bg-muted text-muted-foreground/40">
                  {lines.length + 1}
                </span>
                <p className="text-muted-foreground/30 text-sm italic leading-relaxed flex-1">
                  Waiting for sentence…
                </p>
              </div>
            )}

            <div ref={endRef} />
          </div>
        )}
      </div>
    </div>
  );
};

export default LanguagePanel;