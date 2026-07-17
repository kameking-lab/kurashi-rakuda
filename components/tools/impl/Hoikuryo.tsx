"use client";

import { useMemo, useState } from "react";
import { NumberField, SelectField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import {
  calc,
  getMunicipality,
  isIncomeInputUseful,
  municipalities,
  type AgeKey,
  type CareNeed,
  type HoikuryoMunicipality,
  type TaxStatus,
} from "@/lib/tools/impl/hoikuryo";
import { basisYearLabel, formatJaDate } from "@/lib/tools/seido";

/*
 * 保育料計算 全国版（Q3-09）— specs/s-tools/01-hoikuryo-keisan.md
 * すべてクライアント内で即時計算（送信なし・登録なし）。
 * 制度の数値は data/seido/hoikuryo/*.json のみを参照する（lib/tools/impl/hoikuryo.ts 経由）。
 *
 * ★このUIが守っていること★
 *   - 所得割額の直接入力は「上級者モード」に隔離し、既定は年収から入る
 *   - 上級者モードを開いたら、その自治体の前処理の説明を必ず同じ画面に出す
 *   - 課税状況を所得割額より先に聞く（A/B/C は所得割0円では判別できない）
 *   - 未対応自治体・未確認項目は「準備中」と言い、階層表の読み方を案内する
 */

const yen = (n: number) => n.toLocaleString("ja-JP");

const OTHER = "__other__";

/** 都道府県ごとにまとめた選択肢（収集済みのみ） */
function groupedOptions() {
  const byPref = new Map<string, HoikuryoMunicipality[]>();
  for (const m of municipalities) {
    const list = byPref.get(m.prefecture) ?? [];
    list.push(m);
    byPref.set(m.prefecture, list);
  }
  return [...byPref.entries()];
}

/** 自治体の公式資料へのリンク一覧 */
function SourceList({ m }: { m: HoikuryoMunicipality }) {
  return (
    <ul className="mt-1 space-y-1 text-sm text-ink-muted">
      {m.sources.map((s) => (
        <li key={s.id}>
          <a
            href={s.landingUrl ?? s.url}
            className="underline decoration-line underline-offset-4 hover:text-ink"
            rel="noopener noreferrer"
            target="_blank"
          >
            {s.publisher}「{s.title}」
          </a>
        </li>
      ))}
    </ul>
  );
}

/** 未対応自治体のときに出す、自分で階層表を読むためのガイド */
function ReadingGuide() {
  return (
    <div className="space-y-3">
      <h2 className="text-base font-bold">お住まいの自治体の表を自分で読む方法</h2>
      <ol className="list-decimal space-y-2 pl-5 text-sm text-ink-muted">
        <li>
          <span className="font-medium text-ink">「◯◯市 保育料 基準額表」で公式サイトを探す。</span>
          金額表は自治体の公式サイト（PDF）にあります。ほかのサイトの数字は古いことがあります。
        </li>
        <li>
          <span className="font-medium text-ink">
            「市町村民税所得割額」を課税明細書で確認する。
          </span>
          毎年6月ごろに勤務先か市区町村から届く「住民税決定通知書（課税明細書）」の
          <strong>「税額」欄の「市民税（特別区民税）の所得割額」</strong>
          を見ます。県民税・都民税の所得割額は使いません。父母それぞれの額を合計します。
        </li>
        <li>
          <span className="font-medium text-ink">その額をそのまま表に当てはめない。</span>
          自治体ごとに前処理が違います。政令指定都市（横浜・大阪・名古屋・札幌・福岡・川崎など）は
          税率が6%から8%に変わった経緯があり、
          <strong>6/8を掛けた額（旧税率6%相当）</strong>で表を引く自治体があります。また
          <strong>住宅ローン控除・ふるさと納税（寄附金税額控除）・配当控除などは「無かったもの」として扱う</strong>
          のが一般的です。表の近くにある注記を必ず読んでください。
        </li>
        <li>
          <span className="font-medium text-ink">
            4〜8月分と9月〜翌3月分では、使う年度が違う。
          </span>
          多くの自治体で
          <strong>4〜8月分は前年度の課税額、9月〜翌3月分は今年度の課税額</strong>
          を使います。9月に金額が変わるのはこのためです。
        </li>
        <li>
          <span className="font-medium text-ink">A・B・C階層は所得割額では見分けられない。</span>
          生活保護世帯（A）・住民税非課税世帯（B）・均等割のみ課税世帯（C）はどれも所得割額が0円です。
          <strong>Cは0円ではないことが多い</strong>ため、自分がどれに当たるかを先に確かめてください。
        </li>
        <li>
          <span className="font-medium text-ink">年齢はクラス年齢で見る。</span>
          年度の途中で3歳になっても、その年度中は3歳未満児クラスのままです。
        </li>
      </ol>
      <Callout>
        分からないときは、お住まいの市区町村の保育担当課（保育課・子ども家庭支援課など）に
        「保育料の階層を知りたい」と電話するのが確実です。課税明細書を手元に置いて聞くとすぐ分かります。
      </Callout>
    </div>
  );
}

export function Hoikuryo() {
  const [municipalityId, setMunicipalityId] = useState("kanagawa-yokohama");
  const [month, setMonth] = useState("2026-06");
  const [age, setAge] = useState<AgeKey>("under3");
  const [need, setNeed] = useState<CareNeed>("standard");
  const [taxStatus, setTaxStatus] = useState<TaxStatus>("incomeTaxed");
  const [birthOrder, setBirthOrder] = useState("1");
  const [single, setSingle] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [income, setIncome] = useState("");
  const [hasGrandparents, setHasGrandparents] = useState(false);

  const m = getMunicipality(municipalityId);
  const incomeUseful = m ? isIncomeInputUseful(m) : false;
  const useIncome = advanced && incomeUseful && taxStatus === "incomeTaxed";
  const parsedIncome = income.trim() === "" ? null : Number(income);

  const r = useMemo(
    () =>
      m
        ? calc({
            municipalityId,
            month,
            age,
            need,
            taxStatus,
            income: useIncome ? parsedIncome : null,
            birthOrder: Number(birthOrder) || 1,
            isSingleParentOrDisability: single,
          })
        : null,
    [m, municipalityId, month, age, need, taxStatus, useIncome, parsedIncome, birthOrder, single],
  );

  const ageClasses = m?.ageClasses ?? [];
  const months = [
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
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="お住まいの自治体"
          value={municipalityId}
          hint={`現在の対応は${municipalities.length}自治体です`}
          onChange={(e) => setMunicipalityId(e.target.value)}
        >
          {groupedOptions().map(([pref, list]) => (
            <optgroup key={pref} label={pref}>
              {list.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </optgroup>
          ))}
          <option value={OTHER}>この一覧にない自治体</option>
        </SelectField>

        <SelectField
          label="いつの保育料を知りたいですか"
          value={month}
          hint="4〜8月分と9月以降で、使う課税年度が変わります"
          onChange={(e) => setMonth(e.target.value)}
        >
          {months.map((x) => (
            <option key={x} value={x}>
              {x.replace("-", "年")}月分
            </option>
          ))}
        </SelectField>

        {m && (
          <>
            <SelectField
              label="子どもの年齢区分"
              value={age}
              hint={ageClasses.find((a) => a.key === age)?.rule ?? "誕生日ではなくクラス年齢です"}
              onChange={(e) => setAge(e.target.value as AgeKey)}
            >
              {ageClasses.map((a) => (
                <option key={a.key} value={a.key}>
                  {a.label}
                </option>
              ))}
            </SelectField>

            <SelectField
              label="保育必要量"
              value={need}
              hint="保育標準時間は1日最大11時間、保育短時間は同8時間です"
              onChange={(e) => setNeed(e.target.value as CareNeed)}
            >
              <option value="standard">保育標準時間</option>
              <option value="short">保育短時間</option>
            </SelectField>

            <SelectField
              label="世帯の課税状況"
              value={taxStatus}
              hint="所得割額が0円でも、非課税世帯と均等割のみ課税世帯は別ものです"
              onChange={(e) => setTaxStatus(e.target.value as TaxStatus)}
            >
              <option value="incomeTaxed">住民税の所得割が課税されている</option>
              <option value="equalOnly">住民税の均等割のみ課税されている</option>
              <option value="nonTaxable">住民税非課税世帯</option>
              <option value="welfare">生活保護を受けている</option>
            </SelectField>

            <NumberField
              label="この子は上から何番目ですか"
              value={birthOrder}
              min={1}
              max={10}
              hint="数え方は自治体で違います"
              onChange={(e) => setBirthOrder(e.target.value)}
            />

            <SelectField
              label="ひとり親世帯・在宅障害者等に該当しますか"
              value={single ? "yes" : "no"}
              hint="該当すると軽減がある自治体があります"
              onChange={(e) => setSingle(e.target.value === "yes")}
            >
              <option value="no">いいえ</option>
              <option value="yes">はい</option>
            </SelectField>

            <SelectField
              label="同居の祖父母等がいますか"
              value={hasGrandparents ? "yes" : "no"}
              hint="合算の対象が父母だけとは限りません"
              onChange={(e) => setHasGrandparents(e.target.value === "yes")}
            >
              <option value="no">いいえ</option>
              <option value="yes">はい</option>
            </SelectField>
          </>
        )}
      </div>

      {/* ---------------------------------------- 未対応自治体 */}
      {!m && (
        <>
          <Callout tone="caution">
            お住まいの自治体は<strong>準備中</strong>です。保育料は自治体ごとに階層表も計算の前処理も
            まったく違うため、全国共通の計算式は存在しません。推測の金額はお見せせず、
            対応できた自治体から順に増やしています。
          </Callout>
          <ReadingGuide />
        </>
      )}

      {m && r && (
        <>
          {/* ---------------------------------------- 年度が違うデータ（折りたたまない） */}
          {r.fiscalYearMismatch && (
            <div className="rounded-card border border-caution/40 p-4 text-sm">
              <p className="font-bold">
                これは{basisYearLabel(m.fiscalYear)}の金額です
              </p>
              <p className="mt-1 text-ink-muted">
                {m.name}は{basisYearLabel(fiscalYearOfMonth(month))}
                版の基準月額表を{formatJaDate(m.asOf)}時点で公表していません。
                {basisYearLabel(fiscalYearOfMonth(month))}の試算には使えません。
                下の金額は{basisYearLabel(m.fiscalYear)}の表から引いたものです。
              </p>
            </div>
          )}

          {/* ---------------------------------------- 上級者モード */}
          {taxStatus === "incomeTaxed" && incomeUseful && (
            <div className="rounded-card border border-line p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium">所得割額を直接入れて階層を出す（上級者向け）</p>
                <button
                  type="button"
                  className="text-sm underline decoration-line underline-offset-4"
                  onClick={() => setAdvanced((v) => !v)}
                >
                  {advanced ? "閉じる" : "開く"}
                </button>
              </div>
              {!advanced ? (
                <p className="mt-1 text-sm text-ink-muted">
                  課税明細書（住民税決定通知書）がお手元にある方向けです。
                  課税明細書の所得割額は、そのまま表に当てはめると誤った階層になります。
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {/* ★前処理の説明を、入力欄と同じ画面に必ず出す★ */}
                  <Callout tone="caution">
                    <p className="font-bold">入れる前に、この自治体の前処理をご確認ください</p>
                    <p className="mt-1">{m.bracketBasis.note}</p>
                    {m.bracketBasis.deductionsIgnored &&
                      m.bracketBasis.deductionsIgnored.length > 0 && (
                        <>
                          <p className="mt-2 font-medium">
                            この自治体が保育料の算定で適用しない控除
                          </p>
                          <ul className="mt-1 list-disc pl-5">
                            {m.bracketBasis.deductionsIgnored.map((d) => (
                              <li key={d}>{d}</li>
                            ))}
                          </ul>
                        </>
                      )}
                    <p className="mt-2 font-medium">どの年度の税額を使うか</p>
                    <p>{m.bracketBasis.taxYearRule}</p>
                  </Callout>
                  <NumberField
                    label="市町村民税所得割額（上の前処理を済ませた額・世帯の合計・年額）"
                    value={income}
                    min={0}
                    max={5000000}
                    step="100"
                    hint="換算や控除の扱いはこのツールでは行いません。上の説明のとおりに計算した額を入れてください"
                    onChange={(e) => setIncome(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          {taxStatus === "incomeTaxed" && !incomeUseful && (
            <Callout>
              {m.name}は、保育料の所得階層を分ける所得割額の境界を公表していません。
              そのため所得割額の入力欄は設けていません。
            </Callout>
          )}

          {/* ---------------------------------------- 結果 */}
          {r.fee !== null ? (
            <ResultCard
              label={`${m.name} / ${month.replace("-", "年")}月分の保育料（月額）`}
              value={r.fee === 0 ? "0" : yen(r.fee)}
              unit="円"
              note={
                r.basis === "amendmentFullFree"
                  ? "この月から全世帯の保育料が無償になります"
                  : r.basis === "age3plusFree"
                    ? m.freeTuition?.age3plusFree?.label ?? "3歳以上児は無償です"
                    : r.tier
                      ? `階層 ${r.tier.tier}${r.tier.label ? `（${r.tier.label}）` : ""}`
                      : "この自治体は全世帯の保育料が0円のため、階層によらず0円です"
              }
            />
          ) : r.tierIssue === "needIncome" && !advanced ? (
            /* まだ何も入れていない状態。エラーではないので情報として案内する */
            <Callout>
              <p className="font-bold">
                所得割が課税されている世帯の金額を出すには、所得割額が必要です
              </p>
              <p className="mt-1">
                課税明細書（住民税決定通知書）がお手元にあれば、上の「上級者向け」を開いてください。
                年収から所得割額を推計する機能は準備中です。住民税の非課税限度額・税率・控除の一次情報が
                まだ揃っておらず、推計すると階層をひとつ取り違えて月額が数千〜数万円ずれるためです。
                お手元にないときは{m.name}の窓口にご確認ください。
              </p>
            </Callout>
          ) : (
            <Callout tone="caution">
              <p className="font-bold">階層を特定できませんでした</p>
              <p className="mt-1">
                {r.tierIssue === "needIncome"
                  ? "前処理を済ませた所得割額を入れてください。"
                  : r.tierIssue === "noMatch"
                    ? "所得割が課税されている世帯の所得割額は1円以上です。0円の場合は「均等割のみ課税」か「住民税非課税」を選んでください。"
                    : "この自治体の公表資料では、この条件に当たる階層が確認できませんでした。"}
                {" "}
                近い階層に丸めることはしません。{m.name}の窓口にご確認ください。
              </p>
            </Callout>
          )}

          {/* ---------------------------------------- 無償化の根拠 */}
          {r.fee === 0 && m.freeTuition?.localExtension && (
            <div>
              <h2 className="text-base font-bold">なぜ0円なのか（根拠）</h2>
              <p className="mt-1 text-sm text-ink-muted">{m.freeTuition.localExtension}</p>
              <p className="mt-2 text-sm font-medium">出典</p>
              <SourceList m={m} />
            </div>
          )}

          {/* ---------------------------------------- 大阪の無償化予告 */}
          {r.upcomingFullFree && (
            <Callout>
              {formatJaDate(r.upcomingFullFree.effectiveFrom!)}から、{m.name}
              の保育料は全世帯で0円になる予定です。{r.upcomingFullFree.summary}
            </Callout>
          )}

          {/* ---------------------------------------- 多子軽減 */}
          {r.multiChild.kind === "free" && (
            <Callout>
              <p className="font-bold">
                {m.name}は第2子以降の保育料が0円です（上の金額は第1子の額です）
              </p>
              {r.multiChild.countingRule?.value ? (
                <p className="mt-1">
                  数え方: {String(r.multiChild.countingRule.value)}
                </p>
              ) : null}
            </Callout>
          )}
          {r.multiChild.kind === "described" && (
            <Callout tone="caution">
              <p className="font-bold">第2子以降の軽減後の金額は自動計算していません</p>
              <p className="mt-1">
                減額の方式も数え方も自治体ごとに違うため、原典の記述をそのままお伝えします。
                上の金額は第1子の額です。
              </p>
              {r.multiChild.secondChild?.value !== undefined && (
                <p className="mt-1">
                  第2子: {formatValueNode(r.multiChild.secondChild.value, r.multiChild.secondChild.unit)}
                </p>
              )}
              {r.multiChild.countingRule?.value ? (
                <p className="mt-1">数え方: {String(r.multiChild.countingRule.value)}</p>
              ) : (
                <p className="mt-1">数え方は、この自治体の公表資料では確認できていません。</p>
              )}
            </Callout>
          )}

          {/* ---------------------------------------- ひとり親等 */}
          {single && (
            <Callout>
              ひとり親世帯・在宅障害者等の軽減は、金額を自動計算していません。
              {m.name}の資料には次のように書かれています。窓口でご確認ください。
              <span className="mt-1 block text-ink-muted">{m.bracketBasis.note}</span>
            </Callout>
          )}

          {/* ---------------------------------------- 同居の祖父母 */}
          {hasGrandparents && (
            <Callout>
              <p className="font-bold">同居のご家族がいる場合、合算の対象が変わることがあります</p>
              <p className="mt-1">
                {m.bracketBasis.householdScope ??
                  "この自治体では、合算の対象になる世帯の範囲が公表されていません。窓口にご確認ください。"}
              </p>
            </Callout>
          )}

          {/* ---------------------------------------- 未確定データ */}
          {r.underReview.length > 0 && (
            <div className="rounded-card border border-caution/40 p-4 text-sm">
              <p className="font-bold">この自治体のデータで確認できていないこと</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-ink-muted">
                {r.underReview.map((a) => (
                  <li key={a.summary.slice(0, 24)}>{a.summary}</li>
                ))}
              </ul>
            </div>
          )}

          {/* ---------------------------------------- 含まれないもの */}
          <div>
            <h2 className="text-base font-bold">この金額に含まれないもの</h2>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink-muted">
              {m.scope.excludes.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>

          {/* ---------------------------------------- 出典 */}
          <div>
            <h2 className="text-base font-bold">この金額の出典</h2>
            <SourceList m={m} />
            <p className="mt-1 text-sm text-ink-muted">
              {basisYearLabel(m.fiscalYear)}のデータ（内容の確認日: {formatJaDate(m.asOf)}）
            </p>
          </div>

          {/* ---------------------------------------- 自治体の免責 */}
          <Callout>{m.disclaimer}</Callout>
        </>
      )}
    </div>
  );
}

/** 年月（YYYY-MM）が属する年度。表示用（計算は lib 側の fiscalYearOf を使う） */
function fiscalYearOfMonth(month: string): number {
  const [y, mo] = month.split("-").map(Number);
  return mo >= 4 ? y : y - 1;
}

/** valueNode の value（number 0／0.5+rate／長文string が混在する）を人間可読にする */
function formatValueNode(value: unknown, unit?: string): string {
  if (typeof value === "number") {
    if (unit === "rate") return `第1子の額の${value}倍（${value === 0.5 ? "半額" : `${value}倍`}）`;
    return `${yen(value)}円`;
  }
  return String(value);
}
