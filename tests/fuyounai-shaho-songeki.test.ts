import { describe, expect, it } from "vitest";
import seido from "@/data/seido/fuyounai-shaho-songeki-bunkiten.json";
import {
  BURDEN_RATE_40_TO64,
  BURDEN_RATE_UNDER40,
  calcFuyounaiShaho,
  KOKUMIN_NENKIN_ANNUAL,
  WALL_106,
  WALL_130,
} from "@/components/tools/impl/FuyounaiShahoSongeki.calc";

/** 仕様書 specs/s-tools/16-fuyounai-shaho-songeki.md のテストケース表を反映 */

describe("FuyounaiShahoSongeki.calc — 料率・壁の金額はデータ由来", () => {
  it("#1 本人負担料率0.141/0.1491・壁106万/130万・国年年額215,040", () => {
    expect(BURDEN_RATE_UNDER40).toBe(seido.data.songekiStructure.cliff106.employeeBurdenRateUnder40.value);
    expect(BURDEN_RATE_UNDER40).toBe(0.141);
    expect(BURDEN_RATE_40_TO64).toBe(0.1491);
    expect(WALL_106).toBe(1060000);
    expect(WALL_130).toBe(1300000);
    expect(KOKUMIN_NENKIN_ANNUAL).toBe(17920 * 12);
  });
});

describe("FuyounaiShahoSongeki.calc — 106万で勤務先社保に加入", () => {
  it("#2 40歳未満・年収110万 → 社保料155,100・手取り944,900・働き損ゾーン", () => {
    const r = calcFuyounaiShaho({ scenario: "join-shaho", ageGroup: "under40", targetIncome: 1100000 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.socialInsurance).toBe(155100);
    expect(r.takeHome).toBe(944900);
    expect(r.diffVsJustBelow).toBeLessThan(0);
    expect(r.inLossZone).toBe(true);
  });

  it("#3 40歳未満の損益分岐点は約123.4万（wall/(1−0.141)を切り上げ）", () => {
    const r = calcFuyounaiShaho({ scenario: "join-shaho", ageGroup: "under40", targetIncome: 1100000 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.breakEvenIncome).toBe(Math.ceil(WALL_106 / (1 - BURDEN_RATE_UNDER40)));
    expect(r.breakEvenIncome).toBe(1233994);
  });

  it("#4 損益分岐点で働けば手取りは壁手前の水準以上に戻る", () => {
    const be = calcFuyounaiShaho({ scenario: "join-shaho", ageGroup: "under40", targetIncome: 1100000 });
    expect(be.ok).toBe(true);
    if (!be.ok) return;
    const r = calcFuyounaiShaho({
      scenario: "join-shaho",
      ageGroup: "under40",
      targetIncome: be.breakEvenIncome,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.takeHome).toBeGreaterThanOrEqual(r.takeHomeJustBelowWall);
    expect(r.inLossZone).toBe(false);
  });

  it("#5 分岐点を超える年収130万は働き損ゾーンを脱する（手取り増）", () => {
    const r = calcFuyounaiShaho({ scenario: "join-shaho", ageGroup: "under40", targetIncome: 1300000 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.inLossZone).toBe(false);
    expect(r.diffVsJustBelow).toBeGreaterThan(0);
  });

  it("#6 40歳以上は介護保険料の分だけ料率が高く分岐点も上がる", () => {
    const u = calcFuyounaiShaho({ scenario: "join-shaho", ageGroup: "under40", targetIncome: 1100000 });
    const o = calcFuyounaiShaho({ scenario: "join-shaho", ageGroup: "age40to64", targetIncome: 1100000 });
    expect(u.ok && o.ok).toBe(true);
    if (!u.ok || !o.ok) return;
    expect(o.socialInsurance).toBeGreaterThan(u.socialInsurance);
    expect(o.breakEvenIncome).toBeGreaterThan(u.breakEvenIncome);
    expect(o.breakEvenIncome).toBe(Math.ceil(WALL_106 / (1 - BURDEN_RATE_40_TO64)));
  });
});

describe("FuyounaiShahoSongeki.calc — 130万で自分で加入（国保は別途）", () => {
  it("#7 年収140万 → 国民年金215,040・手取り1,184,960・国保は上乗せ表示", () => {
    const r = calcFuyounaiShaho({ scenario: "self-insure", ageGroup: "under40", targetIncome: 1400000 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.socialInsurance).toBe(215040);
    expect(r.takeHome).toBe(1184960);
    expect(r.kokuhoNotIncluded).toBe(true);
  });

  it("#8 国年のみの損益分岐点は 130万＋215,040＝1,515,040", () => {
    const r = calcFuyounaiShaho({ scenario: "self-insure", ageGroup: "under40", targetIncome: 1400000 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.breakEvenIncome).toBe(WALL_130 + KOKUMIN_NENKIN_ANNUAL);
    expect(r.breakEvenIncome).toBe(1515040);
  });

  it("#9 年齢によらず自分で加入の社保料は国民年金額（介護料率は使わない）", () => {
    const u = calcFuyounaiShaho({ scenario: "self-insure", ageGroup: "under40", targetIncome: 1400000 });
    const o = calcFuyounaiShaho({ scenario: "self-insure", ageGroup: "age40to64", targetIncome: 1400000 });
    expect(u.ok && o.ok).toBe(true);
    if (!u.ok || !o.ok) return;
    expect(u.socialInsurance).toBe(o.socialInsurance);
  });
});

describe("FuyounaiShahoSongeki.calc — バリデーション", () => {
  it("#10 年収0以下はエラー", () => {
    expect(calcFuyounaiShaho({ scenario: "join-shaho", ageGroup: "under40", targetIncome: 0 }).ok).toBe(false);
  });

  it("#11 壁のすぐ上（106万ちょうど）は働き損ゾーンに入る", () => {
    const r = calcFuyounaiShaho({ scenario: "join-shaho", ageGroup: "under40", targetIncome: WALL_106 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.inLossZone).toBe(true);
  });

  it("#12 壁未満（105万）は加入対象外＝働き損ゾーンではない", () => {
    const r = calcFuyounaiShaho({ scenario: "join-shaho", ageGroup: "under40", targetIncome: 1050000 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.inLossZone).toBe(false);
  });

  it("#13 壁手前の手取り目安は壁の金額に等しい", () => {
    const r = calcFuyounaiShaho({ scenario: "join-shaho", ageGroup: "under40", targetIncome: 1100000 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.takeHomeJustBelowWall).toBe(WALL_106);
  });

  it("#14 self-insureの壁手前手取り目安は130万", () => {
    const r = calcFuyounaiShaho({ scenario: "self-insure", ageGroup: "under40", targetIncome: 1400000 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.takeHomeJustBelowWall).toBe(WALL_130);
  });

  it("#15 self-insureで年収が分岐点未満は働き損ゾーン", () => {
    const r = calcFuyounaiShaho({ scenario: "self-insure", ageGroup: "under40", targetIncome: 1400000 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.inLossZone).toBe(true);
  });

  it("#16 self-insureで分岐点以上は働き損ゾーンを脱する", () => {
    const r = calcFuyounaiShaho({ scenario: "self-insure", ageGroup: "under40", targetIncome: 1600000 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.inLossZone).toBe(false);
    expect(r.takeHome).toBeGreaterThan(r.takeHomeJustBelowWall);
  });

  it("#17 join-shaho: 手取りは年収に対して単調増加（税抜きの一次式）", () => {
    const a = calcFuyounaiShaho({ scenario: "join-shaho", ageGroup: "under40", targetIncome: 1100000 });
    const b = calcFuyounaiShaho({ scenario: "join-shaho", ageGroup: "under40", targetIncome: 1500000 });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(b.takeHome).toBeGreaterThan(a.takeHome);
  });

  it("#18 社保料は年収×本人負担料率（四捨五入）", () => {
    const r = calcFuyounaiShaho({ scenario: "join-shaho", ageGroup: "age40to64", targetIncome: 1200000 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.socialInsurance).toBe(Math.round(1200000 * BURDEN_RATE_40_TO64));
  });

  it("#19 self-insure: 国保が別途上乗せされるフラグが立つ（国年のみの試算である明示）", () => {
    const r = calcFuyounaiShaho({ scenario: "self-insure", ageGroup: "age40to64", targetIncome: 1400000 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.kokuhoNotIncluded).toBe(true);
  });

  it("#20 join-shaho: 国保上乗せフラグは立たない（勤務先社保に加入するため）", () => {
    const r = calcFuyounaiShaho({ scenario: "join-shaho", ageGroup: "under40", targetIncome: 1100000 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.kokuhoNotIncluded).toBe(false);
  });
});
