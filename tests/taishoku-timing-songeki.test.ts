import { describe, expect, it } from "vitest";
import seido from "@/data/seido/taishoku-timing-songeki.json";
import {
  calcTaishokuTiming,
  juuminzeiRule,
  lookupKyufuNissuu,
  RESTRICTION_MONTHS_JIKO,
  WAITING_DAYS,
} from "@/components/tools/impl/TaishokuTimingSongeki.calc";

/** 仕様書 specs/s-tools/17-taishoku-timing-songeki.md のテストケース表を反映 */

describe("TaishokuTimingSongeki.calc — 定数はJSON由来", () => {
  it("#1 待期7日・自己都合の給付制限1か月", () => {
    expect(WAITING_DAYS).toBe(seido.data.koyouHoken.taikiKikan.value);
    expect(WAITING_DAYS).toBe(7);
    expect(RESTRICTION_MONTHS_JIKO).toBe(1);
  });
});

describe("TaishokuTimingSongeki.calc — 社会保険料（月末退職の判定）", () => {
  it("#2 3月31日退職は月末退職 → 資格喪失4/1・退職月社保は会社経由", () => {
    const r = calcTaishokuTiming({ resignDate: "2026-03-31", reason: "jiko-tsugou", age: 40, insuredYears: 3 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.isMonthEnd).toBe(true);
    expect(r.shikakuSoushitsu).toEqual({ y: 2026, m: 4, d: 1 });
    expect(r.resignMonthShahoViaCompany).toBe(true);
  });

  it("#3 3月30日退職は月末以外 → 資格喪失3/31・退職月社保は会社経由でない", () => {
    const r = calcTaishokuTiming({ resignDate: "2026-03-30", reason: "jiko-tsugou", age: 40, insuredYears: 3 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.isMonthEnd).toBe(false);
    expect(r.shikakuSoushitsu).toEqual({ y: 2026, m: 3, d: 31 });
    expect(r.resignMonthShahoViaCompany).toBe(false);
  });

  it("#4 2月末（平年28日）も月末退職と判定", () => {
    const r = calcTaishokuTiming({ resignDate: "2026-02-28", reason: "jiko-tsugou", age: 40, insuredYears: 3 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.isMonthEnd).toBe(true);
    expect(r.shikakuSoushitsu).toEqual({ y: 2026, m: 3, d: 1 });
  });
});

describe("TaishokuTimingSongeki.calc — 住民税の一括徴収", () => {
  it("#5 1〜4月退職は強制一括", () => {
    for (const m of [1, 2, 3, 4]) expect(juuminzeiRule(m)).toBe("forced-lump");
  });
  it("#6 5月退職は限度あり", () => {
    expect(juuminzeiRule(5)).toBe("may-limit");
  });
  it("#7 6〜12月退職は申出で一括（原則は普通徴収）", () => {
    for (const m of [6, 8, 12]) expect(juuminzeiRule(m)).toBe("optional-lump");
  });
  it("#8 退職月に応じた住民税テキストが返る", () => {
    const r = calcTaishokuTiming({ resignDate: "2026-08-15", reason: "jiko-tsugou", age: 40, insuredYears: 3 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.juuminzeiRule).toBe("optional-lump");
    expect(r.juuminzeiText).toContain("普通徴収");
  });
});

describe("TaishokuTimingSongeki.calc — 雇用保険 所定給付日数", () => {
  it("#9 自己都合・被保険者3年 → 90日（1〜10年は同値）", () => {
    expect(lookupKyufuNissuu("jiko-tsugou", 40, 3)?.days).toBe(90);
  });
  it("#10 自己都合・被保険者12年 → 120日", () => {
    expect(lookupKyufuNissuu("jiko-tsugou", 40, 12)?.days).toBe(120);
  });
  it("#11 自己都合・被保険者25年 → 150日（一般の最大）", () => {
    expect(lookupKyufuNissuu("jiko-tsugou", 40, 25)?.days).toBe(150);
  });
  it("#12 会社都合・46歳・12年 → 270日（45〜60歳・10〜20年）", () => {
    expect(lookupKyufuNissuu("kaisha-tsugou", 46, 12)?.days).toBe(270);
  });
  it("#13 会社都合・46歳・25年 → 330日（最大・就職困難者を除く）", () => {
    expect(lookupKyufuNissuu("kaisha-tsugou", 46, 25)?.days).toBe(330);
  });
  it("#14 就職困難者・50歳・6年 → 360日（制度全体の最大）", () => {
    expect(lookupKyufuNissuu("shuushoku-konnan", 50, 6)?.days).toBe(360);
  });
  it("#15 会社都合・29歳・被保険者0.5年 → 90日", () => {
    expect(lookupKyufuNissuu("kaisha-tsugou", 29, 0.5)?.days).toBe(90);
  });
  it("#16 会社都合・29歳・20年以上は原典で該当なし（null）", () => {
    expect(lookupKyufuNissuu("kaisha-tsugou", 29, 22)?.days).toBeNull();
  });
});

describe("TaishokuTimingSongeki.calc — 給付制限と統合", () => {
  it("#17 自己都合は給付制限1か月", () => {
    const r = calcTaishokuTiming({ resignDate: "2026-08-31", reason: "jiko-tsugou", age: 40, insuredYears: 3 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.restrictionMonths).toBe(1);
    expect(r.waitingDays).toBe(7);
  });
  it("#18 会社都合は給付制限なし（0か月）", () => {
    const r = calcTaishokuTiming({ resignDate: "2026-08-31", reason: "kaisha-tsugou", age: 46, insuredYears: 12 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.restrictionMonths).toBe(0);
    expect(r.kyufu?.days).toBe(270);
  });
  it("#19 不正な日付はエラー", () => {
    expect(calcTaishokuTiming({ resignDate: "2026-02-30", reason: "jiko-tsugou", age: 40, insuredYears: 3 }).ok).toBe(false);
  });
  it("#20 年齢マイナスはエラー", () => {
    expect(calcTaishokuTiming({ resignDate: "2026-03-31", reason: "jiko-tsugou", age: -1, insuredYears: 3 }).ok).toBe(false);
  });
});
