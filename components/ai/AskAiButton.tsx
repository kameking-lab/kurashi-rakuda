"use client";

import { useState } from "react";
import Link from "next/link";
import { askAi, AI_CLIENT_ENABLED } from "@/lib/ai/client";
import type { AskItem, AskKind } from "@/lib/ai/types";

/**
 * 「AIに聞く」ボタン（specs/ai/02 §3）。★表示だけでは何も送信しない。押した時だけ送信★
 * 検索補助（1段目ヒットが弱い時）の末尾に出す。プロフィール・個人情報は送らない（質問文のみ）。
 * NEXT_PUBLIC_AI_ENABLED が true でなければ何も描画しない（インフラ未整備時は縮退）。
 */
export function AskAiButton({ kind, query }: { kind: AskKind; query: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [items, setItems] = useState<AskItem[]>([]);
  const [message, setMessage] = useState<string>("");

  if (!AI_CLIENT_ENABLED || !query.trim()) return null;

  const onClick = async () => {
    setState("loading");
    setItems([]);
    setMessage("");
    const res = await askAi({ kind, text: query.trim() });
    setState("done");
    if (!res.ok) {
      setMessage(res.message);
      return;
    }
    if (res.data.code === "match" && res.data.items.length > 0) {
      setItems(res.data.items);
      setMessage(res.data.note ?? "");
    } else if (res.data.code === "refer") {
      setMessage(res.data.note ?? "この内容は専門の窓口へのご相談をおすすめします。");
    } else {
      setMessage("ぴったりの道具はまだありません。ご要望として匿名で記録しました。");
    }
  };

  return (
    <div className="ai-assist mt-3 rounded-card border border-line bg-sand-soft p-4">
      {state === "idle" && (
        <button
          type="button"
          onClick={onClick}
          className="min-h-12 rounded-full bg-brand px-5 font-bold text-paper"
        >
          AIに聞く（入力内容が送信されます）
        </button>
      )}
      {state === "loading" && (
        <p role="status" aria-live="polite" className="text-sm text-ink-muted">
          AIに問い合わせています…
        </p>
      )}
      {state === "done" && (
        <div role="status" aria-live="polite" className="space-y-2">
          {items.length > 0 && (
            <ul className="grid gap-2 sm:grid-cols-2">
              {items.map((it) => (
                <li key={it.url}>
                  <Link
                    href={it.url}
                    className="tool-card block h-full rounded-card border border-line bg-paper p-4"
                  >
                    <span className="font-medium">{it.title}</span>
                    {it.reason && <span className="mt-0.5 block text-sm text-ink-muted">{it.reason}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {message && <p className="text-sm text-ink-muted">{message}</p>}
          <p className="text-xs text-ink-muted">
            AIの提案は目安です。金額や制度の詳細は各ツール・窓口でご確認ください。
          </p>
        </div>
      )}
    </div>
  );
}
