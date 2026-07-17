import { describe, expect, it } from "vitest";
import {
  calcAgeMonths,
  calcCorrectedAgeMonths,
  calcCorrectedAgeMonthsFromDueDate,
  calcMonthsEarlyFromWeeks,
  calcNextStageInfo,
  calculateRinyushokuRyo,
  determineStage,
  parseDate,
  type SimpleDate,
} from "@/components/tools/impl/RinyushokuRyo.calc";

/**
 * 仕様書 specs/b-tools/19-baby-food-amount-guide.md の「テストケース（12件）」を反映。
 * 基準日は仕様書の例と同じ 2026-07-17 に固定して、各行が指す「実行日の◯ヶ月◯日前」を
 * 実際のカレンダー日付に落とし込んでいる。
 */

const TODAY = "2026-07-17";

function d(value: string): SimpleDate {
  const parsed = parseDate(value);
  if (!parsed) throw new Error(`invalid date in test: ${value}`);
  return parsed;
}

describe("RinyushokuRyo.calc — 仕様書テストケース表（12件）", () => {
  it("#1 生年月日: 実行日の5ヶ月0日前 → STAGE_GOKKUN（離乳初期）、表Bの初期列を表示", () => {
    const r = calculateRinyushokuRyo({ birthDate: "2026-02-17", today: TODAY });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.actualAgeMonths).toBe(5);
    expect(r.result.stage.code).toBe("STAGE_GOKKUN");
    expect(r.result.stage.foodGroups?.grain).toMatch(/ひとさじ/);
  });

  it("#2 生年月日: 実行日の6ヶ月29日前（月は6ヶ月のまま切り捨て）→ STAGE_GOKKUNのまま（7ヶ月未達）", () => {
    const r = calculateRinyushokuRyo({ birthDate: "2025-12-18", today: TODAY });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.actualAgeMonths).toBe(6);
    expect(r.result.stage.code).toBe("STAGE_GOKKUN");
  });

  it("#3 生年月日: 実行日の7ヶ月0日前 → STAGE_MOGUMOGU（離乳中期）に切り替わる", () => {
    const r = calculateRinyushokuRyo({ birthDate: "2025-12-17", today: TODAY });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.actualAgeMonths).toBe(7);
    expect(r.result.stage.code).toBe("STAGE_MOGUMOGU");
  });

  it("#4 生年月日: 実行日の8ヶ月30日前 → STAGE_MOGUMOGUのまま", () => {
    const r = calculateRinyushokuRyo({ birthDate: "2025-10-18", today: TODAY });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.actualAgeMonths).toBe(8);
    expect(r.result.stage.code).toBe("STAGE_MOGUMOGU");
  });

  it("#5 生年月日: 実行日の9ヶ月0日前 → STAGE_KAMIKAMI（離乳後期）", () => {
    const r = calculateRinyushokuRyo({ birthDate: "2025-10-17", today: TODAY });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.actualAgeMonths).toBe(9);
    expect(r.result.stage.code).toBe("STAGE_KAMIKAMI");
  });

  it("#6 生年月日: 実行日の11ヶ月30日前 → STAGE_KAMIKAMIのまま", () => {
    const r = calculateRinyushokuRyo({ birthDate: "2025-07-18", today: TODAY });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.actualAgeMonths).toBe(11);
    expect(r.result.stage.code).toBe("STAGE_KAMIKAMI");
  });

  it("#7 生年月日: 実行日の12ヶ月0日前 → STAGE_PAKUPAKU（離乳完了期）", () => {
    const r = calculateRinyushokuRyo({ birthDate: "2025-07-17", today: TODAY });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.actualAgeMonths).toBe(12);
    expect(r.result.stage.code).toBe("STAGE_PAKUPAKU");
  });

  it("#8 生年月日: 実行日の18ヶ月0日前 → STAGE_PAKUPAKUのまま（境界内）", () => {
    const r = calculateRinyushokuRyo({ birthDate: "2025-01-17", today: TODAY });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.actualAgeMonths).toBe(18);
    expect(r.result.stage.code).toBe("STAGE_PAKUPAKU");
  });

  it("#9 生年月日: 実行日の19ヶ月0日前 → STAGE_AFTER（幼児食への移行期、データ範囲外の案内）", () => {
    const r = calculateRinyushokuRyo({ birthDate: "2024-12-17", today: TODAY });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.actualAgeMonths).toBe(19);
    expect(r.result.stage.code).toBe("STAGE_AFTER");
    expect(r.result.stage.foodGroups).toBeNull();
    expect(r.result.stage.message).toMatch(/データ範囲外/);
  });

  it("#10 生年月日: 実行日の4ヶ月0日前 → STAGE_BEFORE（開始前の目安メッセージのみ、量・固さ表は非表示）", () => {
    const r = calculateRinyushokuRyo({ birthDate: "2026-03-17", today: TODAY });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.actualAgeMonths).toBe(4);
    expect(r.result.stage.code).toBe("STAGE_BEFORE");
    expect(r.result.stage.foodGroups).toBeNull();
  });

  it("#11 実齢7ヶ月0日・在胎32週相当（早産8週）→ 修正月齢5ヶ月でSTAGE_GOKKUNとして表示、実齢7ヶ月も併記", () => {
    // 出産予定日は「在胎40週の時点」に相当するため、出産予定日−生年月日＝早産週数×7日。
    // 在胎32週（早産8週）相当を再現するため、生年月日+56日（8週）を出産予定日とする。
    const r = calculateRinyushokuRyo({
      birthDate: "2025-12-17",
      dueDate: "2026-02-11",
      today: TODAY,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.actualAgeMonths).toBe(7);
    expect(r.result.usingCorrectedAge).toBe(true);
    expect(r.result.correctedAgeMonths).toBe(5);
    expect(r.result.stage.code).toBe("STAGE_GOKKUN");

    // 仕様書のロジック仕様の式でも同じ結果になることを直接確認する
    // (weeks_early=8, round(8/4.345)=2, corrected=7-2=5)
    expect(calcCorrectedAgeMonths(7, 32)).toBe(5);
  });

  it("#12 生年月日に未来日を入力 → バリデーションエラー「生年月日をご確認ください」", () => {
    const r = calculateRinyushokuRyo({ birthDate: "2026-08-01", today: TODAY });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("生年月日をご確認ください");
  });
});

describe("RinyushokuRyo.calc — 補助関数", () => {
  it("parseDate: 不正な形式・存在しない日付は null", () => {
    expect(parseDate("2026-13-01")).toBeNull();
    expect(parseDate("2026-02-30")).toBeNull();
    expect(parseDate("not-a-date")).toBeNull();
    expect(parseDate("2026-07-17")).toEqual({ year: 2026, month: 7, day: 17 });
  });

  it("calcAgeMonths: 生年月日=基準日 → 0ヶ月", () => {
    expect(calcAgeMonths(d("2026-07-17"), d("2026-07-17"))).toBe(0);
  });

  it("calcAgeMonths: 応当日に届いていない月は切り捨てられる", () => {
    // 2026-01-20 → 2026-07-17 は6ヶ月と27日（1/20の応当日=7/20にまだ届いていない）
    expect(calcAgeMonths(d("2026-01-20"), d("2026-07-17"))).toBe(5);
  });

  it("determineStage: 境界値をすべて仕様書どおりに判定する", () => {
    expect(determineStage(0)).toBe("STAGE_BEFORE");
    expect(determineStage(4)).toBe("STAGE_BEFORE");
    expect(determineStage(5)).toBe("STAGE_GOKKUN");
    expect(determineStage(6)).toBe("STAGE_GOKKUN");
    expect(determineStage(7)).toBe("STAGE_MOGUMOGU");
    expect(determineStage(8)).toBe("STAGE_MOGUMOGU");
    expect(determineStage(9)).toBe("STAGE_KAMIKAMI");
    expect(determineStage(11)).toBe("STAGE_KAMIKAMI");
    expect(determineStage(12)).toBe("STAGE_PAKUPAKU");
    expect(determineStage(18)).toBe("STAGE_PAKUPAKU");
    expect(determineStage(19)).toBe("STAGE_AFTER");
    expect(determineStage(36)).toBe("STAGE_AFTER");
  });

  it("calcMonthsEarlyFromWeeks: 正期産・過期産（0週以下）は補正なし", () => {
    expect(calcMonthsEarlyFromWeeks(0)).toBe(0);
    expect(calcMonthsEarlyFromWeeks(-1)).toBe(0);
  });

  it("calcCorrectedAgeMonths: 満期（40週）は実齢のまま", () => {
    expect(calcCorrectedAgeMonths(10, 40)).toBe(10);
  });

  it("calcCorrectedAgeMonths: 過期産（41週）は実齢のまま", () => {
    expect(calcCorrectedAgeMonths(10, 41)).toBe(10);
  });

  it("calcCorrectedAgeMonths: 早産分が実齢を上回る場合は0ヶ月未満にならない", () => {
    expect(calcCorrectedAgeMonths(1, 22)).toBe(0);
  });

  it("calcCorrectedAgeMonthsFromDueDate: 出産予定日が生年月日以前（正期産扱い）なら実齢のまま", () => {
    expect(calcCorrectedAgeMonthsFromDueDate(d("2026-01-01"), d("2026-01-01"), 5)).toBe(5);
    expect(calcCorrectedAgeMonthsFromDueDate(d("2026-01-10"), d("2026-01-01"), 5)).toBe(5);
  });

  it("calcNextStageInfo: 段階の境界1ヶ月前のみ次段階のプレビューを返す", () => {
    expect(calcNextStageInfo(6, "STAGE_GOKKUN")).toEqual({
      stageCode: "STAGE_MOGUMOGU",
      label: "離乳中期（モグモグ期）",
      monthsRemaining: 1,
    });
    expect(calcNextStageInfo(5, "STAGE_GOKKUN")).toBeNull();
    expect(calcNextStageInfo(18, "STAGE_PAKUPAKU")).toEqual({
      stageCode: "STAGE_AFTER",
      label: "幼児食への移行期",
      monthsRemaining: 1,
    });
  });

  it("calcNextStageInfo: 次段階がない STAGE_AFTER は常に null", () => {
    expect(calcNextStageInfo(24, "STAGE_AFTER")).toBeNull();
  });

  it("weaningStarted=false の場合は月齢によらずSTAGE_BEFORE扱いになる", () => {
    const r = calculateRinyushokuRyo({
      birthDate: "2025-07-17",
      today: TODAY,
      weaningStarted: false,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.actualAgeMonths).toBe(12);
    expect(r.result.stage.code).toBe("STAGE_BEFORE");
    expect(r.result.nextStage).toBeNull();
  });

  it("月齢が36ヶ月を超える生年月日はバリデーションエラーになる", () => {
    const r = calculateRinyushokuRyo({ birthDate: "2023-01-01", today: TODAY });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("生年月日をご確認ください");
  });

  it("出産予定日の形式が不正な場合はエラーになる", () => {
    const r = calculateRinyushokuRyo({
      birthDate: "2026-01-01",
      dueDate: "not-a-date",
      today: TODAY,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("出産予定日をご確認ください");
  });
});
