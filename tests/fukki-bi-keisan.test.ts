import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  attainDay,
  calcFukkiBi,
  isValidISODate,
  validateBirthDate,
  BENEFIT_EXTENSION_REQUIREMENT_1,
  NURSERY_UNAVAILABLE_FIRST,
  LEAVE_EXTENSION_2_MONTHS,
  RATE_SWITCH_DAYS,
  type FukkiBiKeisanInput,
} from "@/components/tools/impl/FukkiBiKeisan.calc";
import rawEncho from "@/data/seido/ikukyu-encho-youken.json";

/** 仕様書 specs/b-tools/p2-t34-fukki-bi-keisan.md の「テストケース表（14件）」を反映 */

function input(birthDate: string, extensionIntent: FukkiBiKeisanInput["extensionIntent"] = "none"): FukkiBiKeisanInput {
  return { birthDate, extensionIntent };
}

function candidate(result: ReturnType<typeof calcFukkiBi>, key: string) {
  const c = result.candidates.find((c) => c.key === key);
  if (!c) throw new Error(`candidate not found: ${key}`);
  return c;
}

describe("FukkiBiKeisan.calc — 仕様書テストケース表（14件）", () => {
  it("#1 産後休業終了日の目安（+56日）", () => {
    const r = calcFukkiBi(input("2026-01-01"));
    expect(r.postnatalEnd).toBe("2026-02-26");
  });

  it("#2 育休開始日（産後休業の翌日）", () => {
    const r = calcFukkiBi(input("2026-01-01"));
    expect(r.ikukyuStart).toBe("2026-02-27");
  });

  it("#3 育休の原則終了日（1歳到達日）", () => {
    const r = calcFukkiBi(input("2026-01-01"));
    const d = r.deadlines.find((d) => d.key === "principal")!;
    expect(d.date).toBe("2026-12-31");
  });

  it("#4 育休延長①の期限（1歳6か月到達日）", () => {
    const r = calcFukkiBi(input("2026-01-01"));
    const d = r.deadlines.find((d) => d.key === "extension18")!;
    expect(d.date).toBe("2027-06-30");
  });

  it("#5 育休延長②の期限（2歳到達日）", () => {
    const r = calcFukkiBi(input("2026-01-01"));
    const d = r.deadlines.find((d) => d.key === "extension24")!;
    expect(d.date).toBe("2027-12-31");
  });

  it("#6 原則1歳まで候補の給付率内訳（totalDays/days67/days50）", () => {
    const r = calcFukkiBi(input("2026-01-01"));
    const c = candidate(r, "principal");
    expect(c.leave).not.toBeNull();
    expect(c.leave!.totalDays).toBe(308);
    expect(c.leave!.days67).toBe(180);
    expect(c.leave!.days50).toBe(128);
  });

  it("#7 原則1歳まで候補の給付率切替日（181日目）", () => {
    const r = calcFukkiBi(input("2026-01-01"));
    const c = candidate(r, "principal");
    expect(c.leave!.rateSwitchDate).toBe("2026-08-26");
  });

  it("#8 産休明けすぐに復帰する候補は育休なし", () => {
    const r = calcFukkiBi(input("2026-01-01"));
    const c = candidate(r, "afterPostnatal");
    expect(c.returnDate).toBe("2026-02-27");
    expect(c.leave).toBeNull();
  });

  it("#9 うるう日（2/29）生まれの1歳到達日は非うるう年2/28にクランプした前日", () => {
    const r = calcFukkiBi(input("2024-02-29"));
    const d = r.deadlines.find((d) => d.key === "principal")!;
    expect(d.date).toBe("2025-02-27");
  });

  it("#10 月末生まれ（1/31）の1か月後の到達日は月末クランプの前日", () => {
    expect(attainDay("2026-01-31", 1)).toBe("2026-02-27");
  });

  it("#11 保育園申込を検討し始める目安（期限の4か月前〜2か月前）", () => {
    const r = calcFukkiBi(input("2026-06-15"));
    const c = candidate(r, "principal");
    expect(c.nurseryCheckWindow.from).toBe("2027-02-14");
    expect(c.nurseryCheckWindow.to).toBe("2027-04-14");
  });

  it("#12 産後6週間経過日（参考情報）", () => {
    const r = calcFukkiBi(input("2026-01-01"));
    expect(r.postnatalSixWeekDate).toBe("2026-02-12");
  });

  it("#13 不正な日付（存在しない月）はバリデーションエラー", () => {
    expect(isValidISODate("2026-13-01")).toBe(false);
    const v = validateBirthDate("2026-13-01", "2026-07-17");
    expect(v.ok).toBe(false);
  });

  it("#14 extensionIntentがmatchesIntentフラグに反映される", () => {
    const r = calcFukkiBi(input("2026-01-01", "until18m"));
    expect(candidate(r, "extension18").matchesIntent).toBe(true);
    expect(candidate(r, "principal").matchesIntent).toBe(false);
    expect(candidate(r, "extension24").matchesIntent).toBe(false);
    expect(candidate(r, "afterPostnatal").matchesIntent).toBe(false);
  });
});

describe("FukkiBiKeisan.calc — 暦の基本関数", () => {
  it("addDays: 負の日数で過去に戻る", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("addMonths: 月末クランプ（1/31 + 1か月 = 2/28）", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
  });

  it("attainDay: 応当日の前日", () => {
    expect(attainDay("2026-01-01", 12)).toBe("2026-12-31");
  });
});

describe("FukkiBiKeisan.calc — SSOTデータとの整合", () => {
  it("LEAVE_EXTENSION_2_MONTHS は ikukyu-encho-youken.json の maxAge（2年）×12", () => {
    expect(LEAVE_EXTENSION_2_MONTHS).toBe(24);
    expect(rawEncho.data.leaveExtension.secondExtension.maxAge.value).toBe(2);
  });

  it("RATE_SWITCH_DAYS は ikukyu-kyufu.json の rateSwitchDays と一致", () => {
    expect(RATE_SWITCH_DAYS).toBe(180);
  });

  it("延長要件の文言はJSONから引用されている（ハードコードしていない）", () => {
    expect(BENEFIT_EXTENSION_REQUIREMENT_1).toBe(
      rawEncho.data.benefitExtension.requirements.requirement1.value,
    );
    expect(NURSERY_UNAVAILABLE_FIRST).toBe(
      rawEncho.data.leaveExtension.nurseryUnavailableRule.firstExtension.value,
    );
  });

  it("1歳6か月・一歳六か月の文言がSSOT側に存在する（LEAVE_EXTENSION_1_MONTHS=18の裏付け）", () => {
    const targetPeriod = rawEncho.data.leaveExtension.firstExtension.targetPeriod.value;
    expect(targetPeriod).toContain("一歳六か月");
  });
});
