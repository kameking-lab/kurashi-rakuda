"use client";

import { useMemo, useState } from "react";
import { NumberField, SelectField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import {
  simulate,
  type FuyoInput,
  type FuyoTarget,
  type EmployerSize,
  type WallResult,
} from "@/lib/tools/impl/fuyo-kabe";

/*
 * 扶養の壁シミュレーター2026（Q3-18）— specs/s-tools/02-fuyou-kabe-simu.md
 * すべてクライアント内で即時計算（送信なし・登録なし）。
 * 制度の数値は data/seido/fuyou-kabe.json のみを参照する（lib/tools/impl/fuyo-kabe.ts 経由）。
 */

const yen = (n: number) => n.toLocaleString("ja-JP");
const man = (n: number) => `${(n / 10000).toLocaleString("ja-JP")}万円`;

function WallRow({ w, salary }: { w: WallResult; salary: number }) {
  const tone =
    w.status === "safe"
      ? "border-line"
      : w.status === "crossed"
        ? "border-caution/40"
        : "border-line";
  const badge =
    w.status === "safe" ? "まだ手前" : w.status === "crossed" ? "超えています" : "要確認";

  const remaining = w.amount !== null && w.status === "safe" ? w.amount - salary : null;

  return (
    <li className={`rounded-card border p-4 ${tone}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="font-medium">{w.name}</p>
        <p className="text-sm text-ink-muted">{badge}</p>
      </div>
      <p className="mt-1 text-lg font-bold tabular-nums">
        {w.amount === null ? "市区町村により異なります" : man(w.amount)}
        {w.isSlope && (
          <span className="ml-2 align-middle text-xs font-normal text-ink-muted">
            崖ではなく坂
          </span>
        )}
      </p>
      <p className="mt-1 text-sm text-ink-muted">{w.effect}</p>
      {remaining !== null && remaining >= 0 && (
        <p className="mt-1 text-sm text-ink-muted">あと {yen(remaining)} 円で届きます。</p>
      )}
      {w.note && <p className="mt-1 text-sm text-ink-muted">{w.note}</p>}
    </li>
  );
}

export function FuyoKabe() {
  const [salary, setSalary] = useState("1300000");
  const [age, setAge] = useState("30");
  const [target, setTarget] = useState<FuyoTarget>("spouse");
  const [isStudent, setIsStudent] = useState(false);
  const [employerSize, setEmployerSize] = useState<EmployerSize>("unknown");
  const [weeklyHours, setWeeklyHours] = useState("20");
  const [supporterSalary, setSupporterSalary] = useState("6000000");
  const [baseMonth, setBaseMonth] = useState("2026-06");

  const parsedSalary = Number(salary);
  const parsedAge = Number(age);
  const valid =
    Number.isFinite(parsedSalary) &&
    parsedSalary >= 0 &&
    Number.isFinite(parsedAge) &&
    parsedAge > 0;

  const input: FuyoInput = useMemo(
    () => ({
      salary: valid ? parsedSalary : 0,
      age: valid ? parsedAge : 30,
      target,
      isStudent,
      employerSize,
      weeklyHours: Number(weeklyHours) || 0,
      overTwoMonths: true,
      supporterSalary: Number(supporterSalary) || 0,
      sameHousehold: true,
      baseMonth,
    }),
    [
      valid,
      parsedSalary,
      parsedAge,
      target,
      isStudent,
      employerSize,
      weeklyHours,
      supporterSalary,
      baseMonth,
    ],
  );

  const r = useMemo(() => simulate(input), [input]);

  const nextWall = r.walls.find((w) => w.status === "safe" && w.amount !== null);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="年間の給与収入（額面・見込み）"
          value={salary}
          min={0}
          step="10000"
          hint="手取りではなく額面です"
          onChange={(e) => setSalary(e.target.value)}
        />
        <NumberField
          label="あなたの年齢"
          value={age}
          min={15}
          max={100}
          hint="年齢で「壁」の金額が変わります"
          onChange={(e) => setAge(e.target.value)}
        />
        <SelectField
          label="誰の扶養に入っていますか"
          value={target}
          onChange={(e) => setTarget(e.target.value as FuyoTarget)}
        >
          <option value="spouse">配偶者</option>
          <option value="parent">親</option>
          <option value="none">扶養に入っていない</option>
        </SelectField>
        <SelectField
          label="学生ですか"
          value={isStudent ? "yes" : "no"}
          hint="夜間・通信・定時制の方は「いいえ」を選んでください"
          onChange={(e) => setIsStudent(e.target.value === "yes")}
        >
          <option value="no">いいえ</option>
          <option value="yes">はい（昼間部）</option>
        </SelectField>
        <SelectField
          label="勤務先の従業員数"
          value={employerSize}
          hint="社会保険に入るかの判定に使います"
          onChange={(e) => setEmployerSize(e.target.value as EmployerSize)}
        >
          <option value="unknown">わからない</option>
          <option value="51plus">51人以上</option>
          <option value="under51">51人未満</option>
        </SelectField>
        <NumberField
          label="週の所定労働時間"
          value={weeklyHours}
          min={0}
          max={60}
          step="1"
          hint="契約上の時間です（実際の残業は含みません）"
          onChange={(e) => setWeeklyHours(e.target.value)}
        />
        {target === "spouse" && (
          <NumberField
            label="配偶者の年間給与収入"
            value={supporterSalary}
            min={0}
            step="100000"
            hint="配偶者控除の判定に使います"
            onChange={(e) => setSupporterSalary(e.target.value)}
          />
        )}
        <SelectField
          label="いつの時点で試算しますか"
          value={baseMonth}
          hint="2026年10月に社会保険の賃金要件が撤廃される予定です"
          onChange={(e) => setBaseMonth(e.target.value)}
        >
          {[
            "2026-04",
            "2026-05",
            "2026-06",
            "2026-07",
            "2026-08",
            "2026-09",
            "2026-10",
            "2026-11",
            "2026-12",
            "2027-01",
            "2027-02",
            "2027-03",
          ].map((m) => (
            <option key={m} value={m}>
              {m.replace("-", "年")}月
            </option>
          ))}
        </SelectField>
      </div>

      {!valid ? (
        <Callout>年収と年齢を入れると、その場で「壁」との位置関係を表示します。</Callout>
      ) : (
        <>
          <ResultCard
            label={`年収 ${yen(parsedSalary)} 円のとき、次に来る壁は`}
            value={nextWall?.amount !== undefined && nextWall?.amount !== null ? man(nextWall.amount) : "—"}
            note={
              nextWall
                ? `${nextWall.name}：${nextWall.effect}`
                : "対象となる壁をすべて超えています。"
            }
          />

          <Callout>
            2026年（令和8年）分から、自分に所得税がかかり始めるのは
            <strong>年収178万円</strong>からです。かつての「103万円の壁」は、2025年以前の制度の話です。
          </Callout>

          {r.outOfRange && (
            <Callout tone="caution">
              年収220万円以上の詳しい試算は準備中です（給与所得控除の速算表を収集中）。
              壁との位置関係のみ表示しています。
            </Callout>
          )}

          <div>
            <h2 className="text-base font-bold">あなたに関係する壁</h2>
            <ul className="mt-2 space-y-2">
              {r.walls.map((w) => (
                <li key={w.key}>
                  <WallRow w={w} salary={parsedSalary} />
                </li>
              ))}
            </ul>
          </div>

          {r.shaho.enrolled === true && (
            <Callout tone="caution">
              勤務先の社会保険に加入する条件を満たしています。保険料の本人負担は
              年間およそ <strong>{yen(r.premium)} 円</strong>（概算）です。
              そのぶん将来の年金が増え、傷病手当金なども使えるようになります。
            </Callout>
          )}

          {r.shaho.enrolled === "unknown" && (
            <Callout>
              勤務先の従業員数がわからないため、両方の場合を示します。
              51人以上なら社会保険に加入し、本人負担は年間およそ {yen(r.premium)} 円（概算）です。
              51人未満なら加入しません。勤務先にご確認ください。
            </Callout>
          )}

          {!r.dependent.isDependent && (
            <Callout>
              扶養から外れる見込みです。ただし、人手不足による一時的な収入増であれば、
              勤務先の証明により原則連続2回まで扶養にとどまれる場合があります（年収の壁・支援強化パッケージ）。
              勤務先にご相談ください。
            </Callout>
          )}
        </>
      )}
    </div>
  );
}
