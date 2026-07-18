"use client";

import { useState } from "react";
import { NumberField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import {
  AGE_BOUNDARY,
  calcFuninChiryou,
  fmtYen,
  UPPER_AGE_LIMIT,
  type FuninChiryouInput,
} from "./FuninChiryouHokenTekiyou.calc";

/*
 * 不妊治療 保険適用・回数・費用早見（P2-T11）
 * specs/s-tools/14-funin-chiryou-hoken-tekiyou.md
 * すべてクライアント内で即時計算（送信なし）。
 */
export function FuninChiryouHokenTekiyou() {
  const [currentAge, setCurrentAge] = useState("");
  const [sameAsFirst, setSameAsFirst] = useState(true);
  const [firstAge, setFirstAge] = useState("");
  const [priorTransfers, setPriorTransfers] = useState("0");
  const [totalTenWari, setTotalTenWari] = useState("");

  const toNum = (s: string): number | undefined => {
    if (s.trim() === "") return undefined;
    const v = Number(s);
    return Number.isFinite(v) ? v : undefined;
  };

  const entered = currentAge.trim() !== "";
  const input: FuninChiryouInput = {
    currentAge: toNum(currentAge) ?? 0,
    firstAge: sameAsFirst ? undefined : toNum(firstAge),
    priorTransfers: toNum(priorTransfers) ?? 0,
    totalTenWari: toNum(totalTenWari),
  };
  const r = calcFuninChiryou(input);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="今回の治療開始日の女性の年齢"
          hint="生殖補助医療（体外受精・顕微授精）の年齢は、女性（患者またはパートナー）の年齢で判定します"
          min={0}
          step={1}
          value={currentAge}
          onChange={(e) => setCurrentAge(e.target.value)}
        />
        <NumberField
          label="これまでの保険診療での胚移植の回数"
          hint="今のお子さんについて、これまで保険で受けた胚移植の回数。初めてなら0"
          min={0}
          step={1}
          value={priorTransfers}
          onChange={(e) => setPriorTransfers(e.target.value)}
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={sameAsFirst}
          onChange={(e) => setSameAsFirst(e.target.checked)}
          className="size-4"
        />
        初めて治療を始めたときの年齢も同じ（回数上限は初回開始時の年齢で決まります）
      </label>

      {!sameAsFirst && (
        <NumberField
          label="初めて治療を始めたときの女性の年齢"
          hint="回数上限（40歳未満は6回・40〜43歳未満は3回）はこの年齢で決まります"
          min={0}
          step={1}
          value={firstAge}
          onChange={(e) => setFirstAge(e.target.value)}
        />
      )}

      <NumberField
        label="1回の保険診療の総額（10割・円／任意）"
        hint="窓口負担（3割）を知りたい場合に入力。金額が分かる場合のみでOK"
        min={0}
        step={10000}
        value={totalTenWari}
        onChange={(e) => setTotalTenWari(e.target.value)}
      />

      {r.ok && entered && (
        <>
          {!r.eligibleByAge ? (
            <Callout tone="caution">
              今回の治療開始日の年齢が{UPPER_AGE_LIMIT}
              歳以上のため、生殖補助医療（体外受精・顕微授精）は保険適用の対象外です（治療開始日に女性が43歳未満であることが要件）。一般不妊治療（タイミング法・人工授精）には年齢上限はありません。
            </Callout>
          ) : (
            <ResultCard
              label="保険で受けられる胚移植の残り回数の目安"
              value={String(r.remaining)}
              unit={`回（上限${r.countLimit}回）`}
              note={
                r.canReceiveMore
                  ? "年齢・回数とも保険適用の範囲内です"
                  : "回数の上限に達しています（保険での胚移植は上限まで）"
              }
            />
          )}

          {r.copayment != null && (
            <ResultCard
              label="窓口での自己負担（3割）の目安"
              value={fmtYen(r.copayment)}
              unit="円"
              note={`保険診療の総額（10割）${fmtYen(
                input.totalTenWari ?? 0,
              )}円の3割。さらに高額療養費で上限を超えた分が後から戻る場合があります`}
            />
          )}

          <Callout>
            回数上限は<strong>初めての治療開始日の年齢</strong>で決まり、40歳未満なら通算6回、40歳以上43歳未満なら通算3回です（境界は{AGE_BOUNDARY}
            歳）。回数は<strong>子ども1人ごとにリセット</strong>されます（出産後、次のお子さんの治療で再び使えます）。
          </Callout>

          <Callout>
            費用は治療内容によって大きく変わるため、本ツールでは総額の目安は示していません。保険診療は3割負担で、
            <strong>高額療養費制度</strong>
            も使えます（ひと月の自己負担が所得区分ごとの上限を超えると超過分が戻ります）。第三者の精子・卵子・胚提供や代理懐胎は保険適用外です。先進医療は保険外ですが保険診療と併用できます。
          </Callout>
        </>
      )}

      <Callout tone="caution">
        この結果は令和4年4月からの保険適用ルールに基づく<strong>目安</strong>
        です。実際の適用可否・回数・費用は、治療計画・実施医療機関（施設基準に適合し届出をした保険医療機関）・保険者によって決まります。必ず治療を受ける医療機関にご確認ください。
      </Callout>
    </div>
  );
}
