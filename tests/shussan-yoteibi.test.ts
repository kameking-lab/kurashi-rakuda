import { describe, expect, it } from "vitest";
import {
  addDays,
  calcDueDate,
  calcGestationalWeek,
  calcPregnancyMonth,
  calcPregnancyPeriod,
  calcRemainingDays,
  calcShussanYoteibi,
  diffInDays,
  formatJapaneseDate,
  validateShussanYoteibiInput,
} from "@/components/tools/impl/ShussanYoteibi.calc";

/*
 * 仕様: specs/b-tools/01-due-date-pregnancy-week-calculator.md「テストケース（12件）」を反映。
 * 加えて、妊娠期の境界・バリデーションの追加境界値を補強する。
 */

describe("calcShussanYoteibi — 仕様書テストケース表", () => {
  it("#1 基準値。LMP当日=0週0日・初期", () => {
    const r = calcShussanYoteibi({
      lmp: "2026-01-01",
      cycleLength: 28,
      baseDate: "2026-01-01",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dueDate).toBe("2026-10-08");
    expect(r.weeksLabel).toBe("0週0日");
    expect(r.period).toBe("初期");
  });

  it("#2 経過90日の週数変換確認（12週6日）", () => {
    const r = calcShussanYoteibi({
      lmp: "2026-01-01",
      cycleLength: 28,
      baseDate: "2026-04-01",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dueDate).toBe("2026-10-08");
    expect(r.diffDays).toBe(90);
    expect(r.weeksLabel).toBe("12週6日");
    expect(r.period).toBe("初期");
  });

  it("#3 初期→中期の境界（14週0日）", () => {
    const r = calcShussanYoteibi({
      lmp: "2026-01-01",
      cycleLength: 28,
      baseDate: "2026-04-09",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.weeksLabel).toBe("14週0日");
    expect(r.period).toBe("中期");
  });

  it("#4 中期直前（境界の1日前・13週6日は初期のまま）", () => {
    const r = calcShussanYoteibi({
      lmp: "2026-01-01",
      cycleLength: 28,
      baseDate: "2026-04-08",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.weeksLabel).toBe("13週6日");
    expect(r.period).toBe("初期");
  });

  it("#5 中期→後期の境界（28週0日）", () => {
    const r = calcShussanYoteibi({
      lmp: "2026-01-01",
      cycleLength: 28,
      baseDate: "2026-07-16",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.weeksLabel).toBe("28週0日");
    expect(r.period).toBe("後期");
  });

  it("#6 EDD当日到達。残り日数0日", () => {
    const r = calcShussanYoteibi({
      lmp: "2026-01-01",
      cycleLength: 28,
      baseDate: "2026-10-08",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.weeksLabel).toBe("40週0日");
    expect(r.period).toBe("後期");
    expect(r.remainingDays).toBe(0);
    expect(r.overdue).toBe(false);
  });

  it("#7 EDD超過（294日超）→超過注意書き表示", () => {
    const r = calcShussanYoteibi({
      lmp: "2026-01-01",
      cycleLength: 28,
      baseDate: "2026-11-05",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dueDate).toBe("2026-10-08");
    expect(r.weeksLabel).toBe("44週0日");
    expect(r.period).toBe("後期");
    expect(r.pastDueDateNotice).toBe(true);
    expect(r.overdue).toBe(true);
  });

  it("#8 周期補正 +7日（35日周期・280+7=287日）", () => {
    const r = calcShussanYoteibi({
      lmp: "2026-03-10",
      cycleLength: 35,
      baseDate: "2026-03-10",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dueDate).toBe("2026-12-22");
    expect(r.weeksLabel).toBe("0週0日");
    expect(r.period).toBe("初期");
  });

  it("#9 周期補正 −7日（21日周期・下限21・280−7=273日）", () => {
    const r = calcShussanYoteibi({
      lmp: "2026-03-10",
      cycleLength: 21,
      baseDate: "2026-03-10",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dueDate).toBe("2026-12-08");
    expect(r.weeksLabel).toBe("0週0日");
    expect(r.period).toBe("初期");
  });

  it("#10 月末日LMP。暦日数加算のみで繰り上げ処理不要", () => {
    const r = calcShussanYoteibi({
      lmp: "2026-01-31",
      cycleLength: 28,
      baseDate: "2026-01-31",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dueDate).toBe("2026-11-07");
    expect(r.weeksLabel).toBe("0週0日");
    expect(r.period).toBe("初期");
  });

  it("#11 うるう年（2028年）の2月29日をまたぐ期間を含む", () => {
    const r = calcShussanYoteibi({
      lmp: "2027-05-20",
      cycleLength: 28,
      baseDate: "2027-05-20",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dueDate).toBe("2028-02-24");
    expect(r.weeksLabel).toBe("0週0日");
    expect(r.period).toBe("初期");
  });

  it("#12 バリデーションエラー：周期日数が範囲外（15日）", () => {
    const r = calcShussanYoteibi({
      lmp: "2026-04-01",
      cycleLength: 15,
      baseDate: "2026-04-01",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toBe("周期日数は20〜45の整数で入力してください");
  });
});

describe("calcShussanYoteibi — エッジケース・バリデーション追加分", () => {
  it("baseDate が lmp より前はエラー", () => {
    const r = calcShussanYoteibi({
      lmp: "2026-05-01",
      cycleLength: 28,
      baseDate: "2026-04-01",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toBe("基準日は最終月経開始日より後の日付を指定してください");
  });

  it("lmp が baseDate から330日以上前は入力範囲外エラー", () => {
    const r = calcShussanYoteibi({
      lmp: "2025-01-01",
      cycleLength: 28,
      baseDate: "2026-01-01", // 365日差 >= 330
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toBe("入力範囲外です。日付をご確認ください");
  });

  it("周期日数が上限45はエラーにならない（境界値）", () => {
    const r = calcShussanYoteibi({
      lmp: "2026-01-01",
      cycleLength: 45,
      baseDate: "2026-01-01",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dueDate).toBe(addDays("2026-01-01", 280 + (45 - 28)));
  });

  it("周期日数が46は範囲外エラー（上限超過）", () => {
    const r = calcShussanYoteibi({
      lmp: "2026-01-01",
      cycleLength: 46,
      baseDate: "2026-01-01",
    });
    expect(r.ok).toBe(false);
  });

  it("周期日数が19は範囲外エラー（下限未満）", () => {
    const r = calcShussanYoteibi({
      lmp: "2026-01-01",
      cycleLength: 19,
      baseDate: "2026-01-01",
    });
    expect(r.ok).toBe(false);
  });

  it("knownEdd 指定時はネーゲレ計算をスキップし、その日付をそのままEDDとして使う", () => {
    const r = calcShussanYoteibi({
      lmp: "2026-01-01",
      cycleLength: 28,
      baseDate: "2026-04-01",
      knownEdd: "2026-10-15",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dueDate).toBe("2026-10-15");
    // effectiveLmp = knownEdd - 280日 で再計算される
    expect(r.effectiveLmp).toBe(addDays("2026-10-15", -280));
  });
});

describe("calcDueDate — ネーゲレ概算法（単体）", () => {
  it("既定周期28日は280日固定加算", () => {
    expect(calcDueDate("2026-01-01").dueDate).toBe("2026-10-08");
    expect(calcDueDate("2026-01-01").correctionDays).toBe(0);
  });

  it("周期30日は+2日補正", () => {
    expect(calcDueDate("2026-01-01", 30).correctionDays).toBe(2);
    expect(calcDueDate("2026-01-01", 30).dueDate).toBe(addDays("2026-01-01", 282));
  });
});

describe("calcGestationalWeek", () => {
  it("経過日数から週数・日数を正しく分解する", () => {
    const r = calcGestationalWeek("2026-01-01", "2026-04-01");
    expect(r.diffDays).toBe(90);
    expect(r.weeks).toBe(12);
    expect(r.days).toBe(6);
    expect(r.label).toBe("12週6日");
  });

  it("diffDays=0はちょうど0週0日", () => {
    const r = calcGestationalWeek("2026-01-01", "2026-01-01");
    expect(r.diffDays).toBe(0);
    expect(r.weeks).toBe(0);
    expect(r.days).toBe(0);
  });
});

describe("calcPregnancyMonth", () => {
  it("0〜3週6日は1ヶ月", () => {
    expect(calcPregnancyMonth(0)).toBe(1);
    expect(calcPregnancyMonth(3)).toBe(1);
  });
  it("36〜39週は10ヶ月", () => {
    expect(calcPregnancyMonth(36)).toBe(10);
    expect(calcPregnancyMonth(39)).toBe(10);
  });
  it("40週以降は月数表示なし（null）", () => {
    expect(calcPregnancyMonth(40)).toBeNull();
    expect(calcPregnancyMonth(44)).toBeNull();
  });
});

describe("calcPregnancyPeriod", () => {
  it("97日は初期、98日は中期（境界）", () => {
    expect(calcPregnancyPeriod(97)).toBe("初期");
    expect(calcPregnancyPeriod(98)).toBe("中期");
  });
  it("195日は中期、196日は後期（境界）", () => {
    expect(calcPregnancyPeriod(195)).toBe("中期");
    expect(calcPregnancyPeriod(196)).toBe("後期");
  });
});

describe("calcRemainingDays", () => {
  it("EDD未到達は残り日数を正の値で返す", () => {
    const r = calcRemainingDays("2026-10-08", "2026-04-01");
    expect(r.overdue).toBe(false);
    expect(r.remainingDays).toBe(diffInDays("2026-10-08", "2026-04-01"));
  });
  it("EDD経過後は絶対値＋overdue=trueを返す", () => {
    const r = calcRemainingDays("2026-10-08", "2026-10-15");
    expect(r.overdue).toBe(true);
    expect(r.remainingDays).toBe(7);
  });
});

describe("validateShussanYoteibiInput", () => {
  it("正常な入力ではnullを返す", () => {
    expect(
      validateShussanYoteibiInput({
        lmp: "2026-01-01",
        cycleLength: 28,
        baseDate: "2026-04-01",
      }),
    ).toBeNull();
  });
});

describe("日付ユーティリティ", () => {
  it("formatJapaneseDate は YYYY年M月D日 形式に変換する", () => {
    expect(formatJapaneseDate("2026-10-08")).toBe("2026年10月8日");
  });
  it("addDays / diffInDays は往復して一致する", () => {
    const next = addDays("2026-01-31", 280);
    expect(diffInDays(next, "2026-01-31")).toBe(280);
  });
});

describe("G2検収指摘の回帰テスト（異常入力の防御）", () => {
  it("不正な日付文字列（abc）は NaN を返さずエラーになる", () => {
    const r = calcShussanYoteibi({ lmp: "abc", baseDate: "2026-07-17" });
    expect(r.ok).toBe(false);
  });

  it("実在しない日付（2026-02-30）はエラーになる", () => {
    const r = calcShussanYoteibi({ lmp: "2026-02-30", baseDate: "2026-07-17" });
    expect(r.ok).toBe(false);
  });

  it("小数の周期日数（28.5）はエラーになる", () => {
    const r = calcShussanYoteibi({ lmp: "2026-05-01", baseDate: "2026-07-17", cycleLength: 28.5 });
    expect(r.ok).toBe(false);
  });
});
