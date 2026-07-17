import { describe, expect, it } from "vitest";
import {
  calcAge,
  calcJoseiKenshinSchedule,
  extractAgeRange,
  extractFirstAge,
  isValidDateString,
  judgeAllScreenings,
  judgeScreening,
  SCREENING_DEFS,
} from "@/components/tools/impl/JoseiKenshinSchedule.calc";

/** 仕様書 specs/b-tools/p2-t33-josei-kenshin-schedule.md の「テストケース表」を反映 */

const BASE = "2026-07-17";

describe("JoseiKenshinSchedule.calc — 仕様書テストケース表", () => {
  it("#1 生年月日=1976-07-17（基準日と同月日、50歳） → 胃がん検診は対象（境界値ちょうど）", () => {
    const r = calcJoseiKenshinSchedule({ birthDate: "1976-07-17" }, BASE);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.age).toBe(50);
    const stomach = r.result.judgements.find((j) => j.id === "stomach");
    expect(stomach?.status).toBe("eligible");
  });

  it("#2 生年月日=1976-07-18（誕生日は基準日の1日後、49歳） → 胃がん検診はあと1年で対象", () => {
    const r = calcJoseiKenshinSchedule({ birthDate: "1976-07-18" }, BASE);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.age).toBe(49);
    const stomach = r.result.judgements.find((j) => j.id === "stomach");
    expect(stomach?.status).toBe("notYetEligible");
    expect(stomach?.yearsUntilEligible).toBe(1);
  });

  it("#3 生年月日=2006-07-17（20歳） → 子宮頸がん検診は対象、乳がん検診はあと20年", () => {
    const r = calcJoseiKenshinSchedule({ birthDate: "2006-07-17" }, BASE);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.age).toBe(20);
    expect(r.result.judgements.find((j) => j.id === "cervical")?.status).toBe("eligible");
    const breast = r.result.judgements.find((j) => j.id === "breast");
    expect(breast?.status).toBe("notYetEligible");
    expect(breast?.yearsUntilEligible).toBe(20);
  });

  it("#4 生年月日=1986-07-17（40歳） → 乳・肺・大腸・特定健診は対象", () => {
    const r = calcJoseiKenshinSchedule({ birthDate: "1986-07-17" }, BASE);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.age).toBe(40);
    for (const id of ["breast", "lung", "colorectal", "specificHealthCheckup"] as const) {
      expect(r.result.judgements.find((j) => j.id === id)?.status).toBe("eligible");
    }
  });

  it("#5 生年月日=1952-07-17（74歳） → 特定健診は対象（上限ちょうど）、後期高齢者健診はあと1年", () => {
    const r = calcJoseiKenshinSchedule({ birthDate: "1952-07-17" }, BASE);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.age).toBe(74);
    expect(r.result.judgements.find((j) => j.id === "specificHealthCheckup")?.status).toBe(
      "eligible",
    );
    const elderly = r.result.judgements.find((j) => j.id === "elderlyHealthCheckup");
    expect(elderly?.status).toBe("notYetEligible");
    expect(elderly?.yearsUntilEligible).toBe(1);
  });

  it("#6 生年月日=1951-07-17（75歳） → 特定健診は対象外、後期高齢者健診は対象に切り替わる", () => {
    const r = calcJoseiKenshinSchedule({ birthDate: "1951-07-17" }, BASE);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.age).toBe(75);
    expect(r.result.judgements.find((j) => j.id === "specificHealthCheckup")?.status).toBe(
      "notEligible",
    );
    expect(r.result.judgements.find((j) => j.id === "elderlyHealthCheckup")?.status).toBe(
      "eligible",
    );
  });

  it("#7 生年月日=2026-07-17（0歳、基準日と同日） → 全検診があと◯年で対象", () => {
    const r = calcJoseiKenshinSchedule({ birthDate: "2026-07-17" }, BASE);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.age).toBe(0);
    expect(r.result.judgements.every((j) => j.status === "notYetEligible")).toBe(true);
    expect(r.result.judgements.find((j) => j.id === "cervical")?.yearsUntilEligible).toBe(20);
  });

  it("#8 生年月日が基準日より後（未来日） → エラー", () => {
    const r = calcJoseiKenshinSchedule({ birthDate: "2026-07-18" }, BASE);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toBe("生年月日が今日より後の日付になっています。入力内容をご確認ください");
  });

  it("#9 生年月日が古すぎる（126歳相当） → エラー", () => {
    const r = calcJoseiKenshinSchedule({ birthDate: "1900-01-01" }, BASE);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toBe("生年月日が古すぎます。入力内容をご確認ください");
  });

  it("#10 生年月日が未入力 → エラー", () => {
    const r = calcJoseiKenshinSchedule({}, BASE);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toBe("生年月日を入力してください");
  });

  it("#11 extractFirstAge: 「50歳以上」から50を抽出する", () => {
    expect(extractFirstAge("50歳以上")).toBe(50);
  });

  it("#12 extractAgeRange: 「40歳〜74歳」から[40, 74]を抽出する", () => {
    expect(extractAgeRange("40歳〜74歳")).toEqual([40, 74]);
  });

  it("#13 calcAge: 誕生日前後1日の境界（36歳/35歳）", () => {
    expect(calcAge("1990-07-16", BASE)).toBe(36);
    expect(calcAge("1990-07-18", BASE)).toBe(35);
  });

  it("#14 生年月日=1981-07-17（45歳）の複数検診同時判定", () => {
    const r = calcJoseiKenshinSchedule({ birthDate: "1981-07-17" }, BASE);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.age).toBe(45);
    const byId = Object.fromEntries(r.result.judgements.map((j) => [j.id, j]));
    expect(byId.cervical.status).toBe("eligible");
    expect(byId.breast.status).toBe("eligible");
    expect(byId.lung.status).toBe("eligible");
    expect(byId.colorectal.status).toBe("eligible");
    expect(byId.specificHealthCheckup.status).toBe("eligible");
    expect(byId.stomach.status).toBe("notYetEligible");
    expect(byId.stomach.yearsUntilEligible).toBe(5);
    expect(byId.elderlyHealthCheckup.status).toBe("notYetEligible");
    expect(byId.elderlyHealthCheckup.yearsUntilEligible).toBe(30);
  });
});

describe("JoseiKenshinSchedule.calc — 補助関数・データ抽出の正確性", () => {
  it("isValidDateString: 不正な形式・存在しない日付を弾く", () => {
    expect(isValidDateString("2026-13-01")).toBe(false);
    expect(isValidDateString("2026-02-30")).toBe(false);
    expect(isValidDateString("not-a-date")).toBe(false);
    expect(isValidDateString("2026-07-17")).toBe(true);
  });

  it("extractFirstAge: 「20歳以上の女性」「40歳以上の女性」からそれぞれ抽出する", () => {
    expect(extractFirstAge("20歳以上の女性")).toBe(20);
    expect(extractFirstAge("40歳以上の女性")).toBe(40);
  });

  it("extractFirstAge: 「後期高齢者医療制度の被保険者（原則75歳以上、一定の障害がある場合は65歳以上）」から原則の75を抽出する", () => {
    expect(
      extractFirstAge("後期高齢者医療制度の被保険者（原則75歳以上、一定の障害がある場合は65歳以上）"),
    ).toBe(75);
  });

  it("extractFirstAge: マッチしない文字列は例外を投げる", () => {
    expect(() => extractFirstAge("該当なし")).toThrow();
  });

  it("SCREENING_DEFS: 7件の検診が、データ由来の想定しきい値と一致する", () => {
    const byId = Object.fromEntries(SCREENING_DEFS.map((d) => [d.id, d]));
    expect(SCREENING_DEFS).toHaveLength(7);
    expect(byId.cervical.minAge).toBe(20);
    expect(byId.breast.minAge).toBe(40);
    expect(byId.stomach.minAge).toBe(50);
    expect(byId.lung.minAge).toBe(40);
    expect(byId.colorectal.minAge).toBe(40);
    expect(byId.specificHealthCheckup.minAge).toBe(40);
    expect(byId.specificHealthCheckup.maxAge).toBe(74);
    expect(byId.elderlyHealthCheckup.minAge).toBe(75);
    expect(byId.elderlyHealthCheckup.maxAge).toBeNull();
  });

  it("judgeScreening: 上限のない検診は年齢がいくつ上がっても対象のまま", () => {
    const def = SCREENING_DEFS.find((d) => d.id === "breast")!;
    expect(judgeScreening(100, def).status).toBe("eligible");
  });

  it("judgeAllScreenings: 0歳は全件があと◯年で対象（対象外は発生しない）", () => {
    const results = judgeAllScreenings(0);
    expect(results.every((r) => r.status === "notYetEligible")).toBe(true);
  });
});
