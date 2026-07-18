"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { NumberField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import { todayJst } from "@/lib/tools/seido";
import {
  calcIryouhiKoujo,
  fmtYen,
  ELIGIBLE_ITEMS,
  KOSODATE_BOOLEAN_TOPICS,
  KOSODATE_CONDITIONAL_TOPICS,
  EXCLUDED_ITEMS,
  PER_EXPENSE_LIMIT_RULE_NOTE,
  SHUSSAN_ICHIJIKIN_NOTE,
  SHUSSAN_TEATEKIN_SHOULD_DEDUCT,
  SHUSSAN_TEATEKIN_NOTE,
  KODOMO_IRYOUHI_JYOSEI_UNCERTAIN_NOTE,
  REFUND_NOTE,
  SELF_MEDICATION_IS_EXCLUSIVE_CHOICE,
  SELF_MEDICATION_THRESHOLD,
  SELF_MEDICATION_MAX_DEDUCTION,
  SELF_MEDICATION_REQUIREMENT,
  SELF_MEDICATION_APPLICABLE_PERIOD,
  MAX_DEDUCTION,
  THRESHOLD_FIXED,
  PROCEDURE_FILING_METHOD,
  PROCEDURE_REQUIRED_DOCUMENTS,
  PROCEDURE_RECEIPT_RETENTION_YEARS,
  PROCEDURE_REFUND_FILING_YEARS,
  SCOPE_NOTE,
  type IryouhiKoujoInput,
} from "./IryouhiKoujoKodomo.calc";

/*
 * 子ども関連の医療費控除 対象チェック（P3-T04）
 * — specs/b-tools/p3-t04-iryouhi-koujo-kodomo.md
 *
 * すべてクライアント内で即時計算（送信なし・登録なし）。
 * 制度の数値・文言は data/seido/iryouhi-koujo-kodomo.json のみを参照する
 * （IryouhiKoujoKodomo.calc.ts 経由）。
 *
 * ★このUIが必ず出すもの★
 *   - 医療費控除額はあくまで目安であり、実際の還付額は「控除額×税率」であること
 *   - 出産育児一時金は出産費用からのみ差し引き、余りを他の医療費から差し引かないこと
 *   - セルフメディケーション税制とは選択制（併用不可）であること
 *   - 「対象になりそう／対象外」の判定は一般的な目安であり、個別事情による例外があること
 */

const emptyInput = {
  otherMedicalExpenses: "",
  shussanHiyou: "",
  shussanIchijikin: "",
  otherReimbursement: "",
  totalIncome: "",
  otcExpenses: "",
};

export function IryouhiKoujoKodomo() {
  const [today, setToday] = useState<string | null>(null);
  const [values, setValues] = useState(emptyInput);

  useEffect(() => {
    setToday(todayJst());
  }, []);

  if (!today) {
    return <Callout>読み込み中です。</Callout>;
  }

  const toNum = (s: string): number => {
    if (s.trim() === "") return 0;
    const v = Number(s);
    return Number.isFinite(v) ? v : NaN;
  };

  const anyEntered = Object.values(values).some((v) => v.trim() !== "");

  const input: IryouhiKoujoInput = {
    otherMedicalExpenses: toNum(values.otherMedicalExpenses),
    shussanHiyou: toNum(values.shussanHiyou),
    shussanIchijikin: toNum(values.shussanIchijikin),
    otherReimbursement: toNum(values.otherReimbursement),
    totalIncome: toNum(values.totalIncome),
    otcExpenses: toNum(values.otcExpenses),
  };

  const set = (key: keyof typeof values) => (e: ChangeEvent<HTMLInputElement>) =>
    setValues((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="出産費用以外の医療費 合計（円）"
          hint="通院費・治療費・医薬品代・子どもの歯科治療費など、出産費用を除いた年間合計額"
          min={0}
          step={1000}
          value={values.otherMedicalExpenses}
          onChange={set("otherMedicalExpenses")}
        />
        <NumberField
          label="出産費用 合計（円）"
          hint="妊婦健診の自己負担・分娩費・入院費などの年間合計額。出産していない年は0円でOK"
          min={0}
          step={1000}
          value={values.shussanHiyou}
          onChange={set("shussanHiyou")}
        />
        <NumberField
          label="出産育児一時金・家族出産育児一時金などの受取額（円）"
          hint="出産手当金は含めません（休業補償のため差し引き不要）"
          min={0}
          step={1000}
          value={values.shussanIchijikin}
          onChange={set("shussanIchijikin")}
        />
        <NumberField
          label="出産費用以外への保険金・高額療養費等の補てん額 合計（円）"
          hint="生命保険の入院給付金・健康保険の高額療養費などのうち、出産費用以外の医療費に対して支給された分"
          min={0}
          step={1000}
          value={values.otherReimbursement}
          onChange={set("otherReimbursement")}
        />
        <NumberField
          label="総所得金額等（円）"
          hint="給与のみの世帯は「年収−給与所得控除」に相当する額が目安です。source: 源泉徴収票の給与所得控除後の金額 等"
          min={0}
          step={10000}
          value={values.totalIncome}
          onChange={set("totalIncome")}
        />
        <NumberField
          label="特定一般用医薬品等購入費 合計（円・任意）"
          hint="セルフメディケーション税制の対象となるOTC医薬品の購入費（保険金等で補てんされた分は除く）。使わない場合は空欄でOK"
          min={0}
          step={1000}
          value={values.otcExpenses}
          onChange={set("otcExpenses")}
        />
      </div>

      {!anyEntered && (
        <Callout>
          医療費・補てん額・総所得金額等を入れると、その場で医療費控除額の目安を計算します。
        </Callout>
      )}

      {anyEntered && <IryouhiKoujoResultView input={input} today={today} />}

      <ChecklistSection />
    </div>
  );
}

function IryouhiKoujoResultView({ input, today }: { input: IryouhiKoujoInput; today: string }) {
  const r = calcIryouhiKoujo(input, today);

  if (!r.ok && r.expired) {
    return (
      <Callout tone="caution">
        制度データを更新中のため、この結果は一時的に表示できません。しばらくしてから再度お試しください。
      </Callout>
    );
  }

  if (!r.ok) {
    return <Callout tone="caution">{r.error}</Callout>;
  }

  return (
    <div className="space-y-4">
      <ResultCard
        label="医療費控除額の目安"
        value={fmtYen(r.deductionAmount)}
        unit="円"
        note={
          r.deductionAmount === 0
            ? "この入力では医療費控除額は発生しない見込みです（足切り額以下、または補てん額で相殺されています）"
            : r.isCapped
              ? `上限（${fmtYen(MAX_DEDUCTION)}円）で頭打ちになっています`
              : `支払った医療費 ${fmtYen(r.totalMedicalPaid)}円 − 補てん額 ${fmtYen(
                  r.totalCompensationApplied,
                )}円 − 足切り額 ${fmtYen(r.threshold)}円`
        }
      />

      <div className="rounded-card border border-line p-4 text-sm sm:text-base">
        <p className="font-bold">計算の内訳</p>
        <ul className="mt-2 space-y-1 text-ink-muted">
          <li className="flex items-baseline justify-between gap-2">
            <span>支払った医療費の合計</span>
            <span className="tabular-nums text-ink">{fmtYen(r.totalMedicalPaid)}円</span>
          </li>
          <li className="flex items-baseline justify-between gap-2">
            <span>− 保険金等で補てんされる金額の合計</span>
            <span className="tabular-nums text-ink">{fmtYen(r.totalCompensationApplied)}円</span>
          </li>
          <li className="flex items-baseline justify-between gap-2">
            <span>＝ 差引後の医療費</span>
            <span className="tabular-nums text-ink">{fmtYen(r.netMedicalExpense)}円</span>
          </li>
          <li className="flex items-baseline justify-between gap-2">
            <span>
              − 足切り額（{r.isLowIncomeBracket ? "総所得金額等の5%" : `${fmtYen(THRESHOLD_FIXED)}円（10万円）`}）
            </span>
            <span className="tabular-nums text-ink">{fmtYen(r.threshold)}円</span>
          </li>
          <li className="flex items-baseline justify-between gap-2 font-medium text-ink">
            <span>＝ 医療費控除額（200万円が上限）</span>
            <span className="tabular-nums">{fmtYen(r.deductionAmount)}円</span>
          </li>
        </ul>
      </div>

      {r.shussanIchijikinExcess > 0 && (
        <Callout>
          出産育児一時金等（{fmtYen(input.shussanIchijikin)}円）が出産費用（{fmtYen(input.shussanHiyou)}
          円）を{fmtYen(r.shussanIchijikinExcess)}円上回っています。{PER_EXPENSE_LIMIT_RULE_NOTE}
          そのため、この余った分は出産費用以外の医療費からは差し引いていません。
        </Callout>
      )}

      {r.otherReimbursementExcess > 0 && (
        <Callout>
          出産費用以外への保険金等の補てん額が、対応する医療費を{fmtYen(r.otherReimbursementExcess)}
          円上回っています。同じ個別対応の原則により、この余った分は他の医療費（出産費用を含む）からは差し引いていません。
        </Callout>
      )}

      <Callout tone="caution">{REFUND_NOTE}。所得税を納めていない場合、医療費控除を適用しても所得税の還付は生じません（住民税の軽減効果は生じる場合があります）。</Callout>

      <SelfMedicationSection input={input} r={r} />

      <Callout tone="caution">
        {SCOPE_NOTE}
        （同居は要件ではありません）。共働き世帯では、世帯で最も所得税率が高い人がまとめて申告すると有利になる場合があります。
      </Callout>

      <ProcedureNote />
    </div>
  );
}

function SelfMedicationSection({
  input,
  r,
}: {
  input: IryouhiKoujoInput;
  r: Extract<ReturnType<typeof calcIryouhiKoujo>, { ok: true }>;
}) {
  if (input.otcExpenses <= 0) return null;

  return (
    <div className="rounded-card border border-line p-4 text-sm sm:text-base">
      <p className="font-bold">セルフメディケーション税制との比較</p>
      <p className="mt-1 text-ink-muted">
        {SELF_MEDICATION_IS_EXCLUSIVE_CHOICE
          ? "通常の医療費控除とセルフメディケーション税制は選択制で、両方を併用することはできません。"
          : ""}
        特定一般用医薬品等購入費が{fmtYen(SELF_MEDICATION_THRESHOLD)}円を超える部分（上限
        {fmtYen(SELF_MEDICATION_MAX_DEDUCTION)}円）が控除額になります。
      </p>
      <ul className="mt-2 space-y-1 text-ink-muted">
        <li className="flex items-baseline justify-between gap-2">
          <span>通常の医療費控除額</span>
          <span className="tabular-nums text-ink">{fmtYen(r.deductionAmount)}円</span>
        </li>
        <li className="flex items-baseline justify-between gap-2">
          <span>セルフメディケーション税制の控除額</span>
          <span className="tabular-nums text-ink">{fmtYen(r.selfMedicationDeduction)}円</span>
        </li>
      </ul>
      <p className="mt-2">
        {r.recommendedChoice === "none" && "この入力ではどちらの制度でも控除額は発生しない見込みです。"}
        {r.recommendedChoice === "either" && "どちらを選んでも控除額は同じ見込みです。"}
        {r.recommendedChoice === "normal" && "この入力では通常の医療費控除の方が控除額が大きい見込みです。"}
        {r.recommendedChoice === "selfMedication" &&
          "この入力ではセルフメディケーション税制の方が控除額が大きい見込みです。"}
      </p>
      <p className="mt-2 text-ink-muted">
        セルフメディケーション税制には、申告する本人が健康診査・予防接種など一定の取組を行っていることが要件です（
        {SELF_MEDICATION_REQUIREMENT}）。適用期間は{SELF_MEDICATION_APPLICABLE_PERIOD}
        で、令和9年分（2027年分）以後の取扱いは2026年7月時点で未定です。
      </p>
    </div>
  );
}

function ProcedureNote() {
  return (
    <Callout>
      <p>
        医療費控除は年末調整では受けられず、{PROCEDURE_FILING_METHOD}
        必要があります。{PROCEDURE_REQUIRED_DOCUMENTS}
        （領収書の添付は不要ですが、確定申告期限等から{PROCEDURE_RECEIPT_RETENTION_YEARS}
        年間は保存が必要です）。
      </p>
      <p className="mt-1">
        申告し忘れていた年があっても、還付申告はその年の翌年1月1日から{PROCEDURE_REFUND_FILING_YEARS}
        年間提出できます。出産した年の医療費控除を忘れていた場合も、まだ間に合う可能性があります。
      </p>
    </Callout>
  );
}

function ChecklistSection() {
  return (
    <div className="space-y-4 border-t border-line pt-4">
      <div>
        <h2 className="text-base font-bold">子育て世帯でよくある論点（対象になりそう／対象外）</h2>
        <p className="mt-1 text-sm text-ink-muted">
          国税庁のタックスアンサー・質疑応答事例で確認できたものだけを掲載しています。個々の事情により判断が分かれる場合があります。
        </p>
        <ul className="mt-2 space-y-2">
          {KOSODATE_BOOLEAN_TOPICS.map((t) => (
            <li key={t.key} className="rounded-card border border-line p-3 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="font-medium">{t.label}</span>
                <span
                  className={
                    t.isEligible
                      ? "rounded-full bg-sand-soft px-2 py-0.5 text-xs"
                      : "rounded-full border border-line px-2 py-0.5 text-xs text-ink-muted"
                  }
                >
                  {t.isEligible ? "対象になりそう" : "対象外"}
                </span>
              </div>
              {t.note && <p className="mt-1 text-ink-muted">{t.note}</p>}
            </li>
          ))}
          {KOSODATE_CONDITIONAL_TOPICS.map((t) => (
            <li key={t.key} className="rounded-card border border-line p-3 text-sm">
              <p className="font-medium">{t.label}</p>
              <p className="mt-1 text-ink-muted">{t.condition}</p>
              {t.note && <p className="mt-1 text-ink-muted">{t.note}</p>}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-base font-bold">対象となる医療費の主な類型（子育てに関連度の高いもの）</h2>
        <ul className="mt-2 space-y-2">
          {ELIGIBLE_ITEMS.filter((i) => i.relevance !== "low").map((item) => (
            <li key={item.no} className="rounded-card border border-line p-3 text-sm">
              <p className="font-medium">{item.text}</p>
              {item.exclusion && <p className="mt-1 text-ink-muted">除外: {item.exclusion}</p>}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-base font-bold">対象外となる主なもの</h2>
        <ul className="mt-2 space-y-2">
          {EXCLUDED_ITEMS.map((item) => (
            <li key={item.key} className="rounded-card border border-line p-3 text-sm">
              <p className="font-medium">{item.label}</p>
              {item.note && <p className="mt-1 text-ink-muted">{item.note}</p>}
            </li>
          ))}
        </ul>
      </div>

      <Callout tone="caution">
        {SHUSSAN_ICHIJIKIN_NOTE}
        {SHUSSAN_TEATEKIN_SHOULD_DEDUCT === false && SHUSSAN_TEATEKIN_NOTE && (
          <>
            <br />
            出産手当金は差し引く必要がありません。{SHUSSAN_TEATEKIN_NOTE}
          </>
        )}
      </Callout>

      <Callout tone="caution">
        自治体の子ども医療費助成（乳幼児医療費助成）を受けた場合に差し引く必要があるかどうかは、国税庁の一次情報で確定できませんでした。{" "}
        {KODOMO_IRYOUHI_JYOSEI_UNCERTAIN_NOTE}
        実際の取扱いは所轄の税務署にご確認ください。
      </Callout>
    </div>
  );
}
