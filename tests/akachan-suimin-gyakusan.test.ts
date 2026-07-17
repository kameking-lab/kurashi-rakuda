import { describe, expect, it } from "vitest";
import {
  calcAkachanSuiminGyakusan,
  parseHHMM,
  formatHHMM,
  formatDuration,
  CHILD_RECOMMENDATION_CATEGORIES,
  INFANT_UNDER_1_DATA,
  ADULT_REFERENCE,
  DEFAULT_OYA_HITSUYOU_JIKAN_H,
  AGE_BRACKET_OPTIONS,
} from "@/components/tools/impl/AkachanSuiminGyakusan.calc";

/*
 * 赤ちゃん連動 睡眠逆算（P2-T32）のテスト。
 * 仕様: specs/b-tools/p2-t32-akachan-suimin-gyakusan.md のテストケース表と対応。
 */

describe("parseHHMM / formatHHMM / formatDuration", () => {
  it("正しい HH:mm を分数に変換する", () => {
    expect(parseHHMM("20:00")).toBe(1200);
    expect(parseHHMM("00:00")).toBe(0);
    expect(parseHHMM("23:59")).toBe(1439);
  });

  it("不正な時刻文字列は null を返す", () => {
    expect(parseHHMM("25:00")).toBeNull();
    expect(parseHHMM("9:60")).toBeNull();
    expect(parseHHMM("abc")).toBeNull();
    expect(parseHHMM("")).toBeNull();
    expect(parseHHMM("24:00")).toBeNull();
  });

  it("分数を HH:mm 表示に変換する", () => {
    expect(formatHHMM(0)).toBe("00:00");
    expect(formatHHMM(1410)).toBe("23:30");
    expect(formatHHMM(45)).toBe("00:45");
  });

  it("分数を時間表示に変換する", () => {
    expect(formatDuration(660)).toBe("11時間");
    expect(formatDuration(690)).toBe("11時間30分");
    expect(formatDuration(45)).toBe("45分");
  });
});

describe("calcAkachanSuiminGyakusan", () => {
  it("#1 標準ケース・日をまたぐ・下限境界値（1〜2歳、11時間）", () => {
    const result = calcAkachanSuiminGyakusan({
      ageBracket: "TODDLER_1_2",
      nesetsukeJikoku: "20:00",
      kishouJikoku: "07:00",
      oyaHitsuyouJikanH: 7,
      bufferMin: 30,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.akachanSuimin.minutes).toBe(660);
    expect(result.akachanSuimin.label).toBe("11時間");
    expect(result.akachanSuimin.classification).toBe("WITHIN");
    expect(result.oyaShuushin.label).toBe("23:30");
    expect(result.oyaShuushin.dayOffset).toBe(0);
    expect(result.oyaShuushin.sufficientWindow).toBe(true);
  });

  it("#2 目安より短め・日付が変わったあと（3〜5歳）", () => {
    const result = calcAkachanSuiminGyakusan({
      ageBracket: "PRESCHOOL_3_5",
      nesetsukeJikoku: "21:00",
      kishouJikoku: "06:30",
      oyaHitsuyouJikanH: 6,
      bufferMin: 30,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.akachanSuimin.minutes).toBe(570);
    expect(result.akachanSuimin.classification).toBe("SHORT");
    expect(result.oyaShuushin.label).toBe("00:00");
    expect(result.oyaShuushin.dayOffset).toBe(1);
  });

  it("#3 目安より長め（小学生）", () => {
    const result = calcAkachanSuiminGyakusan({
      ageBracket: "ELEMENTARY",
      nesetsukeJikoku: "19:00",
      kishouJikoku: "08:00",
      oyaHitsuyouJikanH: 7,
      bufferMin: 15,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.akachanSuimin.minutes).toBe(780);
    expect(result.akachanSuimin.classification).toBe("LONG");
    expect(result.oyaShuushin.label).toBe("00:45");
    expect(result.oyaShuushin.dayOffset).toBe(1);
  });

  it("#4 バッファ0分（中学・高校生）", () => {
    const result = calcAkachanSuiminGyakusan({
      ageBracket: "JUNIOR_SENIOR_HIGH",
      nesetsukeJikoku: "23:00",
      kishouJikoku: "07:00",
      oyaHitsuyouJikanH: 8,
      bufferMin: 0,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.akachanSuimin.minutes).toBe(480);
    expect(result.akachanSuimin.classification).toBe("WITHIN");
    expect(result.oyaShuushin.label).toBe("23:00");
    expect(result.oyaShuushin.dayOffset).toBe(0);
  });

  it("#5 1歳未満は推奨レンジ比較を行わない（NOT_AVAILABLE）", () => {
    const result = calcAkachanSuiminGyakusan({
      ageBracket: "INFANT_UNDER_1",
      nesetsukeJikoku: "20:00",
      kishouJikoku: "06:00",
      oyaHitsuyouJikanH: 6,
      bufferMin: 30,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.akachanSuimin.minutes).toBe(600);
    expect(result.akachanSuimin.classification).toBe("NOT_AVAILABLE");
    expect(result.akachanSuimin.category).toBeNull();
    expect(result.oyaShuushin.label).toBe("23:30");
  });

  it("#6 昼寝的な同日内入力（日をまたがない）", () => {
    const result = calcAkachanSuiminGyakusan({
      ageBracket: "TODDLER_1_2",
      nesetsukeJikoku: "13:00",
      kishouJikoku: "15:00",
      oyaHitsuyouJikanH: 1,
      bufferMin: 0,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.akachanSuimin.minutes).toBe(120);
    expect(result.akachanSuimin.classification).toBe("SHORT");
    expect(result.oyaShuushin.label).toBe("14:00");
    expect(result.oyaShuushin.dayOffset).toBe(0);
  });

  it("#7 時間枠不足でも計算結果自体はエラーにせず sufficientWindow=false で返す", () => {
    const result = calcAkachanSuiminGyakusan({
      ageBracket: "TODDLER_1_2",
      nesetsukeJikoku: "20:00",
      kishouJikoku: "22:00",
      oyaHitsuyouJikanH: 10,
      bufferMin: 30,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.akachanSuimin.minutes).toBe(120);
    expect(result.oyaShuushin.label).toBe("11:30");
    expect(result.oyaShuushin.sufficientWindow).toBe(false);
  });

  it("#8 下限境界値＋sufficientWindowの境界（等号でtrue）", () => {
    const result = calcAkachanSuiminGyakusan({
      ageBracket: "ELEMENTARY",
      nesetsukeJikoku: "21:00",
      kishouJikoku: "06:00",
      oyaHitsuyouJikanH: 9,
      bufferMin: 0,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.akachanSuimin.minutes).toBe(540);
    expect(result.akachanSuimin.classification).toBe("WITHIN");
    expect(result.oyaShuushin.label).toBe("21:00");
    expect(result.oyaShuushin.dayOffset).toBe(0);
    expect(result.oyaShuushin.sufficientWindow).toBe(true);
  });

  it("#9 上限境界値（3〜5歳、13時間ちょうど）", () => {
    const result = calcAkachanSuiminGyakusan({
      ageBracket: "PRESCHOOL_3_5",
      nesetsukeJikoku: "20:00",
      kishouJikoku: "09:00",
      oyaHitsuyouJikanH: 6,
      bufferMin: 30,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.akachanSuimin.minutes).toBe(780);
    expect(result.akachanSuimin.classification).toBe("WITHIN");
    expect(result.oyaShuushin.label).toBe("02:30");
    expect(result.oyaShuushin.dayOffset).toBe(1);
  });

  it("#10 上限境界値（中学・高校生、10時間ちょうど）", () => {
    const result = calcAkachanSuiminGyakusan({
      ageBracket: "JUNIOR_SENIOR_HIGH",
      nesetsukeJikoku: "22:00",
      kishouJikoku: "08:00",
      oyaHitsuyouJikanH: 8,
      bufferMin: 0,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.akachanSuimin.minutes).toBe(600);
    expect(result.akachanSuimin.classification).toBe("WITHIN");
    expect(result.oyaShuushin.label).toBe("00:00");
    expect(result.oyaShuushin.dayOffset).toBe(1);
  });

  it("#11 就寝予定時刻＝起床予定時刻はエラー", () => {
    const result = calcAkachanSuiminGyakusan({
      ageBracket: "TODDLER_1_2",
      nesetsukeJikoku: "20:00",
      kishouJikoku: "20:00",
      oyaHitsuyouJikanH: 7,
      bufferMin: 30,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("同じ");
  });

  it("#12 不正な就寝予定時刻（時が24以上）はエラー", () => {
    const result = calcAkachanSuiminGyakusan({
      ageBracket: "TODDLER_1_2",
      nesetsukeJikoku: "25:00",
      kishouJikoku: "07:00",
      oyaHitsuyouJikanH: 7,
      bufferMin: 30,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("就寝予定時刻");
  });

  it("#13 不正な起床予定時刻（分が60以上）はエラー", () => {
    const result = calcAkachanSuiminGyakusan({
      ageBracket: "TODDLER_1_2",
      nesetsukeJikoku: "20:00",
      kishouJikoku: "9:60",
      oyaHitsuyouJikanH: 7,
      bufferMin: 30,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("起床予定時刻");
  });

  it("#14 数値でない起床予定時刻はエラー", () => {
    const result = calcAkachanSuiminGyakusan({
      ageBracket: "TODDLER_1_2",
      nesetsukeJikoku: "20:00",
      kishouJikoku: "abc",
      oyaHitsuyouJikanH: 7,
      bufferMin: 30,
    });
    expect(result.ok).toBe(false);
  });

  it("#15 保護者の必要睡眠時間が0以下はエラー", () => {
    const result = calcAkachanSuiminGyakusan({
      ageBracket: "TODDLER_1_2",
      nesetsukeJikoku: "20:00",
      kishouJikoku: "07:00",
      oyaHitsuyouJikanH: 0,
      bufferMin: 30,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("必要睡眠時間");
  });

  it("#16 保護者の必要睡眠時間が24を超えるとエラー", () => {
    const result = calcAkachanSuiminGyakusan({
      ageBracket: "TODDLER_1_2",
      nesetsukeJikoku: "20:00",
      kishouJikoku: "07:00",
      oyaHitsuyouJikanH: 25,
      bufferMin: 30,
    });
    expect(result.ok).toBe(false);
  });

  it("#17 バッファが負数はエラー", () => {
    const result = calcAkachanSuiminGyakusan({
      ageBracket: "TODDLER_1_2",
      nesetsukeJikoku: "20:00",
      kishouJikoku: "07:00",
      oyaHitsuyouJikanH: 7,
      bufferMin: -5,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("寝かしつけ");
  });

  it("#18 不明な年齢区分コードはエラー", () => {
    const result = calcAkachanSuiminGyakusan({
      // @ts-expect-error 意図的に不正な値を渡す
      ageBracket: "UNKNOWN",
      nesetsukeJikoku: "20:00",
      kishouJikoku: "07:00",
      oyaHitsuyouJikanH: 7,
      bufferMin: 30,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("年齢区分");
  });

  it("バリデーション: 必要睡眠時間がNaNはエラー", () => {
    const result = calcAkachanSuiminGyakusan({
      ageBracket: "TODDLER_1_2",
      nesetsukeJikoku: "20:00",
      kishouJikoku: "07:00",
      oyaHitsuyouJikanH: NaN,
      bufferMin: 30,
    });
    expect(result.ok).toBe(false);
  });

  it("バリデーション: バッファがNaNはエラー", () => {
    const result = calcAkachanSuiminGyakusan({
      ageBracket: "TODDLER_1_2",
      nesetsukeJikoku: "20:00",
      kishouJikoku: "07:00",
      oyaHitsuyouJikanH: 7,
      bufferMin: NaN,
    });
    expect(result.ok).toBe(false);
  });
});

describe("データ整合性（suimin-guide-2023.json との連携）", () => {
  it("推奨レンジの4区分が正しい値を持つ（厚労省ガイド2023の記載どおり）", () => {
    const byCode = Object.fromEntries(
      CHILD_RECOMMENDATION_CATEGORIES.map((c) => [c.code, c])
    );
    expect(byCode.TODDLER_1_2.hoursFrom).toBe(11);
    expect(byCode.TODDLER_1_2.hoursTo).toBe(14);
    expect(byCode.PRESCHOOL_3_5.hoursFrom).toBe(10);
    expect(byCode.PRESCHOOL_3_5.hoursTo).toBe(13);
    expect(byCode.ELEMENTARY.hoursFrom).toBe(9);
    expect(byCode.ELEMENTARY.hoursTo).toBe(12);
    expect(byCode.JUNIOR_SENIOR_HIGH.hoursFrom).toBe(8);
    expect(byCode.JUNIOR_SENIOR_HIGH.hoursTo).toBe(10);
  });

  it("1歳未満は時間数の推奨値を持たない（架空の数値を収録しない）", () => {
    expect(INFANT_UNDER_1_DATA.hoursFrom).toBeNull();
    expect(INFANT_UNDER_1_DATA.hoursTo).toBeNull();
    expect(INFANT_UNDER_1_DATA.qualitativeNotes.length).toBeGreaterThan(0);
  });

  it("成人（保護者自身）の目安は6時間以上、初期値も6時間", () => {
    expect(ADULT_REFERENCE.hoursFrom).toBe(6);
    expect(DEFAULT_OYA_HITSUYOU_JIKAN_H).toBe(6);
  });

  it("年齢区分の選択肢は1歳未満を含む5区分", () => {
    expect(AGE_BRACKET_OPTIONS).toHaveLength(5);
    expect(AGE_BRACKET_OPTIONS[0].code).toBe("INFANT_UNDER_1");
  });
});
