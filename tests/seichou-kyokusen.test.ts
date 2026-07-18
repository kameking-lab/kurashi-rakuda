import { describe, expect, it } from "vitest";
import data from "@/data/tables/seichou-hatsuiku-percentile.json";
import {
  bandsOf,
  calcSeichou,
  classifyPosition,
  findBand,
  MEASURE_KEYS,
  PERCENTILES,
  SEICHOU_SURVEY_YEAR,
} from "@/components/tools/impl/SeichouKyokusen.calc";

/** 仕様書 specs/s-tools/19-seichou-kyokusen.md のテストケース表を反映 */

describe("SeichouKyokusen.calc — データの整合", () => {
  it("#1 令和5年（2023年）調査・パーセンタイルは7区分", () => {
    expect(SEICHOU_SURVEY_YEAR).toBe(2023);
    expect(SEICHOU_SURVEY_YEAR).toBe(data.surveyYear);
    expect(PERCENTILES).toEqual([3, 10, 25, 50, 75, 90, 97]);
  });

  it("#2 測定項目は体重・身長・頭囲の3種", () => {
    expect(MEASURE_KEYS).toEqual(["weight", "height", "head"]);
  });

  it("#3 バンド数はデータと一致（体重24・身長24・頭囲17）", () => {
    expect(bandsOf("weight")).toHaveLength(24);
    expect(bandsOf("height")).toHaveLength(24);
    expect(bandsOf("head")).toHaveLength(17);
  });

  it("#4 各バンドの7値は単調増加（p3<...<p97・男女とも）", () => {
    for (const m of MEASURE_KEYS) {
      for (const b of bandsOf(m)) {
        for (const arr of [b.male, b.female]) {
          for (let i = 0; i < arr.length - 1; i++) {
            expect(arr[i]).toBeLessThan(arr[i + 1]);
          }
        }
      }
    }
  });

  it("#5 出生時（男子）の体重パーセンタイル値はデータ由来", () => {
    const b = findBand("weight", "birth");
    expect(b?.male).toEqual([2.32, 2.58, 2.8, 3.06, 3.31, 3.56, 3.81]);
  });

  it("#6 頭囲は2歳6〜12か月未満までしかない（原典の区分）", () => {
    const keys = bandsOf("head").map((b) => b.key);
    expect(keys[keys.length - 1]).toBe("y2_06_12");
    expect(keys).not.toContain("y3_00_06");
  });
});

describe("SeichouKyokusen.calc — classifyPosition", () => {
  const vals = [2.32, 2.58, 2.8, 3.06, 3.31, 3.56, 3.81]; // 出生時・男子・体重

  it("#7 p3未満は below", () => {
    const p = classifyPosition(2.0, vals);
    expect(p.zone).toBe("below");
    expect(p.label).toContain("3パーセンタイル未満");
  });

  it("#8 p97以上は above", () => {
    const p = classifyPosition(4.0, vals);
    expect(p.zone).toBe("above");
    expect(p.label).toContain("97パーセンタイル以上");
  });

  it("#9 p25〜p50の間", () => {
    const p = classifyPosition(2.9, vals); // 2.8(p25) <= 2.9 < 3.06(p50)
    expect(p.zone).toBe("between");
    expect(p.lowerPercentile).toBe(25);
    expect(p.upperPercentile).toBe(50);
  });

  it("#10 中央値ちょうどはp50〜p75の間（p50値以上）", () => {
    const p = classifyPosition(3.06, vals);
    expect(p.zone).toBe("between");
    expect(p.lowerPercentile).toBe(50);
    expect(p.diffFromMedian).toBe(0);
  });

  it("#11 p97ちょうどは above（境界は上側に含む）", () => {
    const p = classifyPosition(3.81, vals);
    expect(p.zone).toBe("above");
  });

  it("#12 p3ちょうどは below ではない（p3〜p10の間）", () => {
    const p = classifyPosition(2.32, vals);
    expect(p.zone).toBe("between");
    expect(p.lowerPercentile).toBe(3);
  });

  it("#13 中央値との差を返す", () => {
    const p = classifyPosition(3.31, vals);
    expect(p.diffFromMedian).toBe(0.25); // 3.31 − 3.06
  });
});

describe("SeichouKyokusen.calc — calcSeichou 統合", () => {
  it("#14 体重・男子・出生時・3.5kg → p75〜p90の間", () => {
    const r = calcSeichou({ measure: "weight", sex: "male", bandKey: "birth", value: 3.5 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.position.lowerPercentile).toBe(75);
    expect(r.position.upperPercentile).toBe(90);
    expect(r.median).toBe(3.06);
  });

  it("#15 身長・男子・1歳0〜6か月・76.5cm → 中央値ちょうど", () => {
    const r = calcSeichou({ measure: "height", sex: "male", bandKey: "y1_00_06", value: 76.5 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.median).toBe(76.5);
    expect(r.position.diffFromMedian).toBe(0);
  });

  it("#16 頭囲・男子・生後30日・36.0cm はデータ由来の中央値と一致", () => {
    const r = calcSeichou({ measure: "head", sex: "male", bandKey: "d30", value: 36.8 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.values).toEqual([34.4, 35.2, 36.0, 36.8, 37.6, 38.3, 38.9]);
    expect(r.median).toBe(36.8);
  });

  it("#17 プロット比率: 最小値で0・最大値以上で1にクランプ", () => {
    const r = calcSeichou({ measure: "weight", sex: "male", bandKey: "birth", value: 2.32 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.plotRatio).toBe(0);
    expect(r.markerRatios[0]).toBe(0);
    expect(r.markerRatios[r.markerRatios.length - 1]).toBe(1);
  });

  it("#18 女子は女子のパーセンタイル値を使う", () => {
    const r = calcSeichou({ measure: "weight", sex: "female", bandKey: "m05_06", value: 7.1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.values).toEqual([5.79, 6.2, 6.63, 7.1, 7.59, 8.03, 8.46]);
  });
});

describe("SeichouKyokusen.calc — バリデーション", () => {
  it("#19 不正な測定項目はエラー", () => {
    // @ts-expect-error 故意に不正
    expect(calcSeichou({ measure: "bmi", sex: "male", bandKey: "birth", value: 3 }).ok).toBe(false);
  });
  it("#20 存在しないバンドはエラー", () => {
    expect(calcSeichou({ measure: "weight", sex: "male", bandKey: "y9_00_06", value: 3 }).ok).toBe(false);
  });
  it("#21 実測値0以下はエラー", () => {
    expect(calcSeichou({ measure: "weight", sex: "male", bandKey: "birth", value: 0 }).ok).toBe(false);
  });
  it("#22 頭囲に体重のバンドを渡しても頭囲のバンドで判定（measure基準）", () => {
    const r = calcSeichou({ measure: "head", sex: "male", bandKey: "birth", value: 33.7 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.unit).toBe("cm");
  });
});
