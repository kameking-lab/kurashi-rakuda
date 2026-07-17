import { describe, expect, it } from "vitest";
import {
  calcShinchoYosoku,
  FATHER_HEIGHT_MAX,
  FATHER_HEIGHT_MIN,
  MARGIN_CM,
  MOTHER_HEIGHT_MAX,
  MOTHER_HEIGHT_MIN,
  validateShinchoYosokuInput,
} from "@/components/tools/impl/ShinchoYosoku.calc";

/*
 * 仕様: specs/b-tools/22-height-prediction.md「テストケース（12件）」を反映。
 * 加えて、極端な入力値の注意表示・境界値のバリデーションを補強する。
 */

describe("calcShinchoYosoku — 仕様書テストケース表", () => {
  it("#1 男児・父180/母160 → 176.5cm（167.5〜185.5）", () => {
    const r = calcShinchoYosoku({
      sex: "male",
      fatherHeightCm: 180,
      motherHeightCm: 160,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.predictedHeightCm).toBe(176.5);
    expect(r.rangeLowCm).toBe(167.5);
    expect(r.rangeHighCm).toBe(185.5);
  });

  it("#2 女児・父180/母160 → 163.5cm（154.5〜172.5）", () => {
    const r = calcShinchoYosoku({
      sex: "female",
      fatherHeightCm: 180,
      motherHeightCm: 160,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.predictedHeightCm).toBe(163.5);
    expect(r.rangeLowCm).toBe(154.5);
    expect(r.rangeHighCm).toBe(172.5);
  });

  it("#3 男児・父170/母155 → 169.0cm（160.0〜178.0）", () => {
    const r = calcShinchoYosoku({
      sex: "male",
      fatherHeightCm: 170,
      motherHeightCm: 155,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.predictedHeightCm).toBe(169);
    expect(r.rangeLowCm).toBe(160);
    expect(r.rangeHighCm).toBe(178);
  });

  it("#4 女児・父170/母155 → 156.0cm（147.0〜165.0）", () => {
    const r = calcShinchoYosoku({
      sex: "female",
      fatherHeightCm: 170,
      motherHeightCm: 155,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.predictedHeightCm).toBe(156);
    expect(r.rangeLowCm).toBe(147);
    expect(r.rangeHighCm).toBe(165);
  });

  it("#5 男児・父165/母150 → 164.0cm（155.0〜173.0）", () => {
    const r = calcShinchoYosoku({
      sex: "male",
      fatherHeightCm: 165,
      motherHeightCm: 150,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.predictedHeightCm).toBe(164);
    expect(r.rangeLowCm).toBe(155);
    expect(r.rangeHighCm).toBe(173);
  });

  it("#6 女児・父165/母150 → 151.0cm（142.0〜160.0）", () => {
    const r = calcShinchoYosoku({
      sex: "female",
      fatherHeightCm: 165,
      motherHeightCm: 150,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.predictedHeightCm).toBe(151);
    expect(r.rangeLowCm).toBe(142);
    expect(r.rangeHighCm).toBe(160);
  });

  it("#7 男児・父100(下限)/母100(下限) → 106.5cm（97.5〜115.5）", () => {
    const r = calcShinchoYosoku({
      sex: "male",
      fatherHeightCm: 100,
      motherHeightCm: 100,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.predictedHeightCm).toBe(106.5);
    expect(r.rangeLowCm).toBe(97.5);
    expect(r.rangeHighCm).toBe(115.5);
  });

  it("#8 女児・父250(上限)/母220(上限) → 228.5cm（219.5〜237.5）・注意表示あり", () => {
    const r = calcShinchoYosoku({
      sex: "female",
      fatherHeightCm: 250,
      motherHeightCm: 220,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.predictedHeightCm).toBe(228.5);
    expect(r.rangeLowCm).toBe(219.5);
    expect(r.rangeHighCm).toBe(237.5);
    expect(r.extremeInputNotice).toBe(true);
  });

  it("#9 男児・父95(下限未満)/母160 → 入力エラー（父親の身長範囲外）", () => {
    const r = calcShinchoYosoku({
      sex: "male",
      fatherHeightCm: 95,
      motherHeightCm: 160,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toBe("父親の身長は100〜250cmで入力してください");
  });

  it("#10 性別未選択・父175/母160 → 入力エラー（性別未選択）", () => {
    const r = calcShinchoYosoku({
      sex: "",
      fatherHeightCm: 175,
      motherHeightCm: 160,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toBe("性別を選択してください");
  });

  it("#11 男児・父175.5/母162.3 → 175.4cm（166.4〜184.4）小数入力", () => {
    const r = calcShinchoYosoku({
      sex: "male",
      fatherHeightCm: 175.5,
      motherHeightCm: 162.3,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.predictedHeightCm).toBe(175.4);
    expect(r.rangeLowCm).toBe(166.4);
    expect(r.rangeHighCm).toBe(184.4);
  });

  it("#12 男児・父170/母170（同身長） → 176.5cm（167.5〜185.5）", () => {
    const r = calcShinchoYosoku({
      sex: "male",
      fatherHeightCm: 170,
      motherHeightCm: 170,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.predictedHeightCm).toBe(176.5);
    expect(r.rangeLowCm).toBe(167.5);
    expect(r.rangeHighCm).toBe(185.5);
  });
});

describe("calcShinchoYosoku — エッジケース・バリデーション追加分", () => {
  it("父親の身長が未入力（null）はエラー", () => {
    const r = calcShinchoYosoku({
      sex: "male",
      fatherHeightCm: null,
      motherHeightCm: 160,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toBe("父親の身長を入力してください");
  });

  it("母親の身長が未入力（null）はエラー", () => {
    const r = calcShinchoYosoku({
      sex: "male",
      fatherHeightCm: 175,
      motherHeightCm: null,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toBe("母親の身長を入力してください");
  });

  it("母親の身長が上限超過（221cm）はエラー", () => {
    const r = calcShinchoYosoku({
      sex: "female",
      fatherHeightCm: 175,
      motherHeightCm: 221,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toBe("母親の身長は100〜220cmで入力してください");
  });

  it("父親の身長が上限ちょうど（250cm）はエラーにならない（境界値）", () => {
    const r = calcShinchoYosoku({
      sex: "male",
      fatherHeightCm: FATHER_HEIGHT_MAX,
      motherHeightCm: 160,
    });
    expect(r.ok).toBe(true);
  });

  it("父親の身長が下限ちょうど（100cm）はエラーにならない（境界値）", () => {
    const r = calcShinchoYosoku({
      sex: "male",
      fatherHeightCm: FATHER_HEIGHT_MIN,
      motherHeightCm: 160,
    });
    expect(r.ok).toBe(true);
  });

  it("母親の身長が下限ちょうど（100cm）・上限ちょうど（220cm）はエラーにならない（境界値）", () => {
    const low = calcShinchoYosoku({
      sex: "male",
      fatherHeightCm: 175,
      motherHeightCm: MOTHER_HEIGHT_MIN,
    });
    const high = calcShinchoYosoku({
      sex: "male",
      fatherHeightCm: 175,
      motherHeightCm: MOTHER_HEIGHT_MAX,
    });
    expect(low.ok).toBe(true);
    expect(high.ok).toBe(true);
  });

  it("極端な入力値でない通常の組み合わせは注意表示なし", () => {
    const r = calcShinchoYosoku({
      sex: "male",
      fatherHeightCm: 175,
      motherHeightCm: 160,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.extremeInputNotice).toBe(false);
  });

  it("参考誤差幅は仕様どおり±9cm", () => {
    expect(MARGIN_CM).toBe(9);
  });
});

describe("validateShinchoYosokuInput", () => {
  it("正常な入力ではnullを返す", () => {
    expect(
      validateShinchoYosokuInput({
        sex: "male",
        fatherHeightCm: 175,
        motherHeightCm: 160,
      }),
    ).toBeNull();
  });

  it("性別が未選択（空文字）はエラーメッセージを返す", () => {
    expect(
      validateShinchoYosokuInput({
        sex: "",
        fatherHeightCm: 175,
        motherHeightCm: 160,
      }),
    ).toBe("性別を選択してください");
  });
});
