"use client";

import { useMemo, useState } from "react";
import { DateField, NumberField, SelectField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import {
  simulate,
  ninteiDefinition,
  CARE_LEVELS,
  GRADES,
  ROOM_TYPES,
  GENKAKU_BRACKETS,
  BASE_GRADE,
  CURRENT_DISTRIBUTION,
  NINTEI_NOTE,
  NINTEI_PROCESS,
  KOUGAKU_EXCLUSION_NOTE,
  TAXABLE_INCOME_DEFINITION,
  HOJOKYUFU_STAGES_NOTE,
  BASE_YEAR_RULE_TEXT,
  type KaigoInput,
  type AgeGroup,
  type Household,
  type TaxStatus,
  type Mode,
} from "@/lib/tools/impl/kaigo-jikofutan";

/*
 * 介護保険 自己負担シミュレーター（Q3-20）— specs/s-tools/05-kaigo-hoken-futan.md
 * すべてクライアント内で即時計算（送信なし・登録なし）。
 * 制度の数値は data/seido/kaigo-hoken.json のみを参照する（lib/tools/impl/kaigo-jikofutan.ts 経由）。
 *
 * ★このUIが絶対に書かないもの★
 *   要介護度の「状態像」（法令・告示に根拠がない）。表示は要介護認定等基準時間のみ。
 */

const yen = (n: number) => n.toLocaleString("ja-JP");

export function KaigoJikofutan() {
  const [serviceDate, setServiceDate] = useState("2026-07-01");
  const [ageGroup, setAgeGroup] = useState<AgeGroup>("age65plus");
  const [household, setHousehold] = useState<Household>("single");
  const [careLevel, setCareLevel] = useState("yokaigo3");
  const [grade, setGrade] = useState(BASE_GRADE.grade);
  const [totalIncome, setTotalIncome] = useState("");
  const [pensionPlusOtherIncome, setPensionPlusOtherIncome] = useState("");
  const [taxableIncome, setTaxableIncome] = useState("");
  const [taxStatus, setTaxStatus] = useState<TaxStatus>("taxed");
  const [under16, setUnder16] = useState("0");
  const [age16to18, setAge16to18] = useState("0");
  const [isHouseholder, setIsHouseholder] = useState(true);
  const [mode, setMode] = useState<Mode>("zaitaku");
  const [usedUnits, setUsedUnits] = useState("");
  const [roomType, setRoomType] = useState("ユニット型個室");
  const [stayDays, setStayDays] = useState("30");
  const [isShortStay, setIsShortStay] = useState(false);
  const [savings, setSavings] = useState("");
  const [hojokyufuIncome, setHojokyufuIncome] = useState("");

  const input: KaigoInput = useMemo(
    () => ({
      serviceDate,
      ageGroup,
      household,
      careLevel,
      grade,
      totalIncome: Number(totalIncome) || 0,
      pensionPlusOtherIncome: Number(pensionPlusOtherIncome) || 0,
      taxableIncome: Number(taxableIncome) || 0,
      taxStatus,
      youngDependents: { under16: Number(under16) || 0, age16to18: Number(age16to18) || 0 },
      isHouseholder,
      mode,
      usedUnits: usedUnits === "" ? null : Number(usedUnits),
      roomType,
      stayDays: Number(stayDays) || 0,
      isShortStay,
      savings: Number(savings) || 0,
      hojokyufuIncome: Number(hojokyufuIncome) || 0,
    }),
    [
      serviceDate,
      ageGroup,
      household,
      careLevel,
      grade,
      totalIncome,
      pensionPlusOtherIncome,
      taxableIncome,
      taxStatus,
      under16,
      age16to18,
      isHouseholder,
      mode,
      usedUnits,
      roomType,
      stayDays,
      isShortStay,
      savings,
      hojokyufuIncome,
    ],
  );

  const r = useMemo(() => simulate(input), [input]);
  const nintei = ninteiDefinition(careLevel);
  const z = r.zaitaku;
  const k = r.kougaku;
  const h = r.hojokyufu;

  return (
    <div className="space-y-5">
      {/* ---------------- 共通の入力 ---------------- */}
      <div className="grid gap-4 sm:grid-cols-2">
        <DateField
          label="いつのサービス分ですか（試算の基準日）"
          value={serviceDate}
          hint="2026年8月1日から施設の食費・居住費の負担限度額が変わります"
          onChange={(e) => setServiceDate(e.target.value)}
        />
        <SelectField
          label="年齢区分"
          value={ageGroup}
          hint="40〜64歳の方（第2号被保険者）は、所得にかかわらず一律1割です"
          onChange={(e) => setAgeGroup(e.target.value as AgeGroup)}
        >
          <option value="age65plus">65歳以上（第1号被保険者）</option>
          <option value="age40to64">40〜64歳（第2号被保険者）</option>
        </SelectField>
        <SelectField
          label="要介護度（認定を受けている区分）"
          value={careLevel}
          hint="市区町村から届いた認定結果の区分を選んでください"
          onChange={(e) => setCareLevel(e.target.value)}
        >
          {/* ★levels[] からループで生成する（経過的要介護を落とさない）★ */}
          {CARE_LEVELS.map((l) => (
            <option key={l.key} value={l.key}>
              {l.label}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="お住まいの市町村の級地（地域区分）"
          value={grade}
          hint="わからない場合は「その他」のままで構いません"
          onChange={(e) => setGrade(e.target.value)}
        >
          {GRADES.map((g) => (
            <option key={g.grade} value={g.grade}>
              {g.grade}
              {g.grade === BASE_GRADE.grade ? "（上乗せなし・1単位10円）" : ""}
            </option>
          ))}
        </SelectField>
      </div>

      {/* ★要介護度の説明は基準時間のみ。状態像を書かない★ */}
      {nintei && (
        <Callout>
          <p>
            <strong>{nintei.label}</strong>：{nintei.text}
          </p>
          <p className="mt-1">{NINTEI_NOTE}</p>
          {nintei.sameRangeLabels.length > 0 && (
            <p className="mt-1">
              {nintei.sameRangeLabels.join("・")}と同じ時間帯です。{nintei.note}
            </p>
          )}
        </Callout>
      )}
      {!nintei && (
        <Callout>
          この区分には要介護認定等基準時間の定義がありません（区分支給限度基準額のみが定められています）。
        </Callout>
      )}

      {/* ---------------- 所得（★65歳以上のみ★） ---------------- */}
      {/* ★ステップ1の早期リターン★ 40〜64歳は所得を一切聞かない */}
      {ageGroup === "age65plus" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="世帯に65歳以上の方が2人以上いますか"
            value={household}
            onChange={(e) => setHousehold(e.target.value as Household)}
          >
            <option value="single">単身（1人）</option>
            <option value="couple">夫婦等（2人以上）</option>
          </SelectField>
          <NumberField
            label="本人の合計所得金額"
            value={totalIncome}
            min={0}
            max={50_000_000}
            step="10000"
            hint="収入ではなく所得です。市区町村の課税証明書でご確認ください"
            onChange={(e) => setTotalIncome(e.target.value)}
          />
          <NumberField
            label="世帯の65歳以上の方の「年金収入＋その他の合計所得金額」"
            value={pensionPlusOtherIncome}
            min={0}
            max={50_000_000}
            step="10000"
            hint="年金は「収入」の額、その他は「所得」の額です。単身ならご本人ぶん、夫婦等なら合算します"
            onChange={(e) => setPensionPlusOtherIncome(e.target.value)}
          />
        </div>
      )}

      <ResultCard
        label="あなたの利用者負担の割合は"
        value={`${r.futanWariai.rate10}割`}
        note={r.futanWariai.reason}
      />

      {r.futanWariai.rate10 === 1 && (
        <Callout>
          {CURRENT_DISTRIBUTION}です。9割以上の方が1割負担です。
        </Callout>
      )}

      {/* ---------------- 世帯の課税状況 ---------------- */}
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="世帯の課税状況"
          value={taxStatus}
          hint="高額介護サービス費・補足給付の判定は、課税所得の金額ではなくここから始まります"
          onChange={(e) => setTaxStatus(e.target.value as TaxStatus)}
        >
          <option value="taxed">課税世帯</option>
          <option value="hikazei">市町村民税世帯非課税</option>
          <option value="seikatsuHogo">生活保護を受けている</option>
        </SelectField>
        {taxStatus === "taxed" && (
          <NumberField
            label="本人の課税所得"
            value={taxableIncome}
            min={0}
            max={50_000_000}
            step="10000"
            hint="高額介護サービス費の上限額を決めるのに使います"
            onChange={(e) => setTaxableIncome(e.target.value)}
          />
        )}
        {taxStatus !== "taxed" && (
          <NumberField
            label="本人の「年金収入金額＋合計所得金額」"
            value={hojokyufuIncome}
            min={0}
            max={20_000_000}
            step="10000"
            hint="非課税年金（遺族年金・障害年金）も含めます"
            onChange={(e) => setHojokyufuIncome(e.target.value)}
          />
        )}
      </div>

      {taxStatus === "taxed" && (
        <details className="rounded-card border border-line p-4 text-sm">
          <summary className="cursor-pointer font-medium">課税所得の定義・年少扶養控除の調整</summary>
          <p className="mt-2 text-ink-muted">{TAXABLE_INCOME_DEFINITION}</p>
          <p className="mt-2 text-ink-muted">
            世帯主の方で、同一世帯に合計所得金額38万円以下の19歳未満の方がいる場合、課税所得から控除する調整措置があります。
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <SelectField
              label="あなたは世帯主ですか"
              value={isHouseholder ? "yes" : "no"}
              onChange={(e) => setIsHouseholder(e.target.value === "yes")}
            >
              <option value="yes">はい</option>
              <option value="no">いいえ</option>
            </SelectField>
            {isHouseholder && (
              <>
                <NumberField
                  label="同一世帯の16歳未満の方（合計所得38万円以下）"
                  value={under16}
                  min={0}
                  max={10}
                  onChange={(e) => setUnder16(e.target.value)}
                />
                <NumberField
                  label="同一世帯の16歳以上19歳未満の方（合計所得38万円以下）"
                  value={age16to18}
                  min={0}
                  max={10}
                  onChange={(e) => setAge16to18(e.target.value)}
                />
              </>
            )}
          </div>
          {k?.adjustedTaxableIncome !== null && k?.adjustedTaxableIncome !== undefined && (
            <p className="mt-2 text-ink-muted">
              調整後の課税所得: <strong>{yen(k.adjustedTaxableIncome)} 円</strong>
            </p>
          )}
        </details>
      )}

      {/* ---------------- モード ---------------- */}
      <SelectField label="試算するのは" value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
        <option value="zaitaku">在宅サービス（自宅で使う）</option>
        <option value="shisetsu">施設入所（食費・居住費もかかる）</option>
      </SelectField>

      {/* ---------------- 在宅 ---------------- */}
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="1か月の利用単位数（ケアプランの単位数）"
          value={usedUnits}
          min={0}
          max={100_000}
          step="1"
          hint="わからない場合は空欄のままで、限度額いっぱい使った場合で計算します"
          onChange={(e) => setUsedUnits(e.target.value)}
        />
      </div>

      {z && k && (
        <>
          <ResultCard
            label={`${z.level.label}・${r.futanWariai.rate10}割負担のとき、1か月の自己負担の目安は`}
            value={r.monthlyTotal === null ? "—" : yen(r.monthlyTotal)}
            unit="円"
            note={`サービスの費用の総額 ${yen(z.totalCost)} 円（${yen(z.usedUnits)}単位 × ${r.tanka.yen}円）のうちのご負担分です。${
              k.refund > 0 ? `高額介護サービス費で ${yen(k.refund)} 円が払い戻される見込みです。` : ""
            }`}
          />

          <div className="rounded-card border border-line p-4 text-sm">
            <h2 className="text-base font-bold">内訳</h2>
            <dl className="mt-2 space-y-1">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">
                  区分支給限度基準額の範囲内（{yen(z.withinUnits)}単位）の自己負担
                </dt>
                <dd className="tabular-nums">{yen(z.withinFutan)} 円</dd>
              </div>
              {z.overUnits > 0 && (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">
                    限度額を超えた分（{yen(z.overUnits)}単位）＝<strong>全額（10割）自己負担</strong>
                  </dt>
                  <dd className="tabular-nums">{yen(z.overFutan)} 円</dd>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">
                  高額介護サービス費の上限（{k.bracket.label}）
                </dt>
                <dd className="tabular-nums">
                  {yen(k.limit)} 円（{k.bracket.unit}）
                  {k.limitIndividual !== null && `／個人 ${yen(k.limitIndividual)} 円`}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">払い戻しの見込み</dt>
                <dd className="tabular-nums">{yen(k.refund)} 円</dd>
              </div>
            </dl>
            <p className="mt-3 text-ink-muted">
              区分支給限度基準額は <strong>{yen(z.limitUnits)}単位</strong>（1単位10円なら{" "}
              {yen(z.level.yenAt10)}円）です。{KOUGAKU_EXCLUSION_NOTE}
            </p>
            <p className="mt-2 text-ink-muted">
              高額介護サービス費の所得区分は{BASE_YEAR_RULE_TEXT}の所得で判定します（この試算では{k.baseYear}
              年分）。該当するかどうかの判断は、サービス利用があった月ごとに、それぞれの月の初日の状態で行われます。
            </p>
          </div>

          {k.limitIndividual !== null && (
            <Callout>
              この区分は世帯の上限（{yen(k.limit)}円）と個人の上限（{yen(k.limitIndividual)}
              円）の両方が定められています。世帯に複数のサービス利用者がいる場合の扱いは市区町村にご確認ください。
            </Callout>
          )}
        </>
      )}

      {/* ---------------- 施設 ---------------- */}
      {mode === "shisetsu" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="居住費の部屋タイプ"
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
            >
              {ROOM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </SelectField>
            <NumberField
              label="1か月の滞在日数"
              value={stayDays}
              min={1}
              max={31}
              onChange={(e) => setStayDays(e.target.value)}
            />
            <SelectField
              label="短期入所（ショートステイ）ですか"
              value={isShortStay ? "yes" : "no"}
              hint="ショートステイは食費の負担限度額が別に定められています"
              onChange={(e) => setIsShortStay(e.target.value === "yes")}
            >
              <option value="no">いいえ</option>
              <option value="yes">はい</option>
            </SelectField>
            {taxStatus !== "taxed" && (
              <NumberField
                label="預貯金等の額"
                value={savings}
                min={0}
                max={100_000_000}
                step="100000"
                hint="配偶者がいる場合は合算します"
                onChange={(e) => setSavings(e.target.value)}
              />
            )}
          </div>

          {taxStatus !== "taxed" && (
            <Callout>
              補足給付の「世帯」には、世帯を分離している配偶者も含みます。年金収入金額には非課税年金（遺族年金・障害年金）も含みます。
              {HOJOKYUFU_STAGES_NOTE.includes("平成28年8月") && "（平成28年8月以降）"}
              通常の税制上の世帯・年金収入とは定義が違います。
            </Callout>
          )}

          {h && !h.unavailable && (
            <div className="rounded-card border border-line p-4 text-sm">
              <h2 className="text-base font-bold">施設の食費・居住費（1か月 {h.days}日）</h2>
              <p className="mt-1 text-ink-muted">{h.period.label}の負担限度額で計算しています。</p>

              {h.line && (
                <>
                  <p className="mt-2">
                    <strong>{h.line.stage.label}</strong>
                    {h.line.stage.key === "stage4" && "（補足給付の対象外＝基準費用額を全額負担）"}
                  </p>
                  <dl className="mt-2 space-y-1">
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-muted">食費{h.stageResult.stage?.key !== "stage4" && isShortStay && "（ショートステイ）"}</dt>
                      <dd className="tabular-nums">{yen(h.line.shokuhi)} 円/日</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-muted">居住費（{roomType}）</dt>
                      <dd className="tabular-nums">{yen(h.line.kyojuhi)} 円/日</dd>
                    </div>
                    <div className="flex justify-between gap-3 border-t border-line pt-1">
                      <dt className="font-medium">1か月の食費・居住費</dt>
                      <dd className="tabular-nums font-bold">{yen(h.line.monthly)} 円</dd>
                    </div>
                  </dl>
                </>
              )}

              {/* ★確定値を出さない★ 第2段階／第3段階①の境界の不一致 */}
              {!h.line && h.candidateLines.length > 0 && (
                <>
                  <p className="mt-2 font-medium">
                    段階を確定できないため、両方の場合の金額を併記します。
                  </p>
                  <ul className="mt-2 space-y-2">
                    {h.candidateLines.map((l) => (
                      <li key={l.stage.key} className="rounded-card border border-line p-3">
                        <p className="font-medium">{l.stage.label}の場合</p>
                        <p className="mt-1 text-ink-muted">
                          食費 {yen(l.shokuhi)} 円/日 ＋ 居住費 {yen(l.kyojuhi)} 円/日 ＝{" "}
                          {yen(l.perDay)} 円/日
                        </p>
                        <p className="mt-1 tabular-nums font-bold">1か月 {yen(l.monthly)} 円</p>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <p className="mt-3 text-ink-muted">
                <strong>食費・居住費は高額介護サービス費の対象外です。</strong>
                上の在宅サービスの自己負担とは別にかかります。
              </p>
            </div>
          )}

          {h?.unavailable && (
            <Callout tone="caution">
              選んだ条件では食費・居住費の負担限度額を表示できません。部屋タイプをご確認ください。
            </Callout>
          )}
        </>
      )}

      {/* ---------------- 警告 ---------------- */}
      {r.warnings.map((w) => (
        <Callout key={w.slice(0, 24)} tone="caution">
          {w}
        </Callout>
      ))}

      <Callout>
        <p>
          <strong>要介護認定を受けていない場合</strong>
          は、まずお住まいの市区町村へ申請してください。{NINTEI_PROCESS}という流れで決まります。このツールは要介護度の推定は行いません。
        </p>
      </Callout>

      <Callout>
        <p>
          「{GENKAKU_BRACKETS.map((b) => b.label).join("」「")}
          」に当てはまる可能性のある方は、上の表と上限額が異なります。市区町村にご確認ください。
        </p>
      </Callout>
    </div>
  );
}
