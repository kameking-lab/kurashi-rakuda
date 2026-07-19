"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { askAi, AI_CLIENT_ENABLED } from "@/lib/ai/client";
import { MAX_QUERY_CHARS } from "@/lib/ai/constants";
import type { AskItem } from "@/lib/ai/types";

/**
 * AI 悩み相談フォーム（specs/ai/02 §3・docs/16 §2）。
 * ★送信ボタンの直上に同意文言を常時表示。押した時だけ送信★。プロフィール・個人情報は送らない（質問文のみ）。
 * NEXT_PUBLIC_AI_ENABLED でない間は「準備中」に縮退する。
 */
const CONSENT =
  "入力内容は、AI の応答生成とサイト改善（どんな悩みが多いかの集計）のために送信・保存されます。氏名・住所・電話番号などの個人情報は入力しないでください。";

export function AskConsultForm() {
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [items, setItems] = useState<AskItem[]>([]);
  const [message, setMessage] = useState("");

  if (!AI_CLIENT_ENABLED) {
    return (
      <div className="rounded-card border border-line bg-sand-soft p-5 text-ink-muted">
        AI相談は現在準備中です。上部の検索や
        <Link href="/tools" className="mx-1 underline underline-offset-4">
          ツール一覧
        </Link>
        からお探しください。
      </div>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setState("loading");
    setItems([]);
    setMessage("");
    const res = await askAi({ kind: "consult", text: t });
    setState("done");
    if (!res.ok) {
      setMessage(res.message);
      return;
    }
    if (res.data.code === "match" && res.data.items.length > 0) {
      setItems(res.data.items);
      setMessage(res.data.note ?? "");
    } else if (res.data.code === "refer") {
      setMessage(res.data.note ?? "この内容は、専門の窓口や公的な相談先へのご相談をおすすめします。");
    } else {
      setMessage("ぴったりの道具はまだありません。ご要望として匿名で記録しました。");
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <label htmlFor="ask-text" className="block font-medium">
        どんなことにお困りですか？
      </label>
      <textarea
        id="ask-text"
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, MAX_QUERY_CHARS))}
        rows={4}
        maxLength={MAX_QUERY_CHARS}
        placeholder="例: 育休から時短で復帰予定。手取りがどれくらい減るか知りたい。"
        className="field-control w-full rounded-card border border-line bg-paper px-4 py-3 text-base shadow-sm"
      />
      {/* ★同意文言は送信ボタンの直上に常時表示★ */}
      <p className="rounded-card bg-sand-soft p-3 text-sm text-ink-muted">{CONSENT}</p>
      <button
        type="submit"
        disabled={state === "loading" || !text.trim()}
        className="min-h-12 rounded-full bg-brand px-6 font-bold text-paper disabled:opacity-50"
      >
        {state === "loading" ? "問い合わせ中…" : "AIに相談する（送信されます）"}
      </button>

      {state === "done" && (
        <div role="status" aria-live="polite" className="space-y-2 pt-2">
          {items.length > 0 && (
            <ul className="grid gap-2 sm:grid-cols-2">
              {items.map((it) => (
                <li key={it.url}>
                  <Link href={it.url} className="tool-card block h-full rounded-card border border-line bg-paper p-4">
                    <span className="font-medium">{it.title}</span>
                    {it.reason && <span className="mt-0.5 block text-sm text-ink-muted">{it.reason}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {message && <p className="text-sm text-ink-muted">{message}</p>}
        </div>
      )}
      {/* 常時固定の注意（specs/ai/02 §3） */}
      <p className="pt-1 text-xs text-ink-muted">
        AIの提案は目安です。金額は各ツールで計算してください。医療・法律・緊急の相談は専門の窓口をご利用ください。
      </p>
    </form>
  );
}
