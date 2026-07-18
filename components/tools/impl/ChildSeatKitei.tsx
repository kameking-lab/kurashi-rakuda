"use client";

import { useId, useState } from "react";
import { NumberField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import {
  calcChildSeatKitei,
  AGE_THRESHOLD,
  EXEMPTION_KEYS,
  EXEMPTIONS,
  EXEMPTION_DESCRIPTION,
  PENALTY,
  SAFETY_STANDARD,
  STATISTICS,
  SIX_PLUS_RECOMMENDATION,
  SEATBELT_OBLIGATION_SEPARATE,
  OBLIGATION_LEGAL_NOTE,
  USAGE_NOTES,
  type ExemptionKey,
} from "./ChildSeatKitei.calc";

/*
 * チャイルドシート適合チェック（P3-T01）— specs/b-tools/p3-t01-child-seat-kitei.md
 * すべてクライアント内で即時計算（送信なし・登録なし）。
 * 制度の事実は data/seido/child-seat-kitei.json のみを参照する（.calc.ts 経由）。
 *
 * ★このUIが絶対に書かないもの★
 *   - 反則金の金額（存在しないため。「反則金なし」とだけ書く）
 *   - 身長・体重の具体的な数値によるチェックシート適合可否の判定
 *     （法規上の基準は年齢〈6歳未満〉のみであり、身長・体重は法的な境界ではない）
 *   - 免除事由に該当する場合の「安全」の保証（該当時は必ず安全を保証しない旨を併記する）
 */

function todayISO(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fmt(n: number): string {
  return n.toLocaleString("ja-JP");
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex items-start gap-2 text-sm sm:text-base">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 rounded border-line"
      />
      <span>{label}</span>
    </label>
  );
}

export function ChildSeatKitei() {
  const today = todayISO();
  const [ageInput, setAgeInput] = useState("3");
  const [selectedExemptions, setSelectedExemptions] = useState<ExemptionKey[]>([]);

  const parsed = ageInput === "" ? null : Number(ageInput);
  const result =
    parsed !== null && Number.isFinite(parsed)
      ? calcChildSeatKitei(parsed, selectedExemptions, today)
      : null;

  function toggleExemption(key: ExemptionKey, checked: boolean) {
    setSelectedExemptions((prev) =>
      checked ? [...prev, key] : prev.filter((k) => k !== key),
    );
  }

  return (
    <div className="space-y-4">
      <NumberField
        label="お子さまの年齢（歳）"
        value={ageInput}
        onChange={(e) => setAgeInput(e.target.value)}
        hint={`満年齢を入力してください。道路交通法上の使用義務は「${AGE_THRESHOLD}歳未満」が基準です`}
      />

      {!result && (
        <Callout>年齢を入れると、チャイルドシートの使用義務の有無を表示します。</Callout>
      )}

      {result && !result.ok && <Callout tone="caution">{result.error}</Callout>}

      {result && result.ok && (
        <div className="space-y-4">
          {result.expired && (
            <Callout tone="caution">
              制度データを更新中のため、この結果は一時的に表示できません。しばらくしてから再度お試しください。
            </Callout>
          )}

          {!result.expired && (
            <>
              <ResultCard
                label="使用義務の判定"
                value={result.obligationLabel}
                note={
                  result.obligationStatus === "obligated"
                    ? "義務を負うのは運転者です（保護者ではありません）。祖父母の車に乗せて祖父母が運転する場合、点数は祖父母につきます。"
                    : SIX_PLUS_RECOMMENDATION
                }
              />

              {result.obligationStatus === "notObligated" && (
                <Callout>{SEATBELT_OBLIGATION_SEPARATE}</Callout>
              )}

              {result.exemptionRelevant && (
                <div className="space-y-3">
                  <p className="text-sm font-bold sm:text-base">
                    次のいずれかに当てはまる場合はチェックしてください（任意・複数選択可）
                  </p>
                  <div className="space-y-2 rounded-card border border-line p-4">
                    {EXEMPTION_KEYS.map((key) => (
                      <CheckboxField
                        key={key}
                        label={`${EXEMPTIONS[key].number}: ${EXEMPTIONS[key].label}`}
                        checked={selectedExemptions.includes(key)}
                        onChange={(checked) => toggleExemption(key, checked)}
                      />
                    ))}
                  </div>

                  {result.matchedExemptions.length > 0 ? (
                    <Callout tone="caution">
                      <p className="font-medium">
                        選択した内容は、使用義務が免除される「やむを得ない理由」（施行令が定める
                        {result.matchedExemptions.map((e) => e.number).join("・")}
                        ）に該当する可能性があります。
                      </p>
                      <ul className="mt-2 list-inside list-disc space-y-1">
                        {result.matchedExemptions.map((e) => (
                          <li key={e.key}>{e.value}</li>
                        ))}
                      </ul>
                      <p className="mt-2 font-bold">
                        {EXEMPTION_DESCRIPTION}
                        実際に免除に該当するかどうかは個別の状況によって判断され、取締りの現場では警察官が判断します。免除に該当する場合でも、チャイルドシートを使用しないことがお子さまの安全を保証するわけではありません。
                      </p>
                    </Callout>
                  ) : (
                    <Callout>
                      該当する項目がなければ、通常どおりチャイルドシートの使用義務があります。
                    </Callout>
                  )}
                </div>
              )}

              <div className="rounded-card border border-line p-4 text-sm sm:text-base">
                <p className="font-bold">違反したときの制裁</p>
                <p className="mt-2 text-ink-muted">
                  違反の名称は「{PENALTY.violationName}」、違反点数は{PENALTY.points}
                  点です。{PENALTY.hasFine === false && "反則金は定められておらず、"}
                  {PENALTY.hasCriminalPenalty === false && "刑事罰（懲役・罰金）の規定もありません。"}
                  制裁が違反点数1点のみであることと、事故に遭ったときの被害の大きさとは別問題です。責任を負うのは
                  {PENALTY.liablePerson}
                  です。
                </p>
              </div>

              <div className="rounded-card border border-line p-4 text-sm sm:text-base">
                <p className="font-bold">製品の安全基準（購入・利用時の確認ポイント）</p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-ink-muted">
                  <li>{SAFETY_STANDARD.eMark}</li>
                  <li>{SAFETY_STANDARD.typeApprovalMark}</li>
                  <li>{SAFETY_STANDARD.nonCompliantNotSufficient}</li>
                  <li>{SAFETY_STANDARD.uncertifiedWarning}</li>
                  <li>{SAFETY_STANDARD.isofixAftermarketWarning}</li>
                </ul>
              </div>

              <Callout>
                <p>{USAGE_NOTES.frontSeatWarning}</p>
              </Callout>

              <div className="rounded-card border border-line p-4 text-sm sm:text-base">
                <p className="font-bold">参考情報（令和7年 警察庁・JAF合同調査）</p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-ink-muted">
                  <li>チャイルドシート使用率（6歳未満全体）: {STATISTICS.usageRate}%</li>
                  <li>使用率（1歳未満）: {STATISTICS.usageRateUnder1}%</li>
                  <li>使用率（1〜4歳）: {STATISTICS.usageRate1to4}%</li>
                  <li>使用率（5歳）: {STATISTICS.usageRate5}%（他の年齢層と比べて低い水準です）</li>
                  <li>適切な取付けができていた割合: {STATISTICS.properInstallationRate}%</li>
                  <li>
                    幼児を適切に着座させることができていた割合: {STATISTICS.properSeatingRate}
                    %（使用していても、正しく座らせられていないケースが半数近くあります）
                  </li>
                  <li>チャイルドシート不使用者の致死率: 適正使用者の約{STATISTICS.fatalityRatio}倍</li>
                  <li>
                    自動車同乗中の死傷者に占めるチャイルドシート使用者の割合: {fmt(STATISTICS.usersAmongCasualties)}%
                  </li>
                </ul>
              </div>

              <Callout tone="caution">
                このツールは道路交通法・道路交通法施行令に基づく年齢による使用義務の判定と、公表されている統計・安全基準の紹介を行うものであり、身長・体重を基準にした法的な着脱の判定は行いません（そのような法規上の基準は存在しません）。免除事由への該当可否の最終判断は警察官が行います。{OBLIGATION_LEGAL_NOTE}
              </Callout>
            </>
          )}
        </div>
      )}
    </div>
  );
}
