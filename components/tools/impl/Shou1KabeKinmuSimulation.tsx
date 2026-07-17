"use client";

import { useState } from "react";
import { NumberField, SelectField, TimeField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import {
  calcShou1KabeKinmuSimulation,
  getGradeWaitingStat,
  GRADE_RANGE_LABEL,
  SHOU1_KABE_DISCLAIMER,
  SUPPORT_UNIT_MAX_CHILDREN,
  WAITING_CHILDREN_SURVEY_DATE,
  WAITING_CHILDREN_TOTAL,
  type Grade,
} from "./Shou1KabeKinmuSimulation.calc";

/*
 * 小1の壁 勤務シミュレーション（学童時間×勤務時間）（P2-T36）。
 * すべてクライアント内で即時計算（送信なし・登録なし・オフライン動作）。
 * 計算ロジック（calcShou1KabeKinmuSimulation）は Shou1KabeKinmuSimulation.calc.ts に分離し、
 * vitest（node環境）から直接importしてテストできるようにしている。
 *
 * 学童の開所・閉所時刻は施設・市区町村ごとに異なり全国一律の基準がないため、
 * 架空の値を初期表示せず、ユーザー自身の学童の閉所時刻の入力を必須にしている。
 * 対象学年・待機児童統計は data/seido/gakudou-hoiku-kijun.json 由来の参考情報として、
 * 判定結果とは独立に表示する。
 */

const GRADE_OPTIONS: Grade[] = [1, 2, 3, 4, 5, 6];

function fmtCount(n: number): string {
  return n.toLocaleString("ja-JP");
}

export function Shou1KabeKinmuSimulation() {
  const [gakudouHeishoJikoku, setGakudouHeishoJikoku] = useState("18:00");
  const [gakudouKaraJitakuInput, setGakudouKaraJitakuInput] = useState("10");
  const [taikinJikoku, setTaikinJikoku] = useState("18:30");
  const [shokubaKaraJitakuInput, setShokubaKaraJitakuInput] = useState("40");
  const [bufferInput, setBufferInput] = useState("10");
  const [shukkinJikoku, setShukkinJikoku] = useState("");
  const [grade, setGrade] = useState<"" | Grade>("");

  const gakudouKaraJitakuIdouMin =
    gakudouKaraJitakuInput === "" ? NaN : Number(gakudouKaraJitakuInput);
  const shokubaKaraJitakuIdouMin =
    shokubaKaraJitakuInput === "" ? NaN : Number(shokubaKaraJitakuInput);
  const bufferMin = bufferInput === "" ? NaN : Number(bufferInput);

  const result = calcShou1KabeKinmuSimulation({
    gakudouHeishoJikoku,
    gakudouKaraJitakuIdouMin,
    taikinJikoku,
    shokubaKaraJitakuIdouMin,
    bufferMin,
    shukkinJikoku,
  });

  const waitingStat = getGradeWaitingStat(grade === "" ? null : grade);

  return (
    <div className="space-y-4">
      <TimeField
        label="学童の閉所時刻（お迎え・帰宅の締切時刻）"
        value={gakudouHeishoJikoku}
        onChange={(e) => setGakudouHeishoJikoku(e.target.value)}
        hint="学童の開所・閉所時刻は施設や市区町村によって異なり全国一律の基準はありません。必ずご自身が利用する学童の時刻を入力してください"
      />

      <NumberField
        label="学童から自宅までの移動時間（分）"
        value={gakudouKaraJitakuInput}
        min={0}
        step={1}
        inputMode="numeric"
        onChange={(e) => setGakudouKaraJitakuInput(e.target.value)}
        hint="子どもが一人で（または送迎で）自宅に着くまでの目安時間です"
      />

      <TimeField
        label="退勤時刻（勤務終了時刻）"
        value={taikinJikoku}
        onChange={(e) => setTaikinJikoku(e.target.value)}
        hint="実際に退勤する（予定の）時刻を入力してください"
      />

      <NumberField
        label="職場から自宅までの移動時間（分）"
        value={shokubaKaraJitakuInput}
        min={0}
        step={1}
        inputMode="numeric"
        onChange={(e) => setShokubaKaraJitakuInput(e.target.value)}
        hint="退勤してから自宅に着くまでの通勤時間です"
      />

      <NumberField
        label="退勤後の準備時間・バッファ（分）"
        value={bufferInput}
        min={0}
        step={1}
        inputMode="numeric"
        onChange={(e) => setBufferInput(e.target.value)}
        hint="片付け・退勤打刻・職場を出るまでの余裕時間"
      />

      <TimeField
        label="出勤時刻・勤務開始時刻（任意）"
        value={shukkinJikoku}
        onChange={(e) => setShukkinJikoku(e.target.value)}
        hint="入力すると、子どもを一人にしないための実労働可能時間もあわせて計算します"
      />

      <SelectField
        label="お子さまの学年（任意・参考情報表示用）"
        value={grade}
        onChange={(e) => setGrade(e.target.value === "" ? "" : (Number(e.target.value) as Grade))}
        hint="選択すると、学年別の学童待機児童数（全国）を参考として表示します。計算結果には影響しません"
      >
        <option value="">選択しない</option>
        {GRADE_OPTIONS.map((g) => (
          <option key={g} value={g}>
            小学{g}年生
          </option>
        ))}
      </SelectField>

      {!result.ok && <Callout tone="caution">{result.error}</Callout>}

      {result.ok && (
        <div className="space-y-4">
          <ResultCard
            label="子どもが一人になる時間の目安"
            value={result.hitoriJikan.label}
            note={
              result.hitoriJikan.minutes === 0
                ? `子どもの帰宅目安（${result.kodomoKitakuLabel}）までに、親の帰宅目安（${result.oyaKitakuLabel}）が間に合っています`
                : `子どもの帰宅目安（${result.kodomoKitakuLabel}）から、親の帰宅目安（${result.oyaKitakuLabel}）までの時間です`
            }
          />

          <div className="rounded-card border border-line p-4 text-sm sm:text-base">
            <p className="font-medium">子どもを一人にしないための退勤限界時刻（参考）</p>
            <p className="mt-1 text-ink-muted">
              {result.taikinGenkai.possible
                ? `${result.taikinGenkai.label} までに退勤すると、子どもの帰宅と入れ違いにならない目安です`
                : result.taikinGenkai.label}
            </p>
          </div>

          {result.workable && (
            <ResultCard
              label="子どもを一人にしない場合の実労働可能時間の目安"
              value={result.workable.label}
              note={`出勤時刻から退勤限界時刻（${result.taikinGenkai.label}）までの時間です`}
            />
          )}

          {!result.workable && shukkinJikoku.trim() === "" && (
            <Callout>
              出勤時刻を入力すると、子どもを一人にしない場合の実労働可能時間もあわせて計算します。
            </Callout>
          )}

          <Callout>
            <p className="font-medium">
              学童保育の制度上の対象学年・全国の待機児童の状況（参考情報）
            </p>
            <p className="mt-1">
              制度上、学童保育（放課後児童健全育成事業）の対象は{GRADE_RANGE_LABEL}です。1つの支援の単位（クラスに相当）の定員はおおむね{SUPPORT_UNIT_MAX_CHILDREN}人とされています。全国の待機児童数は
              {fmtCount(WAITING_CHILDREN_TOTAL)}人（{WAITING_CHILDREN_SURVEY_DATE}時点）です。
            </p>
            {waitingStat && (
              <p className="mt-1">
                小学{waitingStat.grade}年生の待機児童数は全国で{fmtCount(waitingStat.count)}
                人です。
              </p>
            )}
            <p className="mt-1 text-ink-muted">
              対象学年・定員・待機児童数は制度・統計データに基づく参考情報であり、上記のシミュレーション結果とは独立しています。実際に何年生まで受け入れているか、待機の状況は市区町村・学童ごとに大きく異なります。
            </p>
          </Callout>

          <Callout tone="caution">{SHOU1_KABE_DISCLAIMER}</Callout>
        </div>
      )}
    </div>
  );
}
