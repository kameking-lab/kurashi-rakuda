"use client";

import { useState } from "react";
import { NumberField, SelectField } from "@/components/ui/Field";
import { Callout } from "@/components/ui/Callout";
import { ResultCard } from "@/components/ui/ResultCard";
import {
  calcYouikuhi,
  fmtYen,
  HOUTEI_YOUIKUHI_PER_CHILD,
  type AgeGroup,
  type YouikuhiInput,
} from "./YouikuhiSanteihyou.calc";

/*
 * 養育費 目安（裁判所算定表）（P2-T08）
 * specs/s-tools/15-youikuhi-santeihyou.md
 * すべてクライアント内で即時計算（送信なし）。
 *
 * ★算定表の金額はPDF画像でデータ化できないため、金額は年収から算出しない★
 *   使うべき算定表を特定して公式PDFに案内し、読み取った合計額を子の指数で按分する。
 */
const AGE_OPTIONS: { value: AgeGroup; label: string }[] = [
  { value: "0-14", label: "0〜14歳" },
  { value: "15+", label: "15歳以上" },
];

export function YouikuhiSanteihyou() {
  const [ages, setAges] = useState<AgeGroup[]>(["0-14"]);
  const [tableAmount, setTableAmount] = useState("");

  const setCount = (count: number) => {
    setAges((prev) => {
      const next = [...prev];
      while (next.length < count) next.push("0-14");
      next.length = count;
      return next;
    });
  };
  const setAgeAt = (i: number, v: AgeGroup) =>
    setAges((prev) => prev.map((a, idx) => (idx === i ? v : a)));

  const toNum = (s: string): number | undefined => {
    if (s.trim() === "") return undefined;
    const v = Number(s);
    return Number.isFinite(v) ? v : undefined;
  };

  const input: YouikuhiInput = { ages, tableAmount: toNum(tableAmount) };
  const r = calcYouikuhi(input);

  return (
    <div className="space-y-5">
      <SelectField
        label="子どもの人数"
        hint="この算定表は3人まで対応しています（4人以上の算定表はありません）"
        value={String(ages.length)}
        onChange={(e) => setCount(Number(e.target.value))}
      >
        {[1, 2, 3].map((n) => (
          <option key={n} value={n}>
            {n}人
          </option>
        ))}
      </SelectField>

      <div className="grid gap-4 sm:grid-cols-3">
        {ages.map((age, i) => (
          <SelectField
            key={i}
            label={`第${i + 1}子の年齢区分`}
            value={age}
            onChange={(e) => setAgeAt(i, e.target.value as AgeGroup)}
          >
            {AGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </SelectField>
        ))}
      </div>

      {r.ok && (
        <>
          {r.table && (
            <div className="rounded-card border border-line p-4 text-sm sm:text-base">
              <p className="font-medium">あなたが使う算定表</p>
              <p className="mt-1">{r.table.title}</p>
              <p className="mt-2">
                <a
                  href={r.table.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-line underline-offset-4 hover:text-ink"
                >
                  裁判所の算定表（表{r.table.no}）を開く（PDF）
                </a>
              </p>
              <p className="mt-2 text-ink-muted">
                縦軸で養育費を支払う側（義務者）の年収、横軸で受け取る側（権利者）の年収を探し、交わるところの金額帯が養育費の月額の目安です。給与所得者は源泉徴収票の「支払金額」、自営業者は確定申告書の「課税される所得金額」を年収として使います。児童手当・児童扶養手当は年収に含めません。
              </p>
            </div>
          )}

          <NumberField
            label="算定表から読み取った養育費の合計月額（円・任意）"
            hint="上の表で読み取った金額を入れると、公式の「子の指数」で子ごとに按分します"
            min={0}
            step={1000}
            value={tableAmount}
            onChange={(e) => setTableAmount(e.target.value)}
          />

          {r.allocation && (
            <>
              <ResultCard
                label="読み取った合計額の子ごとの内訳（子の指数による按分）"
                value={fmtYen(r.allocation.total)}
                unit="円/月"
                note="子の指数（0〜14歳=62・15歳以上=85）で按分した各子の金額は下記のとおりです"
              />
              <div className="overflow-x-auto rounded-card border border-line">
                <table className="w-full min-w-[320px] text-left text-sm">
                  <caption className="sr-only">子ごとの養育費の内訳</caption>
                  <thead>
                    <tr className="border-b border-line bg-sand-soft">
                      <th className="p-2 font-medium">子</th>
                      <th className="p-2 font-medium">年齢区分</th>
                      <th className="p-2 font-medium">指数</th>
                      <th className="p-2 font-medium">月額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.allocation.perChild.map((c, i) => (
                      <tr key={i} className="border-b border-line last:border-0">
                        <td className="p-2">第{i + 1}子</td>
                        <td className="p-2">{c.age === "15+" ? "15歳以上" : "0〜14歳"}</td>
                        <td className="p-2 tabular-nums">{c.index}</td>
                        <td className="p-2 tabular-nums font-bold">{fmtYen(c.amount)}円</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <Callout>
            取決めをしていない場合でも、令和の改正法により、1人あたり月{fmtYen(HOUTEI_YOUIKUHI_PER_CHILD)}
            円の<strong>法定養育費</strong>
            （子{r.childrenCount}人なら月{fmtYen(r.houteiTotal)}円）を請求できる仕組みが導入されました（施行日前に離婚した場合等は対象外）。また養育費には先取特権が認められ、1人あたり
            {fmtYen(r.sakidoriPerChild)}円までは債務名義がなくても差押えが可能です。
          </Callout>

          <Callout tone="caution">
            <strong>本ツールは養育費の金額そのものを年収から計算しません。</strong>
            算定表の金額はPDFの表で提供されているため、使うべき表を特定して公式PDFへご案内し、そこから読み取った金額を子ごとに按分するところまでを行います。実際の金額は個別の事情で幅があり、当事者の合意や家庭裁判所の判断で決まります。
          </Callout>
        </>
      )}

      <Callout tone="caution">
        この結果は裁判所の「改定標準算定方式・算定表（令和元年版）」に基づく<strong>目安</strong>
        です。算定表はあくまで簡易迅速に標準額を求めるための参考資料であり、最終的な金額は個別具体的な事情に応じて決められます。取り決めや請求については家庭裁判所・弁護士・お住まいの自治体の相談窓口にご相談ください。
      </Callout>
    </div>
  );
}
