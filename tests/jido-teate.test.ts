import { describe, expect, it } from "vitest";
import { calculateJidoTeate } from "@/components/tools/impl/JidoTeate.calc";

/*
 * 児童手当計算（Q3-08）のテスト。
 * 制度データは data/seido/jido-teate.json を正とする。
 * 2026年度時点の月額: 0〜2歳 第1子/第2子15,000円・第3子以降30,000円
 *                     3歳〜高校生年代 第1子/第2子10,000円・第3子以降30,000円
 * 支給対象カットオフ: 18歳に達する日以後の最初の3月31日まで。
 * 多子加算カウントの対象年齢: 22歳に達する日以後の最初の3月31日まで
 *   （18〜22歳年度末は economicallySupported=true の場合のみカウント）。
 */

const BASE = "2026-07-17";

describe("calculateJidoTeate", () => {
  it("0〜2歳・第1子（単独）は月額15,000円", () => {
    const r = calculateJidoTeate([{ birthDate: "2025-01-01" }], BASE);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.children[0].ageCategory).toBe("under3");
    expect(r.result.children[0].monthlyAmount).toBe(15000);
  });

  it("3歳〜高校生年代・第1子（単独）は月額10,000円", () => {
    const r = calculateJidoTeate([{ birthDate: "2021-01-01" }], BASE);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.children[0].ageCategory).toBe("age3ToHighSchool");
    expect(r.result.children[0].monthlyAmount).toBe(10000);
  });

  it("★月単位判定★ 3歳の誕生月は月末まで under3（「誕生日の前日が属する月まで」）", () => {
    // 2023-07-17生まれ: 3歳の誕生日の前日2026-07-16が属する7月分までは15,000円
    const july = calculateJidoTeate([{ birthDate: "2023-07-17" }], "2026-07-17");
    expect(july.ok).toBe(true);
    if (july.ok) expect(july.result.children[0].ageCategory).toBe("under3");
    const endOfJuly = calculateJidoTeate([{ birthDate: "2023-07-17" }], "2026-07-31");
    expect(endOfJuly.ok).toBe(true);
    if (endOfJuly.ok) expect(endOfJuly.result.children[0].ageCategory).toBe("under3");
    // 翌月（8月分）から age3ToHighSchool
    const aug = calculateJidoTeate([{ birthDate: "2023-07-17" }], "2026-08-01");
    expect(aug.ok).toBe(true);
    if (aug.ok) expect(aug.result.children[0].ageCategory).toBe("age3ToHighSchool");
  });

  it("★月単位判定★ 1日生まれは誕生日の前日が前月末のため、誕生月から age3ToHighSchool", () => {
    // 2023-08-01生まれ: 前日2026-07-31が属する7月分までが under3、8月分から切替
    const july = calculateJidoTeate([{ birthDate: "2023-08-01" }], "2026-07-31");
    expect(july.ok).toBe(true);
    if (july.ok) expect(july.result.children[0].ageCategory).toBe("under3");
    const aug = calculateJidoTeate([{ birthDate: "2023-08-01" }], "2026-08-01");
    expect(aug.ok).toBe(true);
    if (aug.ok) expect(aug.result.children[0].ageCategory).toBe("age3ToHighSchool");
  });

  it("3人きょうだいで第3子（3歳〜高校生年代）は加算後30,000円になる", () => {
    const r = calculateJidoTeate(
      [
        { birthDate: "2015-01-01" }, // 第1子・高校生年代
        { birthDate: "2018-01-01" }, // 第2子
        { birthDate: "2021-01-01" }, // 第3子
      ],
      BASE,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.children[0].monthlyAmount).toBe(10000);
    expect(r.result.children[1].monthlyAmount).toBe(10000);
    expect(r.result.children[2].monthlyAmount).toBe(30000);
    expect(r.result.children[2].rank).toBe(3);
  });

  it("0〜2歳区分でも第3子以降は加算され30,000円になる（jido-teate.json準拠、旧制度と異なる論点）", () => {
    const r = calculateJidoTeate(
      [
        { birthDate: "2015-01-01" }, // 第1子
        { birthDate: "2018-01-01" }, // 第2子
        { birthDate: "2025-06-01" }, // 第3子・0〜2歳
      ],
      BASE,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.children[2].ageCategory).toBe("under3");
    expect(r.result.children[2].monthlyAmount).toBe(30000);
  });

  it("18歳年度末カットオフ当日はまだ支給対象（境界）", () => {
    // 2008-02-10生まれ→18歳誕生日2026-02-10（1〜3月）→年度末カットオフ2026-03-31
    const r = calculateJidoTeate([{ birthDate: "2008-02-10" }], "2026-03-31");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.children[0].isRecipient).toBe(true);
    expect(r.result.children[0].monthlyAmount).toBe(10000);
  });

  it("18歳年度末カットオフ翌日は支給対象外（境界）", () => {
    const r = calculateJidoTeate([{ birthDate: "2008-02-10" }], "2026-04-01");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.children[0].isRecipient).toBe(false);
    expect(r.result.children[0].monthlyAmount).toBe(0);
    expect(r.result.children[0].ageCategory).toBe("over18to22");
  });

  it("★年齢計算ニ関スル法律★ 4/1生まれの18歳到達日は3/31 → カットオフは1年早い", () => {
    // 2007-04-01生まれ→「18歳に達する日」は誕生日の前日2025-03-31→その日以後最初の3/31=2025-03-31
    const r1 = calculateJidoTeate([{ birthDate: "2007-04-01" }], "2025-03-31");
    expect(r1.ok).toBe(true);
    if (r1.ok) expect(r1.result.children[0].isRecipient).toBe(true);

    const r2 = calculateJidoTeate([{ birthDate: "2007-04-01" }], "2025-04-01");
    expect(r2.ok).toBe(true);
    if (r2.ok) expect(r2.result.children[0].isRecipient).toBe(false);
  });

  it("4/2生まれの18歳カットオフは従来どおり翌年3/31（4/1境界の確認）", () => {
    const r1 = calculateJidoTeate([{ birthDate: "2007-04-02" }], "2026-03-31");
    expect(r1.ok).toBe(true);
    if (r1.ok) expect(r1.result.children[0].isRecipient).toBe(true);
    const r2 = calculateJidoTeate([{ birthDate: "2007-04-02" }], "2026-04-01");
    expect(r2.ok).toBe(true);
    if (r2.ok) expect(r2.result.children[0].isRecipient).toBe(false);
  });

  it("22歳年度末を超えた兄姉はカウント対象外（下の子の順位に影響しない）", () => {
    const r = calculateJidoTeate(
      [
        { birthDate: "2003-01-01" }, // 23歳程度、22歳年度末超過
        { birthDate: "2020-01-01" }, // 対象児童（本来は第2子扱いになるはず）
      ],
      BASE,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.children[0].ageCategory).toBe("over22");
    expect(r.result.children[0].countedForRanking).toBe(false);
    expect(r.result.children[1].rank).toBe(1);
    expect(r.result.children[1].monthlyAmount).toBe(10000);
  });

  it("18〜22歳年度末の兄姉は economicallySupported=true のときのみカウントされ、下の子を第3子に押し上げる", () => {
    const withSupport = calculateJidoTeate(
      [
        { birthDate: "2004-05-01", economicallySupported: true }, // 大学生年代・扶養あり
        { birthDate: "2018-01-01" }, // 高校生年代
        { birthDate: "2021-01-01" }, // 対象児童
      ],
      BASE,
    );
    expect(withSupport.ok).toBe(true);
    if (withSupport.ok) {
      expect(withSupport.result.children[0].countedForRanking).toBe(true);
      expect(withSupport.result.children[2].rank).toBe(3);
      expect(withSupport.result.children[2].monthlyAmount).toBe(30000);
    }

    const withoutSupport = calculateJidoTeate(
      [
        { birthDate: "2004-05-01", economicallySupported: false },
        { birthDate: "2018-01-01" },
        { birthDate: "2021-01-01" },
      ],
      BASE,
    );
    expect(withoutSupport.ok).toBe(true);
    if (withoutSupport.ok) {
      expect(withoutSupport.result.children[0].countedForRanking).toBe(false);
      expect(withoutSupport.result.children[2].rank).toBe(2);
      expect(withoutSupport.result.children[2].monthlyAmount).toBe(10000);
    }
  });

  it("economicallySupported未指定（デフォルトfalse相当）はカウント対象外", () => {
    const r = calculateJidoTeate(
      [{ birthDate: "2004-05-01" }, { birthDate: "2021-01-01" }],
      BASE,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.children[0].countedForRanking).toBe(false);
    expect(r.result.children[1].rank).toBe(1);
  });

  it("対象児童が0人のとき世帯合計は0円", () => {
    const r = calculateJidoTeate([], BASE);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.children.length).toBe(0);
    expect(r.result.totalMonthly).toBe(0);
    expect(r.result.totalAnnual).toBe(0);
    expect(r.result.perPaymentAmount).toBe(0);
  });

  it("複数子の世帯合計月額・年額・1回あたり支給額が正しく合算される", () => {
    const r = calculateJidoTeate(
      [
        { birthDate: "2018-01-01" }, // 8歳・第1子 10,000円
        { birthDate: "2021-01-01" }, // 5歳・第2子 10,000円
        { birthDate: "2025-06-01" }, // 1歳・第3子 30,000円（0〜2歳区分でも加算）
      ],
      BASE,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.totalMonthly).toBe(50000);
    expect(r.result.totalAnnual).toBe(600000);
    expect(r.result.perPaymentAmount).toBe(100000);
    expect(r.result.paymentMonths).toEqual([2, 4, 6, 8, 10, 12]);
  });

  it("生年月日が不正な形式は入力エラー", () => {
    const r = calculateJidoTeate([{ birthDate: "2025/01/01" }], BASE);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors[0].index).toBe(0);
    expect(r.errors[0].message).toMatch(/形式/);
  });

  it("生年月日が基準日より未来は入力エラー", () => {
    const r = calculateJidoTeate([{ birthDate: "2027-01-01" }], BASE);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors[0].message).toMatch(/基準日より前/);
  });

  it("存在しない日付（2月30日）は入力エラー", () => {
    const r = calculateJidoTeate([{ birthDate: "2025-02-30" }], BASE);
    expect(r.ok).toBe(false);
  });

  it("複数子のうち1件でもエラーがあれば全体としてエラーを返す", () => {
    const r = calculateJidoTeate(
      [{ birthDate: "2020-01-01" }, { birthDate: "invalid-date" }],
      BASE,
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.length).toBeGreaterThanOrEqual(1);
    expect(r.errors[0].index).toBe(1);
  });

  it("双子（同一生年月日）はそれぞれ別の順位を持つ", () => {
    const r = calculateJidoTeate(
      [
        { birthDate: "2015-01-01" }, // 第1子
        { birthDate: "2021-01-01" }, // 双子A
        { birthDate: "2021-01-01" }, // 双子B
      ],
      BASE,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const ranks = r.result.children.map((c) => c.rank).sort();
    expect(ranks).toEqual([1, 2, 3]);
    // 3人目に相当する側が第3子以降加算(30,000円)を受ける
    const amounts = r.result.children.map((c) => c.monthlyAmount).sort((a, b) => a - b);
    expect(amounts).toContain(30000);
  });

  it("開示文言(disclaimer)が結果に含まれる", () => {
    const r = calculateJidoTeate([{ birthDate: "2020-01-01" }], BASE);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result.disclaimer.length).toBeGreaterThan(20);
    expect(r.result.disclaimer).toMatch(/市区町村/);
  });
});
