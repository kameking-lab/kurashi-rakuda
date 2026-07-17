/**
 * 復職後の手取りシミュレーター（時短 × 社保 × 保育料の複合）の計算ロジック
 * （specs/s-tools/07-fukushoku-tedori-simu.md）。
 *
 * ★このツールの存在理由★
 *   育休から復職して時短で働くと、次の4つが同時に動くため「毎月いくら手元に残るのか」が
 *   1画面で分からない。
 *     1. 賃金そのものが減る（時短の比率に応じて）
 *     2. 育児時短就業給付金が乗る（2025年4月創設・賃金の10%・非課税）
 *     3. 社会保険料は時短にしてもすぐには下がらない（標準報酬月額は翌月に自動で下がらない）
 *     4. 保育料が引かれる（★前年＝育休前のフル収入の課税額で決まるため復職直後は高め★）
 *
 *   #78「時短勤務の給料・給付シミュレーター」は 1〜3 までで、保育料を含まない（射程外）。
 *   本ツール（#56）は 4 の保育料を差し引いた「手元に残る額」まで一本のタイムラインに載せる。
 *
 * ★設計上の要点★
 *   - 1〜3（賃金・社会保険料・育児時短就業給付・随時改定の前後の2シナリオ・8/1改定での停止）は
 *     すべて検証済みの jitan-kyuyo エンジンに委譲する。ここで制度計算を書き直さない。
 *   - 保育料（4）は★利用者が入力する実額★とする。年収→所得割→階層→保育料の推計は
 *     「推計値」であり（保育料計算ツールが担当）、それを手取りの実数に積み上げると
 *     YMYL 上の誤差が複利で乗るため、本ツールでは推計を手取りに合成しない。
 *     保育料の金額は保育料計算ツールで求めて持ち込む導線を UI で用意する。
 *   - ここに制度の数値をハードコードしない（保育料は制度値ではなく利用者入力の実額）。
 */

import ikukyu from "@/data/seido/ikukyu-kyufu.json";
import {
  simulate as simulateJitan,
  type JitanInput,
  type JitanResult,
  type TakehomeScenario,
} from "@/lib/tools/impl/jitan-kyuyo";

export {
  ikukyuKyufuDataset,
  SUPPORT_LIMIT,
  MINIMUM_AMOUNT,
  BENEFIT_TAX_EXEMPT,
  type InputMode,
  type InsuredMonths12,
} from "@/lib/tools/impl/jitan-kyuyo";

/**
 * 給付が非課税であること（＝翌年の住民税・保育料の算定基礎に入らない）の根拠ノート。
 * 根拠: ikukyu-kyufu.json の data.handoriJuwariSoutou.taxExempt.note
 * ★これがあるため、収入が下がっていれば翌年度の保育料改定（多くの自治体で9月）で
 *   保育料が下がる要因になる。断定はせず「下がる要因になる」の含みで扱う。★
 */
export const BENEFIT_TAX_EXEMPT_NOTE: string = ikukyu.data.handoriJuwariSoutou.taxExempt.note;

/** 保育料入力の上限（入力バリデーションの都合。制度の数値ではない） */
export const MAX_HOIKURYO_INPUT = 200_000;

export interface FukushokuInput extends JitanInput {
  /** 復職直後に実際に支払う保育料の月額（利用者が入力／保育料計算ツールで取得）。円・0以上 */
  hoikuryoMonthly: number;
}

/** 保育料入力のバリデーションエラー（jitan の ValidationError とは別建て） */
export interface HoikuryoError {
  field: "hoikuryoMonthly";
  message: string;
}

export function validateHoikuryo(value: number): HoikuryoError[] {
  const e: HoikuryoError[] = [];
  if (!Number.isFinite(value) || value < 0) {
    e.push({ field: "hoikuryoMonthly", message: "保育料は0円以上で入力してください。" });
  } else if (value > MAX_HOIKURYO_INPUT) {
    e.push({
      field: "hoikuryoMonthly",
      message: `保育料は ${MAX_HOIKURYO_INPUT.toLocaleString("ja-JP")} 円までで入力してください。`,
    });
  }
  return e;
}

export interface FukushokuScenario {
  /** jitan の手取りシナリオ（賃金 − 社会保険料 ＋ 給付。社会保険料の算定基礎が2通り） */
  base: TakehomeScenario;
  /** 差し引く保育料月額 */
  hoikuryo: number;
  /**
   * 保育料まで差し引いた「1か月に手元へ残る額」（税引前）。
   * 給付が算定できない月（base.monthlyTotal が null）は net も null。
   */
  net: number | null;
}

export interface FukushokuResult extends JitanResult {
  /** 実際に差し引いた保育料月額（バリデーションNGのときは0扱い） */
  hoikuryoMonthly: number;
  /** 保育料入力のエラー（UI は jitan の errors と合わせて表示する） */
  hoikuryoErrors: HoikuryoError[];
  /** 時短直後・随時改定後それぞれから保育料を差し引いたシナリオ */
  scenarios: FukushokuScenario[];
  /** 比較用: 時短前（フルタイム・社保も時短前）の税引前手取りから保育料を差し引いた額 */
  beforeJitanNet: number;
}

/**
 * 復職後の手取り（保育料まで差し引いた手元に残る額）を算定する。
 *
 * 賃金・社会保険料・育児時短就業給付・8/1のデータ期限切れによる停止は jitan-kyuyo に委譲し、
 * その各シナリオから保育料を差し引く。保育料は制度計算せず、利用者入力の実額をそのまま引く。
 */
export function simulate(input: FukushokuInput): FukushokuResult {
  const jitan = simulateJitan(input);
  const hoikuryoErrors = validateHoikuryo(input.hoikuryoMonthly);
  const hoikuryo =
    hoikuryoErrors.length === 0 ? Math.floor(input.hoikuryoMonthly) : 0;

  const scenarios: FukushokuScenario[] = jitan.takehome.map((base) => ({
    base,
    hoikuryo,
    net: base.monthlyTotal === null ? null : base.monthlyTotal - hoikuryo,
  }));

  return {
    ...jitan,
    hoikuryoMonthly: hoikuryo,
    hoikuryoErrors,
    scenarios,
    beforeJitanNet: jitan.beforeJitanTakehome - hoikuryo,
  };
}
