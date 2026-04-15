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

Given the following conversation, provide a clear interpretation for both the original and translated texts.

ORIGINAL TEXT (${sourceLang}):
${sourceText}

TRANSLATED TEXT (${targetLang}):
${translatedText}

Rules:
- Write 2-3 clear sentences for each interpretation
- For source: explain the speaker's intent, tone, and key context
- For translation: evaluate accuracy, note any key terminology choices, and explain how it reads to a native speaker
- Do NOT use JSON format
- Use this exact format:

SOURCE:
[Your interpretation of the original text here]

TRANSLATION:
[Your interpretation of the translated text here]`;

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
        
        // Extract text from all parts
        const parts = data?.candidates?.[0]?.content?.parts || [];
        const text = parts
          .filter((p: any) => p.text)
          .map((p: any) => p.text)
          .join("\n")
          .trim();

        if (!text) throw new Error("No response from Gemini");

        // Parse SOURCE: and TRANSLATION: sections (flexible matching)
        let sourceSummary = "";
        let translatedSummary = "";

        const sourceMatch = text.match(/SOURCE[:\s]*\n+([\s\S]*?)(?=\n*TRANSLATION[:\s]*\n|$)/i);
        const transMatch = text.match(/TRANSLATION[:\s]*\n+([\s\S]*$)/i);

        if (sourceMatch) sourceSummary = sourceMatch[1].trim();
        if (transMatch) translatedSummary = transMatch[1].trim();

        // Fallback: try JSON parsing if the above didn't work
        if (!sourceSummary && !translatedSummary) {
          const jsonMatch = text.match(/\{[\s\S]*?"sourceSummary"[\s\S]*?\}/);
          if (jsonMatch) {
            const cleaned = jsonMatch[0].replace(/```json\s*/g, "").replace(/```\s*/g, "");
            const parsed = JSON.parse(cleaned);
            sourceSummary = parsed.sourceSummary || "";
            translatedSummary = parsed.translatedSummary || "";
          } else {
            sourceSummary = text;
          }
        }

        setSummary({ sourceSummary, translatedSummary });
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