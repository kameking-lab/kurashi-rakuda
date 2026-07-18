"use client";

import { useState } from "react";
import { SelectField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import {
  calcKodomoIryouhi,
  fmtNum,
  STAGE_LABELS,
  type CareType,
  type ChildStage,
} from "./KodomoIryouhiJyosei.calc";

/*
 * 子ども医療費助成 自治体早見（P2-T13）
 * specs/s-tools/12-kodomo-iryouhi-jyosei.md
 * すべてクライアント内で即時計算（送信なし）。
 *
 * ★重要★ 子ども医療費助成は自治体ごとに異なる地方単独事業。個別の助成額は算出せず、
 *   こども家庭庁の全国調査（令和7年4月1日時点）の統計から傾向のみを示す。
 */
export function KodomoIryouhiJyosei() {
  const [stage, setStage] = useState<ChildStage>(0);
  const [care, setCare] = useState<CareType>("outpatient");

  const r = calcKodomoIryouhi(care, stage);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="お子さんの学齢区分"
          value={String(stage)}
          onChange={(e) => setStage(Number(e.target.value) as ChildStage)}
        >
          {([0, 1, 2, 3, 4] as ChildStage[]).map((s) => (
            <option key={s} value={s}>
              {STAGE_LABELS[s]}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="通院／入院"
          value={care}
          onChange={(e) => setCare(e.target.value as CareType)}
        >
          <option value="outpatient">通院</option>
          <option value="inpatient">入院</option>
        </SelectField>
      </div>

      {r.ok && (
        <>
          <ResultCard
            label={`${r.stageLabel}の${care === "outpatient" ? "通院" : "入院"}を対象にしている自治体（全国）`}
            value={`${fmtNum(r.coveredCount)} / ${fmtNum(r.total)}`}
            unit="自治体"
            note={`全国の約${r.coveredPercent}%の市区町村が、この年齢まで${
              care === "outpatient" ? "通院" : "入院"
            }の医療費助成の対象にしています（令和7年4月1日時点の調査）`}
          />

          <Callout tone="caution">
            <strong>これは全国の傾向であり、あなたのお住まいの自治体の助成内容を示すものではありません。</strong>
            子ども医療費助成は国の制度ではなく、市区町村ごとに対象年齢・所得制限・自己負担が異なる地方単独事業です。実際の対象年齢・助成額・手続きは必ずお住まいの市区町村（子育て支援担当）でご確認ください。
          </Callout>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-card border border-line p-4 text-sm">
              <p className="font-medium">所得制限（{care === "outpatient" ? "通院" : "入院"}・全国）</p>
              <p className="mt-1 text-ink-muted">
                所得制限なし: {fmtNum(r.incomeLimit.none)}自治体 ／ 所得制限あり:{" "}
                {fmtNum(r.incomeLimit.withLimit)}自治体
              </p>
            </div>
            <div className="rounded-card border border-line p-4 text-sm">
              <p className="font-medium">一部自己負担（{care === "outpatient" ? "通院" : "入院"}・全国）</p>
              <p className="mt-1 text-ink-muted">
                自己負担なし: {fmtNum(r.copayment.noCopay)}自治体 ／ 自己負担あり:{" "}
                {fmtNum(r.copayment.withCopay)}自治体
              </p>
            </div>
          </div>

          <Callout>
            最も多いのは「通院・入院とも18歳年度末（高校生年代）まで・所得制限なし」のパターンです。なお、令和6年度から、18歳年度末までのこども分について、医療費助成に伴う国民健康保険の国庫負担の減額調整措置が廃止され、自治体が助成を拡充しやすくなりました。
          </Callout>
        </>
      )}
    </div>
  );
}
