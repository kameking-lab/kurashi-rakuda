/*
 * 子どもの身長予測（両親身長法）— 計算ロジック（純関数）。
 * 仕様: specs/b-tools/22-height-prediction.md
 *
 * 両親身長法（Mid-Parental Height法の通称）は小児科領域・育児メディアで
 * 広く紹介されている統計的な経験式であり、断定的な予測ではない。
 * 式とターゲットレンジの出典: Ogata T, Tanaka T, Kagami M.
 * "Target Height and Target Range for Japanese Children: Revisited."
 * Clin Pediatr Endocrinol 2007;16(4):85-87. doi:10.1297/cpe.16.85
 * （https://www.jstage.jst.go.jp/article/cpe/16/4/16_4_85/_article）
 * 男児 TH={PH+(MH+13)}/2, TR=TH±9cm ／ 女児 TH={(PH−13)+MH}/2, TR=TH±8cm。
 * 医学的な低身長・成長障害の診断や判定は一切行わない。
 */

export type ShinchoSex = "male" | "female";

export const FATHER_HEIGHT_MIN = 100;
export const FATHER_HEIGHT_MAX = 250;
export const MOTHER_HEIGHT_MIN = 100;
export const MOTHER_HEIGHT_MAX = 220;

/** 参考誤差幅（±cm・男児）。Ogata et al. 2007 のターゲットレンジ。保証ではない */
export const MARGIN_CM_MALE = 9;
/** 参考誤差幅（±cm・女児）。同上（女児は±8cm。男児と異なる点に注意） */
export const MARGIN_CM_FEMALE = 8;

export interface ShinchoYosokuInput {
  /** 子の性別。男児/女児のいずれか必須 */
  sex: ShinchoSex | "";
  /** 父親の身長（cm）。100.0〜250.0 */
  fatherHeightCm: number | null;
  /** 母親の身長（cm）。100.0〜220.0 */
  motherHeightCm: number | null;
}

export interface ShinchoYosokuResult {
  ok: true;
  /** 予測身長（目安・cm、小数第1位。四捨五入しない単純な割り算の結果） */
  predictedHeightCm: number;
  /** 参考レンジ下限（cm） */
  rangeLowCm: number;
  /** 参考レンジ上限（cm） */
  rangeHighCm: number;
  /** 適用した参考誤差幅（±cm。男児9／女児8） */
  marginCm: number;
  /** 極端な入力値（現実的にまれな組み合わせ）の場合に注意表示を出すフラグ */
  extremeInputNotice: boolean;
}

export interface ShinchoYosokuError {
  ok: false;
  message: string;
}

/**
 * 入力バリデーション。問題なければ null、エラーならメッセージを返す。
 * 父親・母親の身長は両方必須、性別も必須（未選択はエラー）。
 */
export function validateShinchoYosokuInput(
  input: ShinchoYosokuInput,
): string | null {
  if (input.sex !== "male" && input.sex !== "female") {
    return "性別を選択してください";
  }
  if (input.fatherHeightCm === null || Number.isNaN(input.fatherHeightCm)) {
    return "父親の身長を入力してください";
  }
  if (
    input.fatherHeightCm < FATHER_HEIGHT_MIN ||
    input.fatherHeightCm > FATHER_HEIGHT_MAX
  ) {
    return `父親の身長は${FATHER_HEIGHT_MIN}〜${FATHER_HEIGHT_MAX}cmで入力してください`;
  }
  if (input.motherHeightCm === null || Number.isNaN(input.motherHeightCm)) {
    return "母親の身長を入力してください";
  }
  if (
    input.motherHeightCm < MOTHER_HEIGHT_MIN ||
    input.motherHeightCm > MOTHER_HEIGHT_MAX
  ) {
    return `母親の身長は${MOTHER_HEIGHT_MIN}〜${MOTHER_HEIGHT_MAX}cmで入力してください`;
  }
  return null;
}

/** 父親の身長が入力上限に近い（現実的にまれ）とみなす閾値 */
const FATHER_EXTREME_THRESHOLD = 240;
/** 母親の身長が入力上限に近い（現実的にまれ）とみなす閾値 */
const MOTHER_EXTREME_THRESHOLD = 210;
/** 父親・母親の身長差が現実的にまれとみなす閾値 */
const HEIGHT_GAP_EXTREME_THRESHOLD = 40;

/**
 * 極端な入力値（現実的にまれな組み合わせ）かどうかの簡易判定。
 * 例: 父親250cm・母親100cm等、入力上限に近い身長や身長差が極端に大きい組み合わせ。
 * エラーにはしないが、結果画面に注意表示を出す。
 */
function isExtremeInput(fatherHeightCm: number, motherHeightCm: number): boolean {
  return (
    fatherHeightCm >= FATHER_EXTREME_THRESHOLD ||
    motherHeightCm >= MOTHER_EXTREME_THRESHOLD ||
    Math.abs(fatherHeightCm - motherHeightCm) >= HEIGHT_GAP_EXTREME_THRESHOLD
  );
}

/**
 * 両親身長法（Mid-Parental Height法の通称）による予測身長の計算。
 * 男児 = (父親の身長 + 母親の身長 + 13) / 2
 * 女児 = (父親の身長 + 母親の身長 − 13) / 2
 * 計算結果は小数第1位まで（四捨五入しない。単純な割り算の結果をそのまま表示）。
 * 参考レンジは 男児±9cm／女児±8cm（Ogata et al. 2007。保証ではなく目安幅）。
 */
export function calcShinchoYosoku(
  input: ShinchoYosokuInput,
): ShinchoYosokuResult | ShinchoYosokuError {
  const validationMessage = validateShinchoYosokuInput(input);
  if (validationMessage) {
    return { ok: false, message: validationMessage };
  }

  // バリデーション済みのため non-null が保証される
  const sex = input.sex as ShinchoSex;
  const father = input.fatherHeightCm as number;
  const mother = input.motherHeightCm as number;

  const raw =
    sex === "male" ? (father + mother + 13) / 2 : (father + mother - 13) / 2;
  const marginCm = sex === "male" ? MARGIN_CM_MALE : MARGIN_CM_FEMALE;
  const predictedHeightCm = Math.trunc(raw * 10) / 10;

  return {
    ok: true,
    predictedHeightCm,
    rangeLowCm: Math.trunc((raw - marginCm) * 10) / 10,
    rangeHighCm: Math.trunc((raw + marginCm) * 10) / 10,
    marginCm,
    extremeInputNotice: isExtremeInput(father, mother),
  };
}
