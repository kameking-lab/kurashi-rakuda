"use client";

import { useState } from "react";
import { NumberField, SelectField } from "@/components/ui/Field";
import { Callout } from "@/components/ui/Callout";
import {
  calculateKyouikuKunrenKyufukin,
  DISCLAIMER,
  type CourseType,
  type EmploymentStatus,
  type CategoryStatus,
} from "./KyouikuKunrenKyufukin.calc";

/*
 * 資格・学び直し 費用と給付金（教育訓練給付）チェック（P3-T03）。
 * 雇用保険の被保険者期間・在職/離職の別・受講予定の講座の種類を選ぶと、
 * 教育訓練給付金（一般・特定一般・専門実践）と教育訓練支援給付金、教育訓練休暇給付金の
 * 5区分について、支給要件を満たす見込みかどうかをその場で一覧表示する
 * （送信なし・クライアント内計算）。
 */

const YES_NO_OPTIONS: { value: "true" | "false"; label: string }[] = [
  { value: "false", label: "いいえ" },
  { value: "true", label: "はい" },
];

const EMPLOYMENT_OPTIONS: { value: EmploymentStatus; label: string }[] = [
  { value: "employed", label: "在職中" },
  { value: "leftJob", label: "離職している" },
];

const COURSE_TYPE_OPTIONS: { value: CourseType; label: string }[] = [
  { value: "ippan", label: "一般教育訓練" },
  { value: "tokuteiIppan", label: "特定一般教育訓練" },
  { value: "senmonJissen", label: "専門実践教育訓練" },
  { value: "unsure", label: "わからない" },
];

const STATUS_TONE: Record<CategoryStatus, "info" | "caution"> = {
  target: "info",
  notTarget: "caution",
  notApplicable: "caution",
};

const STATUS_BADGE_CLASS: Record<CategoryStatus, string> = {
  target: "bg-result-bg text-result-ink",
  notTarget: "border border-caution/40 text-ink",
  notApplicable: "border border-line text-ink-muted",
};

export function KyouikuKunrenKyufukin() {
  const [insuredYearsInput, setInsuredYearsInput] = useState("");
  const [isFirstTime, setIsFirstTime] = useState<"true" | "false">("false");
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus | "">("");
  const [monthsSinceLeavingInput, setMonthsSinceLeavingInput] = useState("");
  const [courseType, setCourseType] = useState<CourseType | "">("");
  const [trainingCostInput, setTrainingCostInput] = useState("");

  const insuredYears = insuredYearsInput === "" ? undefined : Number(insuredYearsInput);
  const monthsSinceLeaving = monthsSinceLeavingInput === "" ? undefined : Number(monthsSinceLeavingInput);
  const trainingCost = trainingCostInput === "" ? undefined : Number(trainingCostInput);

  const calc = calculateKyouikuKunrenKyufukin({
    insuredYears,
    isFirstTime: isFirstTime === "true",
    employmentStatus: employmentStatus === "" ? undefined : employmentStatus,
    monthsSinceLeaving,
    courseType: courseType === "" ? undefined : courseType,
    trainingCost,
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="雇用保険の被保険者期間（通算・年）"
          value={insuredYearsInput}
          onChange={(e) => setInsuredYearsInput(e.target.value)}
          min={0}
          step="0.1"
          hint="1年未満は小数で入力できます（例: 1.5）。転職などで途切れている場合は通算した期間の目安で構いません"
        />

        <SelectField
          label="初めて教育訓練給付金を受給しますか"
          value={isFirstTime}
          onChange={(e) => setIsFirstTime(e.target.value as "true" | "false")}
          hint="過去に一度も教育訓練給付金を受けたことがない場合は「はい」（支給要件期間が短くなります）"
        >
          {YES_NO_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="現在の状況"
          value={employmentStatus}
          onChange={(e) => setEmploymentStatus(e.target.value as EmploymentStatus)}
        >
          <option value="">選択してください</option>
          {EMPLOYMENT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </SelectField>

        {employmentStatus === "leftJob" && (
          <NumberField
            label="離職してからの経過期間（月）"
            value={monthsSinceLeavingInput}
            onChange={(e) => setMonthsSinceLeavingInput(e.target.value)}
            min={0}
            hint="離職日の翌日から今日までの月数の目安"
          />
        )}

        <SelectField
          label="受講予定・受講中の講座の種類"
          value={courseType}
          onChange={(e) => setCourseType(e.target.value as CourseType)}
          hint="講座の案内やハローワークの検索システムで種類を確認できます。分からない場合は「わからない」を選んでください"
        >
          <option value="">選択してください</option>
          {COURSE_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </SelectField>

        <NumberField
          label="受講費用の見込み（円・任意）"
          value={trainingCostInput}
          onChange={(e) => setTrainingCostInput(e.target.value)}
          min={0}
          hint="入力すると、一般・特定一般教育訓練の概算給付額を計算します（専門実践は複雑な精算方式のため計算しません）"
        />
      </div>

      {!calc.ok && <Callout>{calc.error}</Callout>}

      {calc.ok && (
        <div className="space-y-3">
          {!calc.result.anyTarget && (
            <Callout tone="caution">
              現在の入力では、5区分のいずれについても支給要件を満たす見込みが確認できませんでした。被保険者期間が伸びる、離職からの経過期間が短いうちに手続きするなど、状況が変わると対象になる場合があります。詳しくはハローワークにご相談ください。
            </Callout>
          )}

          {calc.result.categories.map((cat) => (
            <div key={cat.key} className="rounded-card border border-line p-4 text-sm sm:text-base">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold">{cat.label}</p>
                <span
                  className={`rounded-card px-3 py-1 text-xs font-medium ${STATUS_BADGE_CLASS[cat.status]}`}
                >
                  {cat.statusLabel}
                </span>
              </div>
              <ul className="mt-2 list-inside list-disc space-y-1 text-ink-muted">
                {cat.numbers.map((n) => (
                  <li key={n}>{n}</li>
                ))}
                {cat.estimatedBenefit !== undefined && (
                  <li>概算給付額: {cat.estimatedBenefit.toLocaleString("ja-JP")}円</li>
                )}
              </ul>
              {cat.notes.length > 0 && (
                <div className="mt-2">
                  <Callout tone={STATUS_TONE[cat.status]}>
                    <ul className="list-disc space-y-1 pl-4">
                      {cat.notes.map((n) => (
                        <li key={n}>{n}</li>
                      ))}
                    </ul>
                  </Callout>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Callout tone="caution">{DISCLAIMER}</Callout>
    </div>
  );
}
