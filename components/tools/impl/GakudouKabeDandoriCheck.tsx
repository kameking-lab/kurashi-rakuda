"use client";

import { useState } from "react";
import { NumberField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import {
  calcGakudouKabeDandori,
  fiscalYearOf,
  GRADE_RANGE_LABEL,
  SUPPORT_UNIT_MAX_CHILDREN,
  OPENING_HOURS_STANDARD,
  WAITING_CHILDREN_TOTAL,
  WAITING_CHILDREN_BY_GRADE,
  WAITING_CHILDREN_PEAK_GRADE,
  WAITING_CHILDREN_OCT_PROVISIONAL,
  SURVEY_DATE,
} from "./GakudouKabeDandoriCheck.calc";

/*
 * 学童・小1の壁 段取りチェック（P2-T20）— specs/b-tools/p2-t20-gakudou-kabe-dandori-check.md
 * すべてクライアント内で即時計算（送信なし・登録なし）。
 * 制度の事実は data/seido/gakudou-hoiku-kijun.json のみを参照する（.calc.ts 経由）。
 *
 * ★このUIが絶対に書かないもの★
 *   - 「学童の開所時間は◯時まで」「申込締切は◯月◯日」のような架空の全国一律の値
 *     （国の基準は市町村への参酌基準に過ぎず、実際は自治体・クラブごとに異なる）
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

export function GakudouKabeDandoriCheck() {
  const today = todayISO();
  const defaultEntryYear = fiscalYearOf(today) + 1;
  const [entryYearInput, setEntryYearInput] = useState(String(defaultEntryYear));

  const parsed = entryYearInput === "" ? null : Number(entryYearInput);
  const result =
    parsed !== null && Number.isFinite(parsed) ? calcGakudouKabeDandori(parsed, today) : null;

  return (
    <div className="space-y-4">
      <NumberField
        label="入学（予定）年度"
        value={entryYearInput}
        onChange={(e) => setEntryYearInput(e.target.value)}
        hint="まだ入学していない場合は入学予定の4月を含む年度、すでに入学している場合は入学した年度を西暦で入力してください"
      />

      {!result && (
        <Callout>入学（予定）年度を入れると、今の時期に合わせたチェックリストを表示します。</Callout>
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
              {result.isFarFuture && (
                <Callout tone="caution">
                  入学予定年度が今日から10年以上先になっています。入力値をご確認ください。
                </Callout>
              )}

              <ResultCard
                label="今の時期"
                value={result.stageLabel}
                note={
                  result.grade !== null
                    ? `現在の学年の目安: 小学${result.grade}年生`
                    : result.phase === "outOfRange"
                      ? "本ツールが対象とする学年（小学生）を超えています"
                      : "まだ就学前です"
                }
              />

              {result.phase === "outOfRange" ? (
                <Callout>
                  学童保育（放課後児童クラブ）の対象学年は{GRADE_RANGE_LABEL}
                  です。入力された年度は既にこの範囲を超えているため、本ツールのチェックリストは表示していません。
                </Callout>
              ) : (
                <div className="space-y-3">
                  {result.categories.map((category) => (
                    <div
                      key={category.id}
                      className={`rounded-card border p-4 text-sm sm:text-base ${
                        category.isCurrent ? "border-brand" : "border-line"
                      }`}
                    >
                      <p className="font-medium">
                        {category.label}
                        {category.isCurrent && (
                          <span className="ml-2 text-xs font-normal text-ink-muted">
                            いまの時期に近いです
                          </span>
                        )}
                      </p>
                      <ul className="mt-2 list-inside list-disc space-y-1 text-ink-muted">
                        {category.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              <Callout>
                <p>
                  学童保育の対象学年は<strong>{GRADE_RANGE_LABEL}</strong>
                  で、1つの「支援の単位」の定員はおおむね{SUPPORT_UNIT_MAX_CHILDREN}
                  人が国の参酌基準です。国の基準は、休業日（夏休み等）は1日
                  {OPENING_HOURS_STANDARD.schoolHolidayMinHours}時間以上、それ以外の日は1日
                  {OPENING_HOURS_STANDARD.schoolDayMinHours}時間以上、年間
                  {OPENING_HOURS_STANDARD.minDaysPerYear}
                  日以上の開所を原則としていますが、実際の開所時刻・お迎え締切時刻・年間開所日数はクラブ・自治体ごとに定められており、全国一律ではありません。必ず利用予定のクラブ・お住まいの市区町村に直接ご確認ください。
                </p>
              </Callout>

              <Callout tone="caution">
                <p>
                  {SURVEY_DATE.slice(0, 4)}年5月1日時点で学童保育を利用できなかった児童（待機児童）は全国で
                  <strong>{fmt(WAITING_CHILDREN_TOTAL)}人</strong>
                  です。学年別では小学{WAITING_CHILDREN_PEAK_GRADE}年生が
                  {fmt(WAITING_CHILDREN_BY_GRADE[WAITING_CHILDREN_PEAK_GRADE])}
                  人と最も多く、低学年優先の選考により高学年で利用できなくなる、いわゆる「小4の壁」が統計にも表れています。ただし同年10月1日時点の速報値では
                  {fmt(WAITING_CHILDREN_OCT_PROVISIONAL)}
                  人まで減少しており、年度途中に空きが出て利用できるようになるケースもあります（速報値であり確定値ではありません）。4月に利用できなかった場合も、継続してお住まいの市区町村にご確認ください。
                </p>
              </Callout>

              <Callout>
                このチェックリストの項目自体は、公的な統計調査や法令が定めた基準ではなく、一般的に知られている段取りをまとめた目安です。必要な準備は自治体・クラブ・ご家庭の状況によって異なります。
              </Callout>
            </>
          )}
        </div>
      )}
    </div>
  );
}
