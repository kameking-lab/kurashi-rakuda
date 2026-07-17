"use client";

import { useEffect, useState } from "react";
import { DateField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import {
  calcNavi,
  validateDate,
  isApplicationFarInFuture,
  isApplicationVeryOld,
  PROCESS_STEPS,
  POST_DECISION_STEPS,
  STAGE_LABELS,
  EXTENSION_TEXT,
  NATIONAL_AVERAGE_DAYS,
  NATIONAL_AVERAGE_LABEL,
  WITHIN_30_DAYS_SHARE,
  LEGAL_PERIOD_DAYS,
  NO_STATE_DEFINITION,
  type NaviResult,
} from "./YoukaigoNinteiDandoriNavi.calc";

/*
 * 要介護認定 申請段取りナビ（P2-T37）— specs/b-tools/p2-t37-youkaigo-nintei-dandori-navi.md
 * すべてクライアント内で即時計算（送信なし・登録なし）。
 * 制度の数値は data/seido/kaigo-nintei-shori-kikan.json（新規）・data/seido/kaigo-hoken.json
 * のみを参照する（YoukaigoNinteiDandoriNavi.calc.ts 経由）。
 *
 * ★このUIが絶対に書かないもの★
 *   - 「◯日で必ず結果が出ます」という断定（法律上の原則は30日だが、全国平均は39.8日）
 *   - 要介護度の「状態像」（法令・告示に根拠がない）
 */

function todayIso(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function fmtJa(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${Number(m[1])}年${Number(m[2])}月${Number(m[3])}日`;
}

export function YoukaigoNinteiDandoriNavi() {
  const [today, setToday] = useState<string | null>(null);
  const [applicationInput, setApplicationInput] = useState("");

  useEffect(() => {
    setToday(todayIso());
  }, []);

  if (!today) {
    // マウント直後（クライアント側の今日の日付を取得するまで）は何も計算しない
    return <Callout>読み込み中です。</Callout>;
  }

  const validation = applicationInput ? validateDate(applicationInput) : null;

  return (
    <div className="space-y-5">
      <DateField
        label="申請日（申請済みの場合）または申請予定日"
        value={applicationInput}
        hint="まだ申請していない場合は、申請しようと考えている日で構いません"
        onChange={(e) => setApplicationInput(e.target.value)}
      />

      {!applicationInput && (
        <Callout>申請日（または申請予定日）を入れると、段取りの目安をその場で計算します。</Callout>
      )}

      {applicationInput && validation && !validation.ok && (
        <Callout tone="caution">{validation.error}</Callout>
      )}

      {applicationInput && validation?.ok && (
        <NaviResultView applicationDate={applicationInput} today={today} />
      )}
    </div>
  );
}

function NaviResultView({ applicationDate, today }: { applicationDate: string; today: string }) {
  const r: NaviResult = calcNavi({ applicationDate, today });

  const farFuture = isApplicationFarInFuture(applicationDate, today);
  const veryOld = isApplicationVeryOld(applicationDate, today);

  if (r.expired) {
    return (
      <Callout tone="caution">
        制度データを更新中のため、この結果は一時的に表示できません。しばらくしてから再度お試しください。
      </Callout>
    );
  }

  return (
    <div className="space-y-4">
      {farFuture && (
        <Callout tone="caution">
          申請予定日が今日から1年以上先になっています。入力値をご確認ください。
        </Callout>
      )}
      {veryOld && (
        <Callout tone="caution">
          申請日が今日から2年以上前になっています。入力値をご確認ください（要介護認定の有効期間は通常これより短いため、既に更新の時期を迎えている可能性があります）。
        </Callout>
      )}

      {!r.applied && (
        <ResultCard
          label="申請予定日まで"
          value={`${r.daysUntilApplication}`}
          unit="日"
          note={`${fmtJa(applicationDate)}に申請する場合、原則の期限（結果通知）は${fmtJa(
            r.legalDeadlineDate,
          )}ごろの見込みです。`}
        />
      )}

      {r.applied && (
        <ResultCard
          label="申請からの経過日数と、今の段階の目安"
          value={`${r.daysElapsedSinceApplication}`}
          unit="日経過"
          note={STAGE_LABELS[r.estimatedStage]}
        />
      )}

      <div className="rounded-card border border-line p-4 text-sm sm:text-base">
        <p className="font-medium">
          原則の期限：申請日から<strong>{LEGAL_PERIOD_DAYS}日以内</strong>（{fmtJa(r.legalDeadlineDate)}
          ごろ）
        </p>
        <p className="mt-2 text-ink-muted">
          介護保険法第27条第11項により、要介護認定の結果は原則として申請のあった日から30日以内に通知されます。ただし、認定調査や主治医意見書の準備に時間がかかる等の特別な理由があるときは、市区町村が「あとどれくらいかかりそうか（処理見込期間）」と理由を書面で通知したうえで延期することが法律で認められています。
        </p>
        {r.isPastLegalDeadline && (
          <p className="mt-2 font-medium">
            入力された申請日から{LEGAL_PERIOD_DAYS}日を過ぎています。延期の通知（見込期間・理由の書面）が届いていないか確認し、心当たりがなければお住まいの市区町村の介護保険担当窓口にお問い合わせください。
          </p>
        )}
      </div>

      <Callout tone="caution">
        <p>
          <strong>「30日以内」は原則であり、保証ではありません。</strong>
          {NATIONAL_AVERAGE_LABEL}は<strong>{NATIONAL_AVERAGE_DAYS}日</strong>
          で、申請から30日以内に認定された割合は平均{WITHIN_30_DAYS_SHARE}%にとどまります（厚生労働省調べ、令和5年度実績）。原則の30日を超えることは珍しくありません。
        </p>
      </Callout>

      <div className="rounded-card border border-line p-4 text-sm sm:text-base">
        <h2 className="text-base font-bold">目安のタイムライン（参考）</h2>
        <p className="mt-1 text-ink-muted">
          30日以内で認定できている一部の市区町村（全体の約4%）の実績をもとに厚生労働省が示した目安（令和7年2月時点の案）です。すべての市区町村に当てはまるわけではありません。
        </p>
        <ul className="mt-3 space-y-2">
          <li>
            <strong>認定調査の実施</strong>：申請から目安 {r.timeline.ninteiChosaByDay} 日ごろまで（
            {fmtJa(r.timeline.ninteiChosaDate)}ごろ）
          </li>
          <li>
            <strong>主治医意見書の入手</strong>：申請から目安 {r.timeline.shujiiIkenshoByDay} 日ごろまで（
            {fmtJa(r.timeline.shujiiIkenshoDate)}ごろ）
          </li>
          <li>
            <strong>介護認定審査会での審査判定</strong>：認定調査・主治医意見書が揃ってから目安
            {" "}
            {r.timeline.shinsakaiByDay - r.timeline.bothReadyByDay} 日以内（申請から通算 {r.timeline.shinsakaiByDay}
            {" "}
            日ごろ、{fmtJa(r.timeline.shinsakaiDate)}ごろ）
          </li>
        </ul>
        <p className="mt-2 text-ink-muted">
          認定調査と主治医意見書は、多くの場合ほぼ同時に依頼され並行して進みます。どちらか一方が遅れると、審査判定もその分だけ後ろにずれます。
        </p>
      </div>

      <div className="rounded-card border border-line p-4 text-sm sm:text-base">
        <h2 className="text-base font-bold">手続の流れ</h2>
        <ol className="mt-2 space-y-3">
          {PROCESS_STEPS.map((step, i) => (
            <li key={step.key} className="flex gap-3">
              <span className="shrink-0 font-bold text-ink-muted">{i + 1}.</span>
              <div>
                <p className="font-medium">{step.label}</p>
                <p className="text-ink-muted">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-ink-muted">
          申請には、申請書に被保険者証を添付する必要があります（介護保険法第27条第1項）。65歳以上の方は交付されている介護保険の被保険者証、40〜64歳の方（特定疾病に該当する場合が対象）は医療保険の被保険者証を求められることが一般的です。持ち物の詳細はお住まいの市区町村の窓口にご確認ください。
        </p>
      </div>

      <div className="rounded-card border border-line p-4 text-sm sm:text-base">
        <h2 className="text-base font-bold">認定が出たあと</h2>
        <ol className="mt-2 space-y-3">
          {POST_DECISION_STEPS.map((step, i) => (
            <li key={step.key} className="flex gap-3">
              <span className="shrink-0 font-bold text-ink-muted">{PROCESS_STEPS.length + i + 1}.</span>
              <div>
                <p className="font-medium">{step.label}</p>
                <p className="text-ink-muted">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <Callout>
        <p>
          認定される要介護度は「介護の必要性を量るものさし（要介護認定等基準時間）」で決まり、{NO_STATE_DEFINITION}
          。認定後の自己負担額の目安は、介護保険 自己負担シミュレーターでも確認できます。
        </p>
      </Callout>

      <Callout>
        <p>
          {EXTENSION_TEXT.includes("処理見込期間") &&
            "延期される場合は、市区町村から「処理見込期間（あとどれくらいかかるか）」と理由が書面で通知されます。"}
          この通知が届くこと自体は制度上想定された正規の手続であり、必ずしも異常事態ではありません。ご不安な場合は、お住まいの市区町村の介護保険担当窓口にお問い合わせください。
        </p>
      </Callout>
    </div>
  );
}
