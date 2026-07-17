import { describe, expect, it } from "vitest";
import {
  calcSangoTetsuzuki,
  calcShusshoTodokeDeadline,
  calcJidoTeateDeadline,
  calcIchijikinDeadline,
  periodEndAfterMonths,
  validateBirthDate,
  isBirthDateFarInFuture,
  isBirthDateVeryOld,
  ikukyuKyufuDataset,
  ICHIJIKIN_CLAIM_DEADLINE_TEXT,
  ICHIJIKIN_CLAIM_YEARS,
  SHUSSHO_DOMESTIC_DAYS,
  SHUSSHO_ABROAD_MONTHS,
  SHUSSHO_START_OF_PERIOD_NOTE,
} from "@/components/tools/impl/SangoTetsuzukiChecklist.calc";
import { isDataExpired } from "@/lib/tools/seido";

describe("sango-tetsuzuki-checklist: 出生届（国内・14日、起算日=出生日当日）", () => {
  it("4/1生まれ → 期限は4/14（データのnote例示と一致）", () => {
    expect(calcShusshoTodokeDeadline("2026-04-01", "domestic")).toBe("2026-04-14");
  });

  it("1/1生まれ → 期限は1/14", () => {
    expect(calcShusshoTodokeDeadline("2026-01-01", "domestic")).toBe("2026-01-14");
  });

  it("SHUSSHO_DOMESTIC_DAYS はデータ由来の14である", () => {
    expect(SHUSSHO_DOMESTIC_DAYS).toBe(14);
  });

  it("起算日ルールの説明文（note）に「出生した日を1日目」の趣旨が含まれる", () => {
    expect(SHUSSHO_START_OF_PERIOD_NOTE).toContain("1日目");
  });
});

describe("sango-tetsuzuki-checklist: 出生届（国外・3か月、応当日方式）", () => {
  it("SHUSSHO_ABROAD_MONTHS はデータ由来の3である", () => {
    expect(SHUSSHO_ABROAD_MONTHS).toBe(3);
  });

  it("4/1生まれ → 応当日7/1の前日=6/30が期限", () => {
    expect(calcShusshoTodokeDeadline("2026-04-01", "abroad")).toBe("2026-06-30");
  });

  it("11/30生まれ（平年をまたぐ）→ 応当日なし→2月末日(28日)が期限", () => {
    expect(calcShusshoTodokeDeadline("2025-11-30", "abroad")).toBe("2026-02-28");
  });

  it("11/30生まれ（うるう年をまたぐ）→ 応当日なし→2月末日(29日)が期限", () => {
    expect(calcShusshoTodokeDeadline("2027-11-30", "abroad")).toBe("2028-02-29");
  });

  it("periodEndAfterMonths: 応当日が存在する通常ケース", () => {
    expect(periodEndAfterMonths("2026-01-15", 1)).toBe("2026-02-14");
  });
});

describe("sango-tetsuzuki-checklist: 児童手当（15日特例、起算日=出生日の翌日）", () => {
  it("4/1生まれ → 翌日4/2起算 → 15日目の4/16が期限", () => {
    expect(calcJidoTeateDeadline("2026-04-01")).toBe("2026-04-16");
  });

  it("12/31生まれ（年またぎ）→ 翌年1/15が期限", () => {
    expect(calcJidoTeateDeadline("2026-12-31")).toBe("2027-01-15");
  });

  it("location（国内/国外）に関わらず期限は同じ", () => {
    const r1 = calcSangoTetsuzuki({ birthDate: "2026-04-01", location: "domestic", today: "2026-04-01" });
    const r2 = calcSangoTetsuzuki({ birthDate: "2026-04-01", location: "abroad", today: "2026-04-01" });
    const jt1 = r1.procedures.find((p) => p.key === "jido-teate");
    const jt2 = r2.procedures.find((p) => p.key === "jido-teate");
    expect(jt1?.deadlineDate).toBe(jt2?.deadlineDate);
  });
});

describe("sango-tetsuzuki-checklist: 出産育児一時金（2年、起算日=翌日、応当日方式）", () => {
  it("ICHIJIKIN_CLAIM_DEADLINE_TEXT に「2年」を含む（データ変更時の追随漏れ検知）", () => {
    expect(ICHIJIKIN_CLAIM_DEADLINE_TEXT).toContain("2年");
    expect(ICHIJIKIN_CLAIM_DEADLINE_TEXT).toContain("翌日");
    expect(ICHIJIKIN_CLAIM_YEARS).toBe(2);
  });

  it("4/1生まれ → 翌日4/2起算 → 2年後の応当日4/2の前日=2028-04-01が期限", () => {
    expect(calcIchijikinDeadline("2026-04-01")).toBe("2028-04-01");
  });

  it("2/29生まれ（うるう日）→ 翌日3/1起算 → 2年後の応当日3/1の前日=2030-02-28が期限", () => {
    expect(calcIchijikinDeadline("2028-02-29")).toBe("2030-02-28");
  });
});

describe("sango-tetsuzuki-checklist: 総合結果のソート順", () => {
  it("国内出生: 出生届(4/14) → 児童手当(4/16) → 一時金(2028-04-01) の順", () => {
    const r = calcSangoTetsuzuki({ birthDate: "2026-04-01", location: "domestic", today: "2026-04-01" });
    expect(r.procedures.map((p) => p.key)).toEqual([
      "shussho-todoke",
      "jido-teate",
      "shussan-ichijikin",
    ]);
    expect(r.procedures.map((p) => p.deadlineDate)).toEqual([
      "2026-04-14",
      "2026-04-16",
      "2028-04-01",
    ]);
  });

  it("国外出生: 児童手当(4/16) → 出生届(6/30) → 一時金(2028-04-01) の順（並び順が変わる）", () => {
    const r = calcSangoTetsuzuki({ birthDate: "2026-04-01", location: "abroad", today: "2026-04-01" });
    expect(r.procedures.map((p) => p.key)).toEqual([
      "jido-teate",
      "shussho-todoke",
      "shussan-ichijikin",
    ]);
  });
});

describe("sango-tetsuzuki-checklist: バリデーション", () => {
  it("実在しない日付（2/30）は不正", () => {
    expect(validateBirthDate("2026-02-30").ok).toBe(false);
  });

  it("形式不正（スラッシュ区切り）は不正", () => {
    expect(validateBirthDate("2026/04/01").ok).toBe(false);
  });

  it("正常な日付はok", () => {
    expect(validateBirthDate("2026-04-01").ok).toBe(true);
  });

  it("うるう年の2/29は正常な日付", () => {
    expect(validateBirthDate("2028-02-29").ok).toBe(true);
  });

  it("平年の2/29は不正な日付", () => {
    expect(validateBirthDate("2026-02-29").ok).toBe(false);
  });
});

describe("sango-tetsuzuki-checklist: 残り日数・期限超過", () => {
  it("期限より前ならoverdue=false・daysRemainingは正", () => {
    const r = calcSangoTetsuzuki({ birthDate: "2026-04-01", location: "domestic", today: "2026-04-10" });
    const shussho = r.procedures.find((p) => p.key === "shussho-todoke");
    expect(shussho?.overdue).toBe(false);
    expect(shussho?.daysRemaining).toBe(4);
  });

  it("期限を過ぎるとoverdue=true・daysRemainingは負", () => {
    const r = calcSangoTetsuzuki({ birthDate: "2026-04-01", location: "domestic", today: "2026-04-20" });
    const shussho = r.procedures.find((p) => p.key === "shussho-todoke");
    expect(shussho?.overdue).toBe(true);
    expect(shussho?.daysRemaining).toBeLessThan(0);
  });

  it("期限日当日はoverdue=false・daysRemaining=0", () => {
    const r = calcSangoTetsuzuki({ birthDate: "2026-04-01", location: "domestic", today: "2026-04-14" });
    const shussho = r.procedures.find((p) => p.key === "shussho-todoke");
    expect(shussho?.overdue).toBe(false);
    expect(shussho?.daysRemaining).toBe(0);
  });
});

describe("sango-tetsuzuki-checklist: ソフト警告", () => {
  it("出生日が1年以上先はfar-in-future警告", () => {
    expect(isBirthDateFarInFuture("2027-08-01", "2026-07-17")).toBe(true);
  });

  it("出生日が今日から1年未満先なら警告なし", () => {
    expect(isBirthDateFarInFuture("2027-01-01", "2026-07-17")).toBe(false);
  });

  it("出生日が2年以上前はvery-old警告", () => {
    expect(isBirthDateVeryOld("2024-01-01", "2026-07-17")).toBe(true);
  });

  it("出生日が2年未満前なら警告なし", () => {
    expect(isBirthDateVeryOld("2025-01-01", "2026-07-17")).toBe(false);
  });
});

describe("sango-tetsuzuki-checklist: 制度データの鮮度チェック", () => {
  it("ikukyu-kyufu.json の expiresOn(2026-07-31) を過ぎると expired=true になる", () => {
    expect(isDataExpired(ikukyuKyufuDataset, "2026-08-01")).toBe(true);
    const r = calcSangoTetsuzuki({ birthDate: "2026-04-01", location: "domestic", today: "2026-08-01" });
    expect(r.expired).toBe(true);
    expect(r.procedures).toEqual([]);
  });

  it("expiresOnより前は expired=false", () => {
    const r = calcSangoTetsuzuki({ birthDate: "2026-04-01", location: "domestic", today: "2026-07-17" });
    expect(r.expired).toBe(false);
    expect(r.procedures.length).toBe(3);
  });
});
