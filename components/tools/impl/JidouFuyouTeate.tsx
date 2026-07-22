"use client";

import { useState } from "react";
import { NumberField, SelectField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import {
  calcJidouFuyouTeate,
  applicableIncomeYear,
  estimateRecipientIncomeFromSalary,
  fmtYen,
  STATUS_LABEL,
  type JidouFuyouTeateInput,
} from "./JidouFuyouTeate.calc";

/*
 * 児童扶養手当計算（ひとり親）（P2-T03）
 * specs/s-tools/08-jidou-fuyou-teate.md
 * すべてクライアント内で即時計算（送信なし）。
 *
 * 既定は給与年収からの概算。給与以外の所得や諸控除がある場合は対象外とし、
 * 課税証明書の所得金額を直接入力できる正確モードへ誘導する。
 */
export function JidouFuyouTeate() {
  const [inputMode, setInputMode] = useState<"salary" | "income">("salary");
  const [childrenCount, setChildrenCount] = useState("1");
  const [salaryAnnual, setSalaryAnnual] = useState("");
  const [recipientIncome, setRecipientIncome] = useState("");
  const [dependentsCount, setDependentsCount] = useState("1");
  const [dependentsManuallyChanged, setDependentsManuallyChanged] = useState(false);
  const [childSupportAnnual, setChildSupportAnnual] = useState("");
  const [hasObligor, setHasObligor] = useState(false);
  const [obligorIncome, setObligorIncome] = useState("");
  const [receivingPension, setReceivingPension] = useState(false);

  const toNum = (s: string): number | undefined => {
    if (s.trim() === "") return undefined;
    const v = Number(s);
    return Number.isFinite(v) ? v : undefined;
  };

  const incomeYear = applicableIncomeYear(new Date());
  const salaryEstimate = estimateRecipientIncomeFromSalary(toNum(salaryAnnual) ?? 0, incomeYear);
  const calculatedRecipientIncome = inputMode === "salary"
    ? salaryEstimate?.recipientIncome ?? 0
    : toNum(recipientIncome) ?? 0;

  const input: JidouFuyouTeateInput = {
    childrenCount: toNum(childrenCount) ?? 0,
    recipientIncome: calculatedRecipientIncome,
    dependentsCount: toNum(dependentsCount) ?? 0,
    childSupportAnnual: toNum(childSupportAnnual),
    obligorIncome: hasObligor ? toNum(obligorIncome) : undefined,
    receivingPension,
  };

  const incomeEntered = inputMode === "salary" ? salaryAnnual.trim() !== "" : recipientIncome.trim() !== "";
  const r = calcJidouFuyouTeate(input);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 rounded-card border border-line p-1" role="tablist" aria-label="所得の入力方法">
        <button
          type="button"
          role="tab"
          aria-selected={inputMode === "salary"}
          className={`rounded-lg px-3 py-2 text-sm font-medium ${inputMode === "salary" ? "bg-primary text-white" : "text-ink-muted"}`}
          onClick={() => setInputMode("salary")}
        >
          年収から概算（給与のみ）
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={inputMode === "income"}
          className={`rounded-lg px-3 py-2 text-sm font-medium ${inputMode === "income" ? "bg-primary text-white" : "text-ink-muted"}`}
          onClick={() => setInputMode("income")}
        >
          所得金額で入力（正確）
        </button>
      </div>

      {inputMode === "salary" && (
        <Callout>
          <strong>給与だけの方向けの概算です。</strong>
          事業・年金など給与以外の所得がある方や、障害者控除などの諸控除がある方は「所得金額で入力」を選び、課税証明書の金額をご利用ください。
        </Callout>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="対象となる児童の人数"
          hint="18歳到達後最初の3月31日まで（障害児は20歳未満）の児童の数"
          min={1}
          step={1}
          value={childrenCount}
          onChange={(e) => {
            setChildrenCount(e.target.value);
            if (!dependentsManuallyChanged) setDependentsCount(e.target.value);
          }}
        />
        <NumberField
          label="扶養親族の数"
          hint="所得制限限度額表の行を決める人数。多くの場合は対象児童の数と同じです。16歳未満の児童も人数に数えます"
          min={0}
          step={1}
          value={dependentsCount}
          onChange={(e) => {
            setDependentsCount(e.target.value);
            setDependentsManuallyChanged(true);
          }}
        />
        {inputMode === "salary" ? (
          <NumberField
            label="給与収入（年額・額面）"
            hint={`令和${incomeYear === 2024 ? "6" : "7"}年分の所得（令和8年${incomeYear === 2024 ? "4〜10" : "11月以降"}分の手当に適用）で概算します`}
            min={0}
            step={10000}
            value={salaryAnnual}
            onChange={(e) => setSalaryAnnual(e.target.value)}
          />
        ) : (
          <NumberField
            label="受給者本人の所得額（円）"
            hint="課税（所得）証明書に記載の「所得金額」を入力してください"
            min={0}
            step={10000}
            value={recipientIncome}
            onChange={(e) => setRecipientIncome(e.target.value)}
          />
        )}
        <NumberField
          label="受け取っている養育費の年額（円・任意）"
          hint="受け取った養育費の8割が所得に算入されます（未入力なら0円として計算）"
          min={0}
          step={10000}
          value={childSupportAnnual}
          onChange={(e) => setChildSupportAnnual(e.target.value)}
        />
      </div>

      <SelectField
        label="離婚後などに、同居している扶養義務者（親・祖父母・兄弟姉妹等）がいますか"
        hint="同居している扶養義務者の所得が限度額以上だと、本人の所得が低くても全部支給停止になります"
        value={hasObligor ? "yes" : "no"}
        onChange={(e) => setHasObligor(e.target.value === "yes")}
      >
        <option value="no">いない（自分または未成年の子だけで生計）</option>
        <option value="yes">いる（親などと同居している）</option>
      </SelectField>

      {hasObligor && (
        <NumberField
          label="同居している扶養義務者のうち、最も所得が高い方の所得額（円）"
          hint="こちらも年収ではなく所得額です。複数いる場合は最も高い方で判定します"
          min={0}
          step={10000}
          value={obligorIncome}
          onChange={(e) => setObligorIncome(e.target.value)}
        />
      )}

      <SelectField
        label="遺族年金・障害年金・老齢年金などの公的年金を受給していますか"
        hint="受給している場合は年金との併給調整があり、実際の支給額は下の目安と異なります"
        value={receivingPension ? "yes" : "no"}
        onChange={(e) => setReceivingPension(e.target.value === "yes")}
      >
        <option value="no">受給していない</option>
        <option value="yes">受給している</option>
      </SelectField>

      {!r.ok ? (
        incomeEntered && <Callout tone="caution">{r.error}</Callout>
      ) : (
        <>
          {inputMode === "salary" && incomeEntered && salaryEstimate && (
            <div className="rounded-card border border-line p-4 text-sm">
              <p className="font-medium">
                <span className="mr-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs">概算</span>
                児童扶養手当の所得額: {fmtYen(salaryEstimate.recipientIncome)}円
              </p>
              <p className="mt-2 text-ink-muted">
                給与所得 {fmtYen(salaryEstimate.salaryIncome)}円 − 給与所得者の控除 {fmtYen(salaryEstimate.salaryIncomeDeduction)}円 − 社会保険料相当額 {fmtYen(salaryEstimate.standardSocialInsuranceDeduction)}円
              </p>
              <p className="mt-2 text-ink-muted">
                正確な判定は課税証明書の所得金額で。お住まいの市区町村の窓口で確認できます。
              </p>
            </div>
          )}
          {r.status === "obligorStop" && (
            <Callout tone="caution">
              同居している扶養義務者の所得が限度額（{fmtYen(r.limits.dependentObligor)}
              円）以上のため、本人の所得にかかわらず<strong>全部支給停止</strong>
              となる見込みです。世帯を分ける（別居する）などで判定が変わることがあります。詳しくは窓口にご確認ください。
            </Callout>
          )}

          {r.status === "fullStop" && (
            <Callout tone="caution">
              本人の所得額（
              {r.childSupportIncluded > 0
                ? `養育費8割算入後 ${fmtYen(r.effectiveIncome)}円`
                : `${fmtYen(r.effectiveIncome)}円`}
              ）が一部支給の所得制限限度額（{fmtYen(r.limits.partialPayment)}円）以上のため、
              <strong>手当は支給されない</strong>見込みです。
            </Callout>
          )}

          {(r.status === "full" || r.status === "partial") && (
            <ResultCard
              label={`${STATUS_LABEL[r.status]}の月額（児童${input.childrenCount >= 1 ? Math.floor(input.childrenCount) : 1}人）`}
              value={fmtYen(r.totalMonthly)}
              unit="円/月"
              note={`年額の目安 約${fmtYen(r.totalAnnual)}円　／　支給は奇数月（1・3・5・7・9・11月）に2か月分ずつ、1回あたり約${fmtYen(r.perPaymentAmount)}円`}
            />
          )}

          {(r.status === "full" || r.status === "partial") && Math.floor(input.childrenCount) >= 2 && (
            <div className="rounded-card border border-line p-4 text-sm">
              <p className="font-medium">内訳（月額）</p>
              <p className="mt-1 text-ink-muted">
                本体額（1人目）: {fmtYen(r.firstChildAmount)}円 ＋ 加算額（2人目以降1人につき）:{" "}
                {fmtYen(r.additionalChildAmount)}円 × {Math.floor(input.childrenCount) - 1}人
              </p>
            </div>
          )}

          {r.status === "partial" && (
            <Callout>
              所得額が全部支給の限度額（{fmtYen(r.limits.fullPayment)}円）を超えているため一部支給です。所得が高いほど手当は10円きざみで少なくなり、一部支給の限度額（
              {fmtYen(r.limits.partialPayment)}円）に達すると0円になります。
            </Callout>
          )}

          {r.pensionAdjustmentWarning && (r.status === "full" || r.status === "partial") && (
            <Callout tone="caution">
              <strong>公的年金を受給している場合は併給調整があります。</strong>
              年金額が手当額を上回る場合は手当が支給されないなど、上の目安と実際の支給額は異なります。年金と手当の調整方法は年金の種類（障害基礎年金か否か）によって扱いが分かれ、正確な額は本ツールでは算出できません。必ずお住まいの市区町村の窓口にご確認ください。
            </Callout>
          )}

          {r.childSupportIncluded > 0 && (
            <p className="text-sm text-ink-muted">
              養育費 {fmtYen(toNum(childSupportAnnual) ?? 0)}円/年 のうち 8割の {fmtYen(r.childSupportIncluded)}
              円を所得に算入して判定しています（実効所得額 {fmtYen(r.effectiveIncome)}円）。
            </p>
          )}

          {inputMode === "salary" && (
            <details className="rounded-card border border-line p-4 text-sm">
              <summary className="cursor-pointer font-medium">概算と実際の判定が変わる主な理由</summary>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-muted">
                <li>障害者控除・医療費控除などの各種控除</li>
                <li>事業所得・年金所得など給与以外の所得</li>
                <li>受け取った養育費の8割の所得算入</li>
              </ul>
            </details>
          )}
        </>
      )}

      <Callout tone="caution">
        この結果は2026年度（令和8年度）の制度に基づく<strong>目安</strong>
        です。実際の所得額は年収から各種控除を引いた独自の計算で決まり、寡婦控除・障害者控除などの諸控除によっても変わります。また、事実婚の相手がいる場合は支給されません。認定・支給額は必ずお住まいの都道府県・市・福祉事務所設置町村の窓口で確認してください。申請は原則さかのぼれず、請求日の翌月分からの支給です。
      </Callout>
    </div>
  );
}
