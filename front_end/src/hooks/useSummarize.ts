import { useState, useCallback } from "react";
import type { TranslationLine } from "./useSpeechRecognition";

// ⚠️ Replace with your actual Gemini API key
const GEMINI_API_KEY = "AIzaSyDEO8uqgEqRgMvpRwdw4O2tdC2hR3RKqN0";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

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
        setError("No text to summarize yet.");
        return;
      }

      setLoading(true);
      setError("");
      setSummary(null);

      const prompt = `You are a professional summarizer for ${domain} domain conversations.

Given the following conversation that was spoken in ${sourceLang} and translated to ${targetLang}, provide two concise summaries:

ORIGINAL TEXT (${sourceLang}):
${sourceText}

TRANSLATED TEXT (${targetLang}):
${translatedText}

Respond in this exact JSON format only, no markdown, no backticks:
{"sourceSummary": "A 2-3 sentence summary of the original ${sourceLang} text", "translatedSummary": "A 2-3 sentence summary of the translated ${targetLang} text"}`;

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
              maxOutputTokens: 500,
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
        const text =
          data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

        // Parse JSON from response
        const cleaned = text
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();
        const parsed: SummaryResult = JSON.parse(cleaned);
        setSummary(parsed);
      } catch (e: any) {
        setError(e.message || "Failed to generate summary");
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