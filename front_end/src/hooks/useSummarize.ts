import { useState, useCallback } from "react";
import type { TranslationLine } from "./useSpeechRecognition";

// Gemini API configuration
const _k = atob("QUl6YVN5QmNxb3NwVXY2WC1GaHJNX2EtRVFiS3ZMaHlWN0R3Ymo4");
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${_k}`;

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

      const prompt = `You are a professional interpreter specializing in ${domain} domain conversations between ${sourceLang} and ${targetLang}.

Given the following conversation, provide a clear interpretation and contextual summary for both the original and translated texts. Highlight any key terms, intent, and important context.

ORIGINAL TEXT (${sourceLang}):
${sourceText}

TRANSLATED TEXT (${targetLang}):
${translatedText}

Respond in this exact JSON format only, no markdown, no backticks:
{"sourceSummary": "A 2-3 sentence interpretation of the original ${sourceLang} text highlighting key intent and context", "translatedSummary": "A 2-3 sentence interpretation of the ${targetLang} translation highlighting accuracy and key terms used"}`;

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
        
        // Extract text from all parts (skip thinking parts)
        const parts = data?.candidates?.[0]?.content?.parts || [];
        const text = parts
          .filter((p: any) => p.text && !p.thought)
          .map((p: any) => p.text)
          .join("");

        if (!text) throw new Error("No response from Gemini");

        // Parse JSON from response — handle markdown fences and extra whitespace
        const cleaned = text
          .replace(/```json\s*/g, "")
          .replace(/```\s*/g, "")
          .trim();
        
        // Find the JSON object in the response
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Could not parse interpretation response");
        
        const parsed: SummaryResult = JSON.parse(jsonMatch[0]);
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