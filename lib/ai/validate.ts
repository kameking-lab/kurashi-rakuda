/**
 * モデル出力のサーバー側検証（specs/ai/02 §2・docs/16 §4-3）。
 * 幻覚 URL・外部誘導・悪意ある文言がユーザーに届かないよう、実在 URL 以外と URL/HTML 混入を破棄する。
 */
import { isKnownUrl, titleForUrl } from "./context";
import type { AskItem, AskResponse, RawModelOutput } from "./types";

const URL_OR_HTML = /(https?:\/\/|www\.|<[a-z/])/i;

/** reason/note に URL・HTML が含まれていないか（含まれば破棄＝空にする） */
function cleanText(s: unknown, max: number): string {
  if (typeof s !== "string") return "";
  const t = s.trim();
  if (!t || URL_OR_HTML.test(t)) return "";
  return t.slice(0, max);
}

/**
 * 生モデル出力を安全な AskResponse に正規化する。
 * - items[].url が実在一覧に完全一致しないものは除去（幻覚 URL 遮断）
 * - reason/note に URL・HTML が含まれたら空にする
 * - code は match/none/refer のみ許可（不明は none）
 * - 実在アイテムが1件も残らなければ code を none に落とす
 */
export function validateModelOutput(raw: RawModelOutput | null | undefined): AskResponse {
  const rawItems = Array.isArray(raw?.items) ? raw!.items! : [];
  const seen = new Set<string>();
  const items: AskItem[] = [];
  for (const it of rawItems) {
    const url = typeof it?.url === "string" ? it.url.trim() : "";
    if (!url || !isKnownUrl(url) || seen.has(url)) continue;
    seen.add(url);
    items.push({ url, title: titleForUrl(url) ?? "", reason: cleanText(it?.reason, 30) });
    if (items.length >= 3) break;
  }

  let code: AskResponse["code"] = "none";
  if (raw?.code === "refer") code = "refer";
  else if (raw?.code === "match" && items.length > 0) code = "match";
  else code = "none";

  const note = cleanText(raw?.note, 80);
  return { code, items: code === "match" ? items : [], ...(note ? { note } : {}) };
}
