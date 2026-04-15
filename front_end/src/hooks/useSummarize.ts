import { useState, useCallback } from "react";
import type { TranslationLine } from "./useSpeechRecognition";
import { getGeminiKey, GEMINI_URL as BASE_GEMINI_URL } from "@/lib/config";

const GEMINI_URL = `${BASE_GEMINI_URL}?key=${getGeminiKey()}`;

interface SummaryResult {
  sourceSummary: string;
  translatedSummary: string;
}

export function useSummarize() {
  const [summary, setSummary] = useState<SummaryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const summarize = useCallback(
    async (
      lines: TranslationLine[],
      sourceLang: string,
      targetLang: string,
      domain: string
    ) => {
      if (lines.length === 0) return;

      const sourceText = lines.map((l) => l.source).join("\n");
      const translatedText = lines
        .filter((l) => !l.pending)
        .map((l) => l.translated)
        .join("\n");

      if (!sourceText.trim() || !translatedText.trim()) {
        setError("No text to interpret yet.");
        return;
      }

      setLoading(true);
      setError("");
      setSummary(null);

      const sourceLines = sourceText.split("\n");
      const translatedLines = translatedText.split("\n");

      const prompt = `You are a professional interpreter specializing in ${domain} domain conversations between ${sourceLang} and ${targetLang}.

Given the following complete conversation with ${String(sourceLines.length)} segments, provide a comprehensive interpretation written entirely in ${targetLang}.

COMPLETE CONVERSATION (${sourceLang}):
${sourceLines.map((line, i) => `${i + 1}. ${line}`).join("\n")}

TRANSLATIONS (${targetLang}):
${translatedLines.map((line, i) => `${i + 1}. ${line}`).join("\n")}

Rules:
- Write the ENTIRE interpretation in ${targetLang} only
- Cover ALL segments in your interpretation
- Explain the speaker's overall intent, tone, key context, and any important domain-specific terminology
- Write 3-5 clear sentences
- Do NOT use any special formatting, headers, or labels — just plain text in ${targetLang}`;

      try {
        const res = await fetch(GEMINI_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 8192,
            },
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(
            errData?.error?.message || `Gemini API error: ${res.status}`
          );
        }

        const data = await res.json();

        // Extract text from all parts
        const parts = data?.candidates?.[0]?.content?.parts || [];
        const text = parts
          .filter((p: any) => p.text)
          .map((p: any) => p.text)
          .join("\n")
          .trim();

        if (!text) throw new Error("No response from Gemini");

        // Clean up any markdown formatting
        const cleaned = text
          .replace(/```[\s\S]*?```/g, "")
          .replace(/\*\*/g, "")
          .trim();

        setSummary({ sourceSummary: cleaned, translatedSummary: "" });
      } catch (e: any) {
        setError(e.message || "Failed to generate interpretation");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const clearSummary = useCallback(() => {
    setSummary(null);
    setError("");
  }, []);

  return { summary, loading, error, summarize, clearSummary };
}