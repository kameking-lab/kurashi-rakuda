"use client";

import { useMemo, useState } from "react";
import { SelectField } from "@/components/ui/Field";
import { Callout } from "@/components/ui/Callout";
import {
  matchByCategory,
  diagnoseSkinType,
  CATEGORIES,
  CATEGORY_LABELS,
  SKIN_TYPES,
  SKIN_TYPE_LABELS,
  CONCERNS,
  CONCERN_LABELS,
  PRICE_BANDS,
  PRICE_BAND_LABELS,
  type SkinType,
  type Concern,
  type PriceBandFilter,
  type SkinDiagnosisAnswers,
  type CategoryMatch,
} from "./CosmeMatch.calc";

/*
 * 化粧品「実名・超公平」レコメンド（cosme-match、P4-T04）。
 * すべてクライアント内で即時計算（送信なし・登録なし）。肌質は健康関連情報のため
 * localStorageにも保存しない（診断のたびに選び直す。specs/tools/cosme-match.md §4）。
 * ★アフィリエイトリンク・外部誘導は一切持たない（収益導線ゼロ。§0.2）★
 */

const CATEGORY_ORDER = Array.from(new Set(CATEGORIES));

export function CosmeMatch() {
  const [skinMode, setSkinMode] = useState<"select" | "diagnose" | "unset">("unset");
  const [skinType, setSkinType] = useState<SkinType | null>(null);
  const [answers, setAnswers] = useState<SkinDiagnosisAnswers>({
    tightness: "mild",
    tzoneShine: "partial",
    seasonalChange: "small",
    irritation: "rarely",
  });
  const [concerns, setConcerns] = useState<Concern[]>([]);
  const [priceBand, setPriceBand] = useState<PriceBandFilter>("any");

  const diagnosedType = useMemo(() => diagnoseSkinType(answers), [answers]);
  const effectiveSkinType = skinMode === "select" ? skinType : skinMode === "diagnose" ? diagnosedType : null;

  const categoryMatches: CategoryMatch[] = useMemo(
    () => matchByCategory({ skinType: effectiveSkinType, concerns, priceBand }),
    [effectiveSkinType, concerns, priceBand],
  );

  const toggleConcern = (c: Concern) => {
    setConcerns((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  return (
    <div className="space-y-5">
      <Callout tone="caution">
        新しい化粧品は少量から試してください。異常が出たら使用を中止し、皮膚科にご相談ください。
      </Callout>

      <div>
        <h2 className="text-base font-bold">肌質</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSkinMode("unset")}
            className={`rounded-card border px-3 py-1.5 text-sm ${skinMode === "unset" ? "border-ink bg-sand-soft" : "border-line"}`}
          >
            絞り込まない
          </button>
          {SKIN_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setSkinMode("select");
                setSkinType(t);
              }}
              className={`rounded-card border px-3 py-1.5 text-sm ${
                skinMode === "select" && skinType === t ? "border-ink bg-sand-soft" : "border-line"
              }`}
            >
              {SKIN_TYPE_LABELS[t]}肌
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSkinMode("diagnose")}
            className={`rounded-card border px-3 py-1.5 text-sm ${skinMode === "diagnose" ? "border-ink bg-sand-soft" : "border-line"}`}
          >
            わからない（簡易診断）
          </button>
        </div>

        {skinMode === "diagnose" && (
          <div className="mt-3 space-y-3 rounded-card border border-line p-4">
            <p className="text-sm text-ink-muted">
              つっぱり感・テカリ・季節差・刺激への反応という一般的な4項目からの簡易的な目安です。皮膚科の診断ではありません。
            </p>
            <SelectField
              label="洗顔後、肌がつっぱる感じは？"
              value={answers.tightness}
              onChange={(e) => setAnswers((a) => ({ ...a, tightness: e.target.value as SkinDiagnosisAnswers["tightness"] }))}
            >
              <option value="strong">強くつっぱる</option>
              <option value="mild">少しつっぱる</option>
              <option value="none">つっぱらない</option>
            </SelectField>
            <SelectField
              label="日中、Tゾーンのテカリは？"
              value={answers.tzoneShine}
              onChange={(e) => setAnswers((a) => ({ ...a, tzoneShine: e.target.value as SkinDiagnosisAnswers["tzoneShine"] }))}
            >
              <option value="much">よくテカる</option>
              <option value="partial">部分的にテカる</option>
              <option value="none">あまりテカらない</option>
            </SelectField>
            <SelectField
              label="季節による肌の変化は？"
              value={answers.seasonalChange}
              onChange={(e) => setAnswers((a) => ({ ...a, seasonalChange: e.target.value as SkinDiagnosisAnswers["seasonalChange"] }))}
            >
              <option value="large">季節で大きく変わる</option>
              <option value="small">少し変わる</option>
              <option value="none">あまり変わらない</option>
            </SelectField>
            <SelectField
              label="新しい化粧品で肌が荒れることは？"
              value={answers.irritation}
              onChange={(e) => setAnswers((a) => ({ ...a, irritation: e.target.value as SkinDiagnosisAnswers["irritation"] }))}
            >
              <option value="often">よく荒れる</option>
              <option value="sometimes">たまに荒れる</option>
              <option value="rarely">あまり荒れない</option>
            </SelectField>
            <p className="text-sm">
              診断結果の目安: <span className="font-bold">{SKIN_TYPE_LABELS[diagnosedType]}肌</span>
            </p>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-base font-bold">悩み（複数選択可）</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {CONCERNS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => toggleConcern(c)}
              className={`rounded-card border px-3 py-1.5 text-sm ${concerns.includes(c) ? "border-ink bg-sand-soft" : "border-line"}`}
            >
              {CONCERN_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-xs">
        <SelectField
          label="価格帯"
          value={priceBand}
          onChange={(e) => setPriceBand(e.target.value as PriceBandFilter)}
        >
          <option value="any">指定なし</option>
          {PRICE_BANDS.map((b) => (
            <option key={b} value={b}>
              {PRICE_BAND_LABELS[b]}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="space-y-4 border-t border-line pt-4">
        {CATEGORY_ORDER.map((category) => {
          const m = categoryMatches.find((cm) => cm.category === category);
          const results = m?.results ?? [];
          return (
            <div key={category}>
              <h2 className="text-base font-bold">{CATEGORY_LABELS[category]}</h2>
              {results.length === 0 ? (
                <p className="mt-1 text-sm text-ink-muted">
                  今の条件に合う商品はありませんでした。条件を減らすと見つかる場合があります。
                </p>
              ) : (
                <ul className="mt-2 space-y-3">
                  {results.map((r) => (
                    <li key={r.product.id} className="rounded-card border border-line p-4 text-sm sm:text-base">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <p className="font-bold">
                          {r.product.brand} {r.product.name}
                        </p>
                        <p className="tabular-nums text-ink-muted">
                          {r.product.priceYen.toLocaleString("ja-JP")}円（{r.product.volume}）
                        </p>
                      </div>
                      {r.reasons.length > 0 && (
                        <ul className="mt-2 list-disc pl-5 text-ink-muted">
                          {r.reasons.map((reason) => (
                            <li key={reason.key}>{reason.text}</li>
                          ))}
                        </ul>
                      )}
                      <div className="mt-2">
                        <p className="font-medium">向かない人</p>
                        <ul className="list-disc pl-5 text-ink-muted">
                          {r.product.notSuitedFor.map((n) => (
                            <li key={n}>{n}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="mt-2">
                        <p className="font-medium">注意点</p>
                        <ul className="list-disc pl-5 text-ink-muted">
                          {r.product.cautions.map((c) => (
                            <li key={c}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <SelectionRulesNotice />
    </div>
  );
}

function SelectionRulesNotice() {
  return (
    <div className="rounded-card border border-line p-4 text-sm sm:text-base">
      <p className="font-bold">選定基準の完全公開</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-muted">
        <li>結果は「肌質×悩み×価格帯」の条件にすべて合致する商品の機械的な列挙です（合致数や独自スコアによる順位付けはありません）。</li>
        <li>並び順は価格が安い順→五十音順の固定ルールです。編集部イチオシ・PR枠・特別扱いの仕組みはコードにありません。</li>
        <li>商品名はテキストのみで、メーカー公式サイトへのリンクも含め一切のリンクを設置していません（アフィリエイト・広告収益は一切発生しません）。</li>
        <li>成分の肌質適合は data/cosme/ingredient-skin-map.json（公的・業界自主基準の出典付き）から機械的に導出しており、手書きの評価ではありません。</li>
        <li>すべての商品に「向かない人」「注意点」を必ず併記しています（賛美のみの紹介はビルド時のチェックで不可能にしています）。</li>
      </ul>
    </div>
  );
}
