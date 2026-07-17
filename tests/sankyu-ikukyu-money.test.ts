import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import {
  simulate,
  buildTimeline,
  buildSupportUnitPeriods,
  statutoryAnchor,
  prenatalPeriodDays,
  standardDailyWage,
  shussanTeateDailyAmount,
  calcShussanTeate,
  calcIchijikin,
  isIchijikinEligible,
  calcWageDaily,
  wageBasePeriod,
  salaryAtWageDailyMax,
  ikukyuAmountForDays,
  adjustByWage,
  calcIkukyu,
  calcShusshoGo,
  calcShusshoJi,
  isSpouseRequirementMet,
  papaWorkLimits,
  menjoMonths,
  isBonusPremiumExempt,
  calcMenjo,
  addMonths,
  diffDays,
  ikukyuKyufuDataset,
  SPOUSE_EXCEPTIONS,
  COMBINED_RATE,
  COMBINED_RATE_MAX_DAYS,
  RATE_FIRST,
  RATE_AFTER,
  RATE_SWITCH_DAYS,
  WAGE_DAILY_MAX,
  WAGE_DAILY_MIN,
  type SankyuInput,
} from "@/lib/tools/impl/sankyu-ikukyu-money";
import { addDays, amendmentEffectiveDate, isDataExpired, upcomingChanges, type SeidoDataset } from "@/lib/tools/seido";
import raw from "@/data/seido/ikukyu-kyufu.json";

/**
 * specs/s-tools/03-sankyu-ikukyu-money.md §6 のテストケースを実装。
 *
 * 期待値は仕様書の丸写しではなく、data/seido/ikukyu-kyufu.json の値からの
 * 導出（＝データの自己整合性の検算）として書いている。
 * 例: #12 の 323,811円 は wageDailyMax × 30 × rateFirst180Days であり、
 * データ側の monthlyMax67 と一致していなければならない。
 */

const DATA = raw.data;

const base: SankyuInput = {
  role: "mother",
  dueDate: "2026-05-01",
  birthDate: null,
  babyCount: 1,
  monthlySalary: 300_000,
  monthlyPremium: 0,
  insuredPeriod: "over12months",
  healthInsurance: "kyokai",
  leaveMonths: 12,
  leaveCount: 1,
  spouseTakesLeave: false,
  spouseLeaveDays: 0,
  spouseException: "none",
  hasObstetricCompensation: true,
  wagePerPeriod: 0,
  papaLeaveDays: 0,
  today: "2026-07-17",
};
const inp = (o: Partial<SankyuInput>): SankyuInput => ({ ...base, ...o });
const tlOf = (o: Partial<SankyuInput> = {}) => buildTimeline(inp(o));

// ================================================================ 暦

describe("暦のユーティリティ", () => {
  it("diffDays は月・年をまたいでも暦日差を返す", () => {
    expect(diffDays("2026-01-31", "2026-03-01")).toBe(29); // 2026年は平年
    expect(diffDays("2026-12-31", "2027-01-01")).toBe(1);
  });

  it("addMonths は応当日が無い月を末日にクランプする", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-01-15", 1)).toBe("2026-02-15");
    expect(addMonths("2026-03-21", -6)).toBe("2025-09-21");
  });
});

// ================================================================ 出産手当金

describe("出産手当金（specs §4.1・§6 #1・#2）", () => {
  it("★G2検収修正★ 父ロールには出産手当金を算定せず、合計にも含めない", () => {
    const i = inp({ role: "father", papaLeaveDays: 28, spouseTakesLeave: true, spouseLeaveDays: 56 });
    const teate = calcShussanTeate(i, buildTimeline(i));
    expect(teate.eligible).toBe(false);
    expect(teate.amount).toBeNull();
    expect(teate.dailyAmount).toBeNull();
    expect(teate.reason).toContain("お母さん");

    // ヘッドライン合計にも出産手当金分が乗らない
    const r = simulate(i);
    expect(r.shussanTeate.amount).toBeNull();
    if (r.total !== null) {
      const partsWithoutTeate =
        r.ichijikin.amount +
        r.ikukyu.total +
        r.shusshoGo.amount +
        (r.shusshoJi?.amount ?? 0);
      expect(r.total).toBe(partsWithoutTeate);
    }
  });

  it("★端数処理★ #1 標準報酬月額300,000 → 支給日額6,667円（× 2 ÷ 3 の有理数・50銭以上切上）", () => {
    expect(standardDailyWage(300_000)).toBe(10_000);
    // 10,000 × 2 ÷ 3 = 6,666.666… → 50銭以上1円未満は1円に切上 → 6,667
    expect(shussanTeateDailyAmount(300_000)).toBe(6_667);
    // 0.6667 を乗じると 6,667.0 になり偶然一致するが、率が近似値である以上使わない
    expect(shussanTeateDailyAmount(300_000)).toBe(Math.round((10_000 * 2) / 3));
  });

  it("#1 産前42日＋産後56日の98日分 = 6,667 × 98", () => {
    const r = calcShussanTeate(inp({}), tlOf());
    expect(r.days).toBe(
      DATA.shussanTeateKin.periodBeforeBirth.value + DATA.shussanTeateKin.periodAfterBirth.value,
    );
    expect(r.amount).toBe(6_667 * 98);
    // 仕様書 #1 の産前42日ぶん
    expect(6_667 * DATA.shussanTeateKin.periodBeforeBirth.value).toBe(280_014);
  });

  it("#2 多胎は産前98日・産後は56日のまま → 6,667 × 154 = 1,026,718円", () => {
    const r = calcShussanTeate(inp({ babyCount: 2 }), tlOf({ babyCount: 2 }));
    expect(prenatalPeriodDays(2)).toBe(DATA.shussanTeateKin.periodBeforeBirthMultiple.value);
    expect(r.days).toBe(98 + 56);
    expect(r.amount).toBe(1_026_718);
  });

  it("★端数処理★ 標準報酬日額は5円未満切捨・5円以上10円未満は10円に切上（健保法99条2項）", () => {
    expect(standardDailyWage(300_120)).toBe(10_000); // 10,004 → 切捨
    expect(standardDailyWage(300_150)).toBe(10_010); // 10,005 → 切上
  });

  it("#15 国民健康保険の方には出産手当金がない（一時金のみ）", () => {
    const r = calcShussanTeate(inp({ healthInsurance: "kokuho" }), tlOf());
    expect(r.eligible).toBe(false);
    expect(r.amount).toBeNull();
  });

  it("#16 被扶養者の方には出産手当金がない", () => {
    expect(calcShussanTeate(inp({ healthInsurance: "hifuyou" }), tlOf()).amount).toBeNull();
  });

  it("#17 共済（公務員）はスコープ外の案内を出す", () => {
    const r = simulate(inp({ healthInsurance: "kyosai" }));
    expect(r.outOfScope).toBe(true);
    expect(r.shussanTeate.amount).toBeNull();
    expect(r.warnings.some((w) => w.includes("共済組合"))).toBe(true);
  });

  it("★数値を出さない★ #18 被保険者期間12か月未満は金額を表示しない（②の値が未収集）", () => {
    const r = calcShussanTeate(inp({ insuredPeriod: "under12months" }), tlOf());
    expect(r.amount).toBeNull();
    expect(r.dailyAmount).toBeNull();
    expect(r.reason).toContain("ご確認ください");
    // 合計にも数値を出さない
    expect(simulate(inp({ insuredPeriod: "under12months" })).total).toBeNull();
  });
});

// ================================================================ 出産育児一時金

describe("出産育児一時金（specs §4.2・§6 #3〜#7）", () => {
  it("#3 産科医療補償制度の加入機関 → 500,000円", () => {
    const r = calcIchijikin(inp({}));
    expect(r.amount).toBe(DATA.shussanIkujiIchijikin.amount.value);
    expect(r.amount).toBe(500_000);
  });

  it("#4 未加入機関・在胎22週未満 → 488,000円", () => {
    expect(calcIchijikin(inp({ hasObstetricCompensation: false })).amount).toBe(
      DATA.shussanIkujiIchijikin.amountWithoutCompensation.value,
    );
  });

  it("#5 双子は児の数だけ支給 → 1,000,000円", () => {
    expect(calcIchijikin(inp({ babyCount: 2 })).amount).toBe(1_000_000);
  });

  it("#6/#7 境界: 妊娠84日は対象外・85日は対象（『85日以降』に境界を含む）", () => {
    expect(isIchijikinEligible(84)).toBe(false);
    expect(isIchijikinEligible(85)).toBe(true);
    expect(calcIchijikin(inp({ pregnancyDays: 84 })).amount).toBe(0);
    expect(calcIchijikin(inp({ pregnancyDays: 85 })).amount).toBe(500_000);
  });
});

// ================================================================ 賃金日額

describe("★罠1（最頻出のバグ）★ 賃金日額の起算点（specs §9.3-1・§6 #42）", () => {
  it("#42 母親は『産前休業開始日の前6か月』で計算する（育休開始前ではない）", () => {
    const tl = tlOf();
    const p = wageBasePeriod(inp({}), tl);
    expect(p.basedOn).toBe("prenatalLeave");
    // 産前休業開始日 = 2026-03-21。その前6か月 = 2025-09-21 〜 2026-03-20
    expect(tl.prenatalStart).toBe("2026-03-21");
    expect(p.from).toBe("2025-09-21");
    expect(p.to).toBe("2026-03-20");
    // ★育休開始日（産後56日の翌日 = 2026-06-27）を起算点にしていないこと★
    expect(p.to < tl.childcareLeaveStart).toBe(true);
    expect(p.from).not.toBe(addMonths(tl.childcareLeaveStart, -6));
    // 給付額はゼロにならない
    expect(calcWageDaily(inp({}), tl).value).toBe(10_000);
  });

  it("父親は育児休業開始日の前6か月が起算点（産休がないため）", () => {
    const i = inp({ role: "father", papaLeaveDays: 28, birthDate: "2026-05-01" });
    const tl = buildTimeline(i);
    const p = wageBasePeriod(i, tl);
    expect(p.basedOn).toBe("childcareLeave");
    // 父の育休は出生の翌日から産後パパ育休28日を経た 2026-05-30 開始
    expect(tl.childcareLeaveStart).toBe("2026-05-30");
    expect(p.from).toBe("2025-11-30");
    expect(p.to).toBe("2026-05-29");
    // 父は母の産後休業明け（出生+57日）を待たない
    expect(tl.childcareLeaveStart < addMonths(tl.postnatalEnd, 0)).toBe(true);
  });
});

describe("休業開始時賃金日額のクランプ（specs §4.3・§6 #11〜#13）", () => {
  it("月給300,000 → W = 300,000 × 6 ÷ 180 = 10,000円", () => {
    expect(calcWageDaily(inp({}), tlOf()).value).toBe(10_000);
  });

  it("#11 ★上限到達点★ 月給が「賃金日額上限×30」で W が上限ちょうどになる", () => {
    // ★8/1追随★ 上限到達点の月給はデータから導出する（金額の直書きはドライランで割れた）
    expect(salaryAtWageDailyMax()).toBe(WAGE_DAILY_MAX * 30);
    const w = calcWageDaily(inp({ monthlySalary: salaryAtWageDailyMax() }), tlOf());
    expect(w.raw).toBe(WAGE_DAILY_MAX);
    expect(w.atMax).toBe(true);
  });

  it("#12 月給600,000 → W=20,000 は上限にクランプされ、警告を出す", () => {
    const w = calcWageDaily(inp({ monthlySalary: 600_000 }), tlOf());
    expect(w.raw).toBe(20_000);
    expect(w.value).toBe(WAGE_DAILY_MAX);
    const r = simulate(inp({ monthlySalary: 600_000 }));
    expect(r.warnings.some((x) => x.includes("上限") && x.includes("手取り10割"))).toBe(true);
  });

  it("#13 ★下限★ 月給90,000 → W=3,000 は下限に引き上げられる", () => {
    const w = calcWageDaily(inp({ monthlySalary: 90_000 }), tlOf());
    expect(w.raw).toBe(3_000);
    expect(w.value).toBe(WAGE_DAILY_MIN);
    expect(w.atMin).toBe(true);
  });
});

// ================================================================ 育児休業給付金

describe("育児休業給付金（specs §4.3・§6 #8〜#10）", () => {
  it("#8 W=10,000・30日・67% → 201,000円", () => {
    expect(ikukyuAmountForDays(10_000, 30, false)).toBe(201_000);
  });

  it("#9/#10 境界: 通算180日目まで67%、181日目以降50%", () => {
    expect(RATE_SWITCH_DAYS).toBe(180);
    expect(RATE_FIRST).toBe(DATA.ikujiKyugyoKyufuKin.rateFirst180Days.value);
    expect(RATE_AFTER).toBe(DATA.ikujiKyugyoKyufuKin.rateAfter180Days.value);
    expect(ikukyuAmountForDays(10_000, 30, true)).toBe(150_000);

    const r = calcIkukyu(inp({}), tlOf(), calcWageDaily(inp({}), tlOf()));
    const cum: number[] = [];
    let acc = 0;
    for (const p of r.periods) {
      acc += p.days;
      cum.push(acc);
    }
    // 通算180日に達するまでの日数が67%、超過分が50%で計算される
    expect(r.periods.reduce((s, p) => s + p.days67, 0)).toBe(180);
    expect(r.periods.reduce((s, p) => s + p.days50, 0)).toBe(acc - 180);
  });

  it("★G2検収修正★ 支給日数は原則30日（暦日数28〜31日を使わない）", () => {
    const i = inp({});
    const r = calcIkukyu(i, tlOf(), calcWageDaily(i, tlOf()));
    // 休業終了日を含む最後の期間以外は、開始応当日がどの月でも30日
    for (const p of r.periods.slice(0, -1)) {
      expect(p.days).toBe(30);
    }
    // 例: 賃金日額10,000円なら1期間目は 10,000×30×67% = 201,000円
    //（暦日数31日で計算すると 207,700円になり過大）
    const w = calcWageDaily(i, tlOf());
    const first = r.periods[0];
    expect(first.amount).toBe(Math.floor(w.value * 30 * RATE_FIRST));
  });

  it("★G2検収修正★ 休業終了日を含む最後の支給単位期間のみ実日数", () => {
    const i = inp({});
    const tl = tlOf();
    const r = calcIkukyu(i, tl, calcWageDaily(i, tl));
    const last = r.periods[r.periods.length - 1];
    // 最後の期間の日数 = 期間開始日〜休業終了日の実日数（30日固定ではない）
    const ms =
      new Date(`${last.end}T00:00:00Z`).getTime() -
      new Date(`${last.start}T00:00:00Z`).getTime();
    expect(last.days).toBe(ms / 86400000 + 1);
    expect(last.end).toBe(tl.childcareLeaveEnd);
  });

  it("★データの自己整合性★ #12 W上限×30日×67% = monthlyMax67", () => {
    // ★8/1追随★ 絶対値のピン留めはしない。値そのものの正しさは verify-seido --fetch が
    // 一次資料（厚労省パンフレット）と照合し、ここでは上限額と賃金日額の整合だけを固定する
    expect(ikukyuAmountForDays(WAGE_DAILY_MAX, 30, false)).toBe(
      DATA.ikujiKyugyoKyufuKin.monthlyMax67.value,
    );
  });

  it("★データの自己整合性★ W上限×30日×50% = monthlyMax50、W下限×30日×67% = monthlyMin67", () => {
    expect(ikukyuAmountForDays(WAGE_DAILY_MAX, 30, true)).toBe(
      DATA.ikujiKyugyoKyufuKin.monthlyMax50.value,
    );
    expect(ikukyuAmountForDays(WAGE_DAILY_MIN, 30, false)).toBe(
      DATA.ikujiKyugyoKyufuKin.monthlyMin67.value,
    );
    expect(ikukyuAmountForDays(WAGE_DAILY_MIN, 30, true)).toBe(
      DATA.ikujiKyugyoKyufuKin.monthlyMin50.value,
    );
  });

  it("#14 ★異常系★ 被保険者期間が12か月未満なら断定せずハローワークへ案内する", () => {
    const r = calcIkukyu(inp({ insuredPeriod: "under12months" }), tlOf(), calcWageDaily(inp({}), tlOf()));
    expect(r.eligible).toBe(false);
    expect(r.total).toBe(0);
    expect(r.reason).toContain("ハローワーク");
  });

  it("#44 同一の子で3回目の育児休業は不支給（2回まで）", () => {
    const r = calcIkukyu(inp({ leaveCount: 3 }), tlOf(), calcWageDaily(inp({}), tlOf()));
    expect(r.eligible).toBe(false);
    expect(r.total).toBe(0);
  });
});

describe("★罠3★ 支給単位期間は暦月ではない（specs §9.3-3・§6 #34）", () => {
  it("#34 1/15開始なら第1支給単位期間は 1/15〜2/14", () => {
    const ps = buildSupportUnitPeriods("2026-01-15", "2027-01-14");
    expect(ps[0].start).toBe("2026-01-15");
    expect(ps[0].end).toBe("2026-02-14");
    expect(ps[1].start).toBe("2026-02-15");
    expect(ps[1].end).toBe("2026-03-14");
    // 暦月ではないので、月初・月末に一致しない
    expect(ps[0].end.endsWith("-28") || ps[0].end.endsWith("-31")).toBe(false);
  });

  it("応当日が無い月は末日にクランプする（1/31開始 → 1/31〜2/27）", () => {
    const ps = buildSupportUnitPeriods("2026-01-31", "2026-04-30");
    expect(ps[0].end).toBe("2026-02-27");
  });
});

describe("就業して賃金が支払われた場合の調整（specs §6 #30〜#33）", () => {
  const wageBase = 10_000 * 30; // W × 日数 = 300,000

  it("#30 境界: 賃金が13%ちょうどなら減額なし", () => {
    const r = adjustByWage(201_000, wageBase, wageBase * 0.13, false);
    expect(r.kind).toBe("full");
    expect(r.amount).toBe(201_000);
  });

  it("#31 13%超80%未満（50%）→ W×日数×80% − 賃金 = 90,000円", () => {
    const r = adjustByWage(201_000, wageBase, 150_000, false);
    expect(r.kind).toBe("reduced");
    expect(r.amount).toBe(90_000);
  });

  it("#32 境界: 賃金が80%以上なら育児休業給付金は不支給", () => {
    const r = adjustByWage(201_000, wageBase, wageBase * 0.8, false);
    expect(r.kind).toBe("none");
    expect(r.amount).toBe(0);
  });

  it("181日目以降の減額なしの上限は30%", () => {
    expect(adjustByWage(150_000, wageBase, wageBase * 0.3, true).kind).toBe("full");
    expect(adjustByWage(150_000, wageBase, wageBase * 0.31, true).kind).toBe("reduced");
  });
});

// ================================================================ 出生後休業支援給付金

describe("出生後休業支援給付金（specs §4.4・§6 #19〜#25）", () => {
  const w = () => calcWageDaily(inp({}), tlOf());
  const go = (o: Partial<SankyuInput>) => {
    const i = inp(o);
    const tl = buildTimeline(i);
    return calcShusshoGo(i, tl, calcWageDaily(i, tl), calcIkukyu(i, tl, calcWageDaily(i, tl)));
  };

  it("#19 境界−1: 配偶者の育休13日では対象にならない", () => {
    expect(go({ spouseTakesLeave: true, spouseLeaveDays: 13 }).eligible).toBe(false);
  });

  it("#20 境界ちょうど: 配偶者の育休14日で対象 → 10,000 × 28日 × 13% = 36,400円", () => {
    const r = go({ spouseTakesLeave: true, spouseLeaveDays: 14 });
    expect(r.eligible).toBe(true);
    expect(r.days).toBe(DATA.shusshoGoKyugyoShienKyufuKin.maxDays.value);
    expect(r.amount).toBe(36_400);
  });

  it("#21 vs #22 ★例外7類型★ 同じ入力でも例外に該当すれば結果が反転する", () => {
    const without = go({ spouseTakesLeave: false, spouseException: "none" });
    expect(without.eligible).toBe(false);
    expect(without.reason).toContain("いずれかに当てはまる");

    // 4. 配偶者が無業者
    const withException = go({ spouseTakesLeave: false, spouseException: 3 });
    expect(SPOUSE_EXCEPTIONS[3]).toBe("配偶者が無業者");
    expect(withException.eligible).toBe(true);
    expect(withException.amount).toBe(36_400);
  });

  it("#23 ★母親自身の産後休業が本人の14日要件を満たす★（配偶者が自営業者の例外）", () => {
    const r = go({ spouseTakesLeave: false, spouseException: 4 });
    expect(SPOUSE_EXCEPTIONS[4]).toContain("自営業者");
    expect(r.ownOk).toBe(true); // 産後休業56日 ≧ 14日
    expect(r.eligible).toBe(true);
  });

  it("例外7類型はデータから読む（7件・配偶者要件の免除）", () => {
    expect(SPOUSE_EXCEPTIONS).toHaveLength(7);
    expect(isSpouseRequirementMet(inp({ spouseException: 0 }))).toBe(true);
    expect(isSpouseRequirementMet(inp({ spouseException: "none" }))).toBe(false);
  });

  it("★データの自己整合性★ #24 W上限×28日×13% = monthlyMax（端数切捨）", () => {
    // ★8/1追随★ 月給は上限到達点を確実に超える値をデータから導出（絶対値ピン留めはしない）
    const r = go({ monthlySalary: salaryAtWageDailyMax() * 2, spouseTakesLeave: true, spouseLeaveDays: 14 });
    expect(r.amount).toBe(DATA.shusshoGoKyugyoShienKyufuKin.monthlyMax.value);
    // 浮動小数を避け、百分率の整数で再計算する（16,110×28×13% = 58,640.4 → 58,640）
    const ratePercent = Math.round(DATA.shusshoGoKyugyoShienKyufuKin.rate.value * 100);
    expect(r.amount).toBe(Math.floor((WAGE_DAILY_MAX * 28 * ratePercent) / 100));
  });

  it("★罠4★ #25 80%は67%＋13%の合算で最大28日限定（給付率が80%になったのではない）", () => {
    expect(COMBINED_RATE).toBe(0.8);
    expect(RATE_FIRST + DATA.shusshoGoKyugyoShienKyufuKin.rate.value).toBeCloseTo(COMBINED_RATE, 10);
    expect(COMBINED_RATE_MAX_DAYS).toBe(28);
    // 29日目以降は67%に戻る＝出生後休業支援給付の日数は28日で頭打ち
    expect(go({ spouseTakesLeave: true, spouseLeaveDays: 30 }).days).toBe(28);
  });

  it("★罠6★ #33 育休給付が減額されても出生後休業支援給付は減額されない", () => {
    const r = go({ spouseTakesLeave: true, spouseLeaveDays: 14, wagePerPeriod: 150_000 });
    expect(r.eligible).toBe(true);
    expect(r.amount).toBe(36_400); // 満額のまま
  });

  it("★罠6★ #32 賃金80%以上で育休給付が不支給になると出生後休業支援給付も不支給", () => {
    const i = inp({ spouseTakesLeave: true, spouseLeaveDays: 14, monthlySalary: 300_000 });
    const tl = buildTimeline(i);
    const wd = calcWageDaily(i, tl);
    // 第1支給単位期間（30日）の賃金 = W × 30 × 80%
    const withWage = { ...i, wagePerPeriod: wd.value * 30 * 0.8 };
    const ik = calcIkukyu(withWage, tl, wd);
    expect(ik.periods[0].adjust).toBe("none");
    const r = calcShusshoGo(withWage, tl, wd, ik);
    expect(r.eligible).toBe(false);
    expect(r.amount).toBe(0);
    expect(w().value).toBe(10_000);
  });
});

// ================================================================ 出生時育児休業給付金

describe("出生時育児休業給付金・産後パパ育休（specs §4.5・§6 #26〜#29）", () => {
  it("#26 28日・月給300,000 → 10,000 × 28 × 67% = 187,600円", () => {
    const i = inp({ role: "father", papaLeaveDays: 28 });
    const tl = buildTimeline(i);
    expect(calcShusshoJi(i, calcWageDaily(i, tl))!.amount).toBe(187_600);
  });

  it("★データの自己整合性★ #27 月給600,000・28日 → monthlyMax（302,223円）", () => {
    const i = inp({ role: "father", papaLeaveDays: 28, monthlySalary: 600_000 });
    const tl = buildTimeline(i);
    expect(calcShusshoJi(i, calcWageDaily(i, tl))!.amount).toBe(
      DATA.shusshoJiIkujiKyugyoKyufuKin.monthlyMax.value,
    );
  });

  it("#28 ★比例縮小★ 14日の休業 → 就業は最大5日・40時間", () => {
    expect(papaWorkLimits(14)).toEqual({ days: 5, hours: 40 });
  });

  it("#29 ★切上と端数処理なしの混在★ 10日の休業 → 最大4日（3.57を切上）・28.57時間", () => {
    const l = papaWorkLimits(10);
    expect(l.days).toBe(4);
    expect(l.hours).toBeCloseTo(28.5714, 3);
  });

  it("母親には出生時育児休業給付金がない", () => {
    const i = inp({ role: "mother" });
    expect(calcShusshoJi(i, calcWageDaily(i, buildTimeline(i)))).toBeNull();
  });
});

// ================================================================ 産前産後の期間

describe("★罠2★ 出産日が予定日とずれた場合（specs §9.3-2・§6 #40・#41）", () => {
  it("#40 予定日5/1・出産5/10 → 産前は3/21〜5/10（遅れた日数も産前に含む）、産後は5/11〜7/5", () => {
    const tl = tlOf({ dueDate: "2026-05-01", birthDate: "2026-05-10" });
    expect(statutoryAnchor("2026-05-01", "2026-05-10")).toBe("2026-05-01"); // 起算点は予定日
    expect(tl.prenatalStart).toBe("2026-03-21");
    expect(tl.prenatalEnd).toBe("2026-05-10");
    expect(tl.prenatalDays).toBe(51); // 42日 + 遅れた9日
    expect(tl.postnatalStart).toBe("2026-05-11");
    expect(tl.postnatalEnd).toBe("2026-07-05");
    expect(simulate(inp({ dueDate: "2026-05-01", birthDate: "2026-05-10" })).warnings.some((w) => w.includes("遅れた"))).toBe(true);
  });

  it("#41 予定日5/1・出産4/25 → 産前は3/21〜4/25（短くなる）、産後は4/26〜6/20", () => {
    const tl = tlOf({ dueDate: "2026-05-01", birthDate: "2026-04-25" });
    expect(statutoryAnchor("2026-05-01", "2026-04-25")).toBe("2026-04-25"); // 起算点は出産の日
    expect(tl.prenatalStart).toBe("2026-03-21");
    expect(tl.prenatalEnd).toBe("2026-04-25");
    expect(tl.prenatalDays).toBe(36); // 42日より短い
    expect(tl.postnatalStart).toBe("2026-04-26");
    expect(tl.postnatalEnd).toBe("2026-06-20");
  });

  it("出産日が未定なら予定日で試算し、産前はちょうど42日になる", () => {
    expect(tlOf().prenatalDays).toBe(42);
    expect(tlOf().delayDays).toBe(0);
  });
});

// ================================================================ 社会保険料免除

describe("社会保険料免除（specs §4.6・§6 #35〜#39・#43）", () => {
  it("#35 境界−3: 同月内11日の育休では免除なし", () => {
    expect(menjoMonths("2026-04-10", "2026-04-20", { applyFourteenDayRule: true })).toEqual([]);
  });

  it("#36 境界ちょうど: 同月内14日の育休で当該月が免除", () => {
    expect(menjoMonths("2026-04-10", "2026-04-23", { applyFourteenDayRule: true })).toEqual(["2026-04"]);
  });

  it("#37 月をまたぐ育休は月末在籍ルールで4月分が免除", () => {
    expect(menjoMonths("2026-04-20", "2026-05-10", { applyFourteenDayRule: true })).toEqual(["2026-04"]);
  });

  it("★産休には14日ルールがない★ 同月内の産休は免除されない（月末在籍の原則のみ）", () => {
    expect(menjoMonths("2026-04-10", "2026-04-23", { applyFourteenDayRule: false })).toEqual([]);
  });

  it("#38/#39 境界: 賞与保険料は育休が1か月ちょうどでは免除されず、1か月と1日で免除される", () => {
    expect(isBonusPremiumExempt("2026-04-01", "2026-04-30")).toBe(false); // 1か月ちょうど
    expect(isBonusPremiumExempt("2026-04-01", "2026-05-01")).toBe(true); // 1か月と1日
    // 賞与を支払った月の末日を含むことが必要
    expect(isBonusPremiumExempt("2026-04-01", "2026-05-01", "2026-04")).toBe(true);
    expect(isBonusPremiumExempt("2026-04-01", "2026-05-01", "2026-06")).toBe(false);
  });

  it("産休〜育休の免除月がつながり、免除額は給与明細の月額から集計する", () => {
    const i = inp({ monthlyPremium: 45_000 });
    const r = calcMenjo(i, buildTimeline(i));
    expect(r.maternityMonths[0]).toBe("2026-03");
    expect(r.childcareMonths[0]).toBe("2026-06");
    expect(r.estimated).toBe(45_000 * r.totalMonths);
  });

  it("給与明細の月額が未入力なら免除額は推測せず null にする", () => {
    expect(calcMenjo(inp({}), tlOf()).estimated).toBeNull();
  });

  it("★罠5★ #43 社保料免除の対象は3歳未満（雇用保険の育休給付は原則1歳）", () => {
    expect(DATA.shakaiHokenryoMenjo.childcareLeave.targetAge.value).toContain("3歳");
    expect(DATA.shakaiHokenryoMenjo.childcareLeave.targetAge.note).toContain("1歳");
    // 育休24か月でも免除の月は積み上がる（給付とは別の制度）
    const i = inp({ leaveMonths: 24, monthlyPremium: 45_000 });
    expect(calcMenjo(i, buildTimeline(i)).totalMonths).toBeGreaterThan(24);
  });
});

// ================================================================ 総合

describe("総合（simulate）", () => {
  it("標準ケースの合計は各給付の合計と一致する", () => {
    const r = simulate(inp({ spouseTakesLeave: true, spouseLeaveDays: 14 }));
    expect(r.total).toBe(
      (r.shussanTeate.amount ?? 0) + r.ichijikin.amount + r.ikukyu.total + r.shusshoGo.amount,
    );
    expect(r.total).toBeGreaterThan(0);
  });

  it("育休を取らない場合も出産手当金・一時金は出る", () => {
    const r = simulate(inp({ leaveMonths: 0 }));
    expect(r.ikukyu.total).toBe(0);
    expect(r.total).toBe(6_667 * 98 + 500_000);
  });
});

// ================================================================ ★8/1のデータ差し替えで追随する★

describe("★8月1日のデータ差し替えだけで追随すること★（specs §9.1・§6 #45）", () => {
  const ds = ikukyuKyufuDataset;
  // ★8/1追随★ 期限日・改定日はデータから動的に導出する。日付をテストに直書きすると、
  // 8/1にデータを差し替えた瞬間このファイルが割れる（2026-07-17 D1ドライランで実証）
  const expiresAmendment = ds.amendments!.find((x) => x.status === "expires")!;
  const EXPIRES_ON = expiresAmendment.expiresOn!;
  const SWITCH_DATE = addDays(EXPIRES_ON, 1);

  it("改定日はコードではなく amendments から導出される（expiresOn → その翌日）", () => {
    expect(expiresAmendment).toBeDefined();
    expect(EXPIRES_ON >= ds.asOf).toBe(true); // 期限切れデータのままテストが通らないこと
    expect(amendmentEffectiveDate(expiresAmendment)).toBe(SWITCH_DATE);
    expect(upcomingChanges(ds, ds.asOf)[0].date).toBe(SWITCH_DATE);
  });

  it("期限日（expiresOn）当日までは期限内なので金額を出す", () => {
    const r = simulate(inp({ today: EXPIRES_ON }));
    expect(r.expired).toBe(false);
    expect(r.total).toBeGreaterThan(0);
  });

  it("#45 ★安全弁★ 改定日（期限日の翌日）には期限切れを検知し、古い金額で計算し続けない", () => {
    const r = simulate(inp({ today: SWITCH_DATE }));
    expect(r.expired).toBe(true);
    expect(r.total).toBeNull();
    expect(isDataExpired(ds, SWITCH_DATE)).toBe(true);
  });

  it("★データを差し替えれば追随する★ expiresOn を1年後にすると期限切れが解消し、次回改定も1年後になる", () => {
    const nextExpiresOn = `${Number(EXPIRES_ON.slice(0, 4)) + 1}${EXPIRES_ON.slice(4)}`;
    const next: SeidoDataset = {
      ...ds,
      amendments: ds.amendments!.map((a) =>
        a.status === "expires" && a.expiresOn === EXPIRES_ON ? { ...a, expiresOn: nextExpiresOn } : a,
      ),
    };
    expect(isDataExpired(next, SWITCH_DATE)).toBe(false);
    expect(upcomingChanges(next, SWITCH_DATE)[0].date).toBe(addDays(nextExpiresOn, 1));
    // 期限の判定にコード側の日付リテラルが一切関与していないこと
    expect(isDataExpired({ ...ds, amendments: [] }, "2030-01-01")).toBe(false);
  });

  it("★上限額はデータ参照★ 8/1に金額だけ差し替えても、給付額の計算式は同じ関数で追随する", () => {
    expect(WAGE_DAILY_MAX).toBe(DATA.ikujiKyugyoKyufuKin.wageDailyMax.value);
    expect(WAGE_DAILY_MIN).toBe(DATA.ikujiKyugyoKyufuKin.wageDailyMin.value);
    // 上限額が仮に 17,000円 に改定されても、同じ式で支給上限額が導出される
    const hypothetical = 17_000;
    expect(Math.floor(hypothetical * 30 * RATE_FIRST)).toBe(341_700);
    expect(salaryAtWageDailyMax()).toBe(WAGE_DAILY_MAX * 30);
  });

  it("★ハードコード禁止★ 実装に制度の数値の直書きがない（data/seido から読んでいる）", () => {
    // コメント（解説として数値に言及している箇所）を除いたコードだけを対象にする。
    // ★2026-07-17 D1ドライランで追加★ ツールページの散文（page.tsx）も対象
    const strip = (p: string) =>
      readFileSync(resolve(process.cwd(), p), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
    const banned = [
      /\b16[,_]?110\b/, // wageDailyMax
      /\b3[,_]?014\b/, // wageDailyMin
      /\b323[,_]?811\b/, // monthlyMax67
      /\b241[,_]?650\b/, // monthlyMax50
      /\b302[,_]?223\b/, // 出生時育児休業給付の上限
      /\b58[,_]?640\b/, // 出生後休業支援給付の上限
      /\b500[,_]?000\b/, // 出産育児一時金
      /\b488[,_]?000\b/,
      /0\.67/, // 給付率
      /0\.6667/, // 出産手当金の率（近似値）は使わない
      /0\.13/,
      /\b2026-0[78]-\d\d\b/, // 改定日の直書き
    ];
    for (const p of ["lib/tools/impl/sankyu-ikukyu-money.ts", "app/tools/[category]/[slug]/page.tsx"]) {
      const src = strip(p);
      for (const b of banned) {
        expect(src, `${b} が ${p} に直書きされています`).not.toMatch(b);
      }
    }
  });
});
