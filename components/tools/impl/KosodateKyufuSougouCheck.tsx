"use client";

import { useState } from "react";
import { SelectField } from "@/components/ui/Field";
import { Callout } from "@/components/ui/Callout";
import {
  LIFE_STAGES,
  matchPrograms,
  relatedToolSlug,
  type LifeStage,
  type MatchInput,
} from "./KosodateKyufuSougouCheck.calc";

/*
 * 子育て世帯の給付金・助成金 総ざらいチェッカー（P2-T02）
 * specs/s-tools/18-kosodate-kyufu-sougou-check.md
 * すべてクライアント内で即時判定（送信なし）。
 *
 * ★金額は計算しない★ 該当しうる制度への「気づき」と問い合わせ先への道案内に徹する。
 */
export function KosodateKyufuSougouCheck() {
  const [lifeStage, setLifeStage] = useState<LifeStage>("出産・育児");
  const [singleParent, setSingleParent] = useState(false);

  const input: MatchInput = { lifeStage, singleParent };
  const r = matchPrograms(input);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="お子さんの時期（一番下のお子さんで選んでください）"
          value={lifeStage}
          onChange={(e) => setLifeStage(e.target.value as LifeStage)}
        >
          {LIFE_STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="ひとり親世帯ですか"
          value={singleParent ? "yes" : "no"}
          onChange={(e) => setSingleParent(e.target.value === "yes")}
        >
          <option value="no">いいえ</option>
          <option value="yes">はい（ひとり親）</option>
        </SelectField>
      </div>

      <Callout>
        <strong>「{r.stage}」の時期に関係しうる制度は{r.matched.length}件です</strong>
        （すべての世帯が対象になりうるもの{r.universalCount}件、所得などの条件により対象になるもの
        {r.conditionalCount}件）。金額や所得制限はここでは扱いません。関係しそうな制度を見つけたら、それぞれの窓口や関連ツールでご確認ください。
      </Callout>

      <div className="space-y-3">
        {r.matched.map((p) => {
          const slug = relatedToolSlug(p.key);
          const emphasized = r.emphasizedKeys.includes(p.key);
          return (
            <div
              key={p.key}
              className={`rounded-card border p-4 text-sm sm:text-base ${
                emphasized ? "border-caution/50" : "border-line"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{p.name}</p>
                <span className="rounded-full border border-line px-2 py-0.5 text-xs text-ink-muted">
                  {p.category}
                </span>
                <span className="rounded-full border border-line px-2 py-0.5 text-xs text-ink-muted">
                  {p.isUniversal ? "全世帯が対象になりうる" : "条件により対象"}
                </span>
                {emphasized && (
                  <span className="rounded-full border border-caution/50 px-2 py-0.5 text-xs">
                    ひとり親世帯は要チェック
                  </span>
                )}
              </div>
              <p className="mt-2 text-ink-muted">{p.targetSummary}</p>
              <p className="mt-2 text-ink-muted">
                所管: {p.authority}
                <br />
                申請先: {p.applicationTo}
              </p>
              {slug && (
                <p className="mt-2">
                  <a
                    href={`/tools/${categoryOf(slug)}/${slug}`}
                    className="underline decoration-line underline-offset-4 hover:text-ink"
                  >
                    このサイトの関連ツールで詳しく調べる
                  </a>
                </p>
              )}
            </div>
          );
        })}
      </div>

      <Callout tone="caution">
        このチェッカーは制度への<strong>気づき</strong>のためのもので、支給の可否や金額を判定するものではありません。制度によっては所得制限・申請期限・お住まいの自治体独自の条件があります。実際に受けられるかどうかと金額は、それぞれの所管・申請先（お住まいの市区町村など）で必ずご確認ください。ここに載っていない自治体独自の給付・助成もあります。
      </Callout>
    </div>
  );
}

/** 関連ツールの slug からカテゴリを引く（内部リンク生成用の簡易対応表） */
function categoryOf(slug: string): string {
  const map: Record<string, string> = {
    "jido-teate": "childcare",
    "sankyu-ikukyu-money": "money",
    "youji-mushouka-checker": "childcare",
    "jidou-fuyou-teate": "money",
    "kodomo-iryouhi-jyosei": "childcare",
  };
  return map[slug] ?? "money";
}
