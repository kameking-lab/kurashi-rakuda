"use client";

import { useMemo, useState } from "react";
import { SelectField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import {
  CHORE_CATEGORY_LABELS,
  CHORE_CATEGORY_ORDER,
  CHORE_ITEMS,
  CHORE_STATUS_LABELS,
  CHORE_STATUSES,
  REFERENCE_STAT,
  calcChoreSummary,
  type ChoreCategoryKey,
  type ChoreItem,
  type ChoreStatus,
  type ChoreStatusMap,
} from "./NamonakiKajiChecker.calc";

/*
 * 名もなき家事 分担チェッカー（P2-T25）。
 * 4カテゴリ・30項目の「名もなき家事」チェックリストを表示し、各項目を
 * 「自分/パートナー/ふたり/やっていない・対象外」のいずれかに選ぶと、
 * その場で分担の内訳を集計して表示する。送信・保存は一切行わない
 * （すべてこのコンポーネントの状態のみで完結し、離脱すると消える）。
 * 計算ロジックは NamonakiKajiChecker.calc.ts に分離してテストしている。
 */

function groupByCategory(items: ChoreItem[]): Record<ChoreCategoryKey, ChoreItem[]> {
  const map: Record<ChoreCategoryKey, ChoreItem[]> = {
    kaji: [],
    kosodate: [],
    kaigo: [],
    sonota: [],
  };
  for (const item of items) map[item.category].push(item);
  return map;
}

export function NamonakiKajiChecker() {
  const [statuses, setStatuses] = useState<ChoreStatusMap>({});

  const summary = useMemo(() => calcChoreSummary(statuses), [statuses]);
  const itemsByCategory = useMemo(() => groupByCategory(CHORE_ITEMS), []);

  function handleChange(itemId: string, value: string) {
    setStatuses((prev) => {
      if (value === "") {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return { ...prev, [itemId]: value as ChoreStatus };
    });
  }

  return (
    <div className="space-y-6">
      <Callout>
        気になる項目だけでもだいじょうぶだよ。「自分」「パートナー」「ふたり」「やっていない・対象外」のどれかを選ぶと、その場で内訳を表示するよ。送信や保存はしていないから、途中でやめても記録には残らないよ。
      </Callout>

      {CHORE_CATEGORY_ORDER.map((key) => {
        const items = itemsByCategory[key];
        if (items.length === 0) return null;
        return (
          <section key={key} className="space-y-3">
            <h3 className="text-base font-semibold sm:text-lg">{CHORE_CATEGORY_LABELS[key]}</h3>
            <div className="space-y-3">
              {items.map((item) => (
                <SelectField
                  key={item.id}
                  label={item.label}
                  value={statuses[item.id] ?? ""}
                  onChange={(e) => handleChange(item.id, e.target.value)}
                >
                  <option value="">選択してください（未回答）</option>
                  {CHORE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {CHORE_STATUS_LABELS[status]}
                    </option>
                  ))}
                </SelectField>
              ))}
            </div>
          </section>
        );
      })}

      <div className="space-y-4">
        <ResultCard
          label={`回答した項目 ${summary.answeredItems} / ${summary.totalItems}件`}
          value={
            summary.selfPartnerBalance
              ? `自分${summary.selfPartnerBalance.selfShare}% ・ パートナー${summary.selfPartnerBalance.partnerShare}%`
              : "—"
          }
          note={
            summary.selfPartnerBalance
              ? "「自分」と「パートナー」の回答だけを比べた比率だよ（「ふたり」「やっていない・対象外」は含めていないよ）"
              : "「自分」または「パートナー」の回答がまだないよ"
          }
        />

        {summary.answeredItems > 0 && (
          <div className="rounded-card border border-line p-4 text-sm sm:text-base">
            <p className="font-medium">回答済み{summary.answeredItems}件の内訳</p>
            <ul className="mt-2 space-y-1 text-ink-muted">
              {CHORE_STATUSES.map((status) => (
                <li key={status}>
                  {CHORE_STATUS_LABELS[status]}: {summary.counts[status]}件（{summary.percentages[status]}%）
                </li>
              ))}
            </ul>
          </div>
        )}

        {summary.byCategory.length > 0 && summary.answeredItems > 0 && (
          <div className="rounded-card border border-line p-4 text-sm sm:text-base">
            <p className="font-medium">カテゴリ別の回答状況</p>
            <ul className="mt-2 space-y-1 text-ink-muted">
              {summary.byCategory.map((c) => (
                <li key={c.category}>
                  {c.label}: {c.answeredItems}/{c.totalItems}件回答（自分{c.counts.self}・パートナー
                  {c.counts.partner}・ふたり{c.counts.both}・やっていない{c.counts.none}）
                </li>
              ))}
            </ul>
          </div>
        )}

        <Callout>
          これは診断ではなくて、気づきのきっかけだよ。数字がどちらかに偏っていても、それだけで「どちらが悪い」ということにはならないよ。名前のついていない家事は見えにくいから、まずは「こんな項目があったんだ」とふたりで眺めてみるところから始めてみてね。
        </Callout>

        <Callout>
          参考情報：{REFERENCE_STAT.sourceOrg}の{REFERENCE_STAT.chousaMeisho}によると、10歳以上人口全体の1日あたりの家事関連時間は男性{REFERENCE_STAT.zenkokuDanseiFun}分・女性{REFERENCE_STAT.zenkokuJoseiFun}分（2021年、週全体平均）だよ。6歳未満の子を持つ夫婦と子の世帯では、夫{REFERENCE_STAT.muma6saiMiman.ottoFun}分・妻{REFERENCE_STAT.muma6saiMiman.tsumaFun}分という結果もあるよ。これはあなたやパートナーの分担を測るものではなく、社会全体の傾向を示す公的統計の紹介だよ。
        </Callout>
      </div>
    </div>
  );
}
