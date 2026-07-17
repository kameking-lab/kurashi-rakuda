import { describe, it, expect } from "vitest";
import {
  amendmentEffectiveDate,
  addDays,
  basisYearLabel,
  formatJaDate,
  upcomingChanges,
  expiredAmendments,
  isDataExpired,
  toToolSources,
  type SeidoDataset,
} from "@/lib/tools/seido";
import ikukyu from "@/data/seido/ikukyu-kyufu.json";
import fuyou from "@/data/seido/fuyou-kabe.json";

/**
 * 制度データ駆動の表示ロジックのテスト。
 *
 * ★このテストが守っているもの★
 * 「2026/8/1にデータを差し替えるだけで表示が追随すること」。
 * 育休給付の支給限度額は毎年8月1日に改定される。コードに日付を書かず、
 * data/seido/*.json の amendments から導出していることを固定する。
 */

const ikukyuDs = ikukyu as unknown as SeidoDataset;
const fuyouDs = fuyou as unknown as SeidoDataset;

/**
 * ★8/1のデータ差し替えでテストも自動追随する★
 * 育休給付の期限（expiresOn）はデータから動的に取り出す。日付をテストに直書きすると、
 * 8/1にデータを差し替えた瞬間このファイルが割れて「データ差し替えだけで追随」が嘘になる
 * （2026-07-17 D1ドライランで実証）。
 */
const ikukyuExpires = ikukyuDs.amendments!.find((a) => a.status === "expires")!;
/** 期限日（例: 2026-07-31） */
const EXPIRES_ON = ikukyuExpires.expiresOn!;
/** 改定日（期限日の翌日。例: 2026-08-01） */
const SWITCH_DATE = addDays(EXPIRES_ON, 1);

describe("日付ユーティリティ", () => {
  it("addDays は月またぎを正しく処理する", () => {
    expect(addDays("2026-07-31", 1)).toBe("2026-08-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29"); // 閏年
  });

  it("formatJaDate は日本語表記にする", () => {
    expect(formatJaDate("2026-08-01")).toBe("2026年8月1日");
  });

  it("basisYearLabel は和暦を併記する", () => {
    expect(basisYearLabel(2026)).toBe("2026年度（令和8年度）");
  });
});

describe("★改定日の導出★ expires は「この日まで有効」なので切替日は翌日", () => {
  it("育休給付の上限額は expiresOn → その翌日が改定日と導出される", () => {
    expect(ikukyuExpires).toBeDefined();
    expect(EXPIRES_ON >= ikukyuDs.asOf).toBe(true); // 期限切れデータのままテストが通らないこと
    expect(amendmentEffectiveDate(ikukyuExpires)).toBe(SWITCH_DATE);
  });

  it("scheduled は effectiveFrom をそのまま使う", () => {
    expect(
      amendmentEffectiveDate({
        summary: "x",
        status: "scheduled",
        effectiveFrom: "2026-10-01",
        sourceId: "s",
      }),
    ).toBe("2026-10-01");
  });

  it("under-review（施行日未定）は日付を導出しない", () => {
    expect(
      amendmentEffectiveDate({ summary: "x", status: "under-review", sourceId: "s" }),
    ).toBeNull();
  });
});

describe("次回改定予定の表示（データ駆動）", () => {
  it("育休給付: データの asOf 時点なら期限日翌日の改定が先頭に出る", () => {
    const cs = upcomingChanges(ikukyuDs, ikukyuDs.asOf);
    expect(cs[0].date).toBe(SWITCH_DATE);
    expect(cs[0].isExpiry).toBe(true);
    expect(cs[0].summary).toContain("上限額");
  });

  it("★8/1にデータを差し替えれば表示が自動で追随する★", () => {
    // 上限額の改定（expiresOn）を1年後に差し替えたデータを模擬
    const nextExpiresOn = `${Number(EXPIRES_ON.slice(0, 4)) + 1}${EXPIRES_ON.slice(4)}`;
    const next: SeidoDataset = {
      ...ikukyuDs,
      amendments: ikukyuDs.amendments!.map((a) =>
        a.status === "expires" && a.expiresOn === EXPIRES_ON ? { ...a, expiresOn: nextExpiresOn } : a,
      ),
    };
    // 改定日時点で、古いデータは「期限切れ」、差し替え後は次回改定が1年後になる
    expect(isDataExpired(ikukyuDs, SWITCH_DATE)).toBe(true);
    expect(isDataExpired(next, SWITCH_DATE)).toBe(false);
    expect(upcomingChanges(next, SWITCH_DATE)[0].date).toBe(addDays(nextExpiresOn, 1));
  });

  it("扶養の壁: 2026年10月の賃金要件撤廃が次回改定に出る", () => {
    const cs = upcomingChanges(fuyouDs, "2026-07-17");
    expect(cs.some((c) => c.date === "2026-10-01" && c.summary.includes("賃金要件"))).toBe(true);
  });

  it("基準日より前の改定は出さない", () => {
    const cs = upcomingChanges(fuyouDs, "2027-01-01");
    expect(cs.every((c) => c.date > "2027-01-01")).toBe(true);
  });

  it("in-force（施行済）は次回改定に出さない", () => {
    const cs = upcomingChanges(fuyouDs, "2020-01-01");
    expect(cs.every((c) => c.status !== "in-force")).toBe(true);
  });

  it("古い順に並ぶ", () => {
    const cs = upcomingChanges(fuyouDs, "2026-07-17");
    const dates = cs.map((c) => c.date);
    expect(dates).toEqual([...dates].sort());
  });

  it("出典が紐づく（sourceId → sources）", () => {
    const cs = upcomingChanges(ikukyuDs, "2026-07-17");
    expect(cs[0].source?.publisher).toBeTruthy();
  });
});

describe("★期限切れの検知★ 古い金額で計算し続けないための安全弁", () => {
  it("期限日（expiresOn）当日までは期限内", () => {
    expect(isDataExpired(ikukyuDs, EXPIRES_ON)).toBe(false);
  });

  it("期限日の翌日（改定日）に期限切れになる（育休給付の上限額）", () => {
    expect(isDataExpired(ikukyuDs, SWITCH_DATE)).toBe(true);
    expect(expiredAmendments(ikukyuDs, SWITCH_DATE)[0].expiresOn).toBe(EXPIRES_ON);
  });

  it("扶養の壁は2026年度中は期限切れにならない（令和8・9年分の特例）", () => {
    expect(isDataExpired(fuyouDs, "2026-07-17")).toBe(false);
    expect(isDataExpired(fuyouDs, "2027-12-31")).toBe(false);
    // 令和10年分（2028-01-01）から数値が変わる
    expect(isDataExpired(fuyouDs, "2028-01-01")).toBe(true);
  });
});

describe("出典の変換", () => {
  it("PDF出典は landingUrl（掲載元ページ）を優先する", () => {
    const s = toToolSources(ikukyuDs, ["mhlw-ikukyu-pamph"])[0];
    expect(s.url).not.toMatch(/\.pdf$/);
    expect(s.label).toContain("厚生労働省");
  });

  it("id で絞り込める", () => {
    expect(toToolSources(fuyouDs, ["nta-2026kiso"])).toHaveLength(1);
  });
});
