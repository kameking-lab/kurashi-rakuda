/**
 * Gemini Flash-Lite 呼び出し（specs/ai/02 §1-2）。★fetch を書いてよいのは lib/ai 配下のみ（docs/16 §0）★
 * 構造化出力（responseSchema）で幻覚と注入を抑え、10秒でタイムアウトする。
 */
import { GEMINI_MODEL, MAX_OUTPUT_TOKENS, geminiApiKey } from "./config";
import { systemPrompt, userPrompt } from "./prompt";
import type { AskKind, RawModelOutput } from "./types";

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    code: { type: "string", enum: ["match", "none", "refer"] },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: { url: { type: "string" }, reason: { type: "string" } },
        required: ["url"],
      },
    },
    note: { type: "string" },
  },
  required: ["code"],
} as const;

/** Gemini を1回呼んで生の構造化出力を返す。失敗は例外（呼び出し側で 502 に落とす） */
export async function askGemini(kind: AskKind, text: string): Promise<RawModelOutput> {
  const key = geminiApiKey();
  if (!key) throw new Error("GEMINI_API_KEY 未設定");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt() }] },
          contents: [{ role: "user", parts: [{ text: userPrompt(kind, text) }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
          },
        }),
      },
    );
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) throw new Error("Gemini 応答に本文がありません");
    return JSON.parse(raw) as RawModelOutput;
  } finally {
    clearTimeout(timer);
  }
}
