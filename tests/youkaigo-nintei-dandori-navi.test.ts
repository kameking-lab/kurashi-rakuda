import { describe, expect, it } from "vitest";
import {
  calcNavi,
  calcIllustrativeTimeline,
  estimateStage,
  validateDate,
  isApplicationFarInFuture,
  isApplicationVeryOld,
  LEGAL_PERIOD_DAYS,
  NATIONAL_AVERAGE_DAYS,
  WITHIN_30_DAYS_SHARE,
  PROCESS_STEPS,
  POST_DECISION_STEPS,
  STAGE_LABELS,
  kaigoNinteiDataset,
  kaigoHokenDataset,
} from "@/components/tools/impl/YoukaigoNinteiDandoriNavi.calc";
import { isDataExpired } from "@/lib/tools/seido";

/**
 * specs/b-tools/p2-t37-youkaigo-nintei-dandori-navi.md 「テストケース」を反映。
 * data/seido/kaigo-nintei-shori-kikan.json（P2-D05で新規追加）の一次条文に基づく。
 */

describe("data/seido/kaigo-nintei-shori-kikan.json 由来の定数", () => {
  it("原則の処理期間は30日（介護保険法第27条第11項）", () => {
    expect(LEGAL_PERIOD_DAYS).toBe(30);
  });

  it("全国平均の認定審査期間・30日以内達成率が令和5年度実績どおり", () => {
    expect(NATIONAL_AVERAGE_DAYS).toBeCloseTo(39.8);
    expect(WITHIN_30_DAYS_SHARE).toBeCloseTo(25.1);
  });

  it("手続の流れは6ステップ（申請〜認定結果の通知）", () => {
    expect(PROCESS_STEPS.length).toBe(6);
    expect(PROCESS_STEPS[0]!.key).toBe("shinsei");
    expect(PROCESS_STEPS.at(-1)!.key).toBe("tsuchi");
  });

  it("認定後の手続（ケアプラン作成・サービス利用開始）が定義されている", () => {
    expect(POST_DECISION_STEPS.map((s) => s.key)).toEqual(["care_plan", "service_start"]);
  });

  it("データが期限切れ扱いになっていない（2026-07-17時点）", () => {
    expect(isDataExpired(kaigoNinteiDataset, "2026-07-17")).toBe(false);
    expect(isDataExpired(kaigoHokenDataset, "2026-07-17")).toBe(false);
  });
});

describe("validateDate", () => {
  it("正しい日付を受理する", () => {
    expect(validateDate("2026-07-17").ok).toBe(true);
  });

  it("形式が不正な文字列を拒否する", () => {
    expect(validateDate("2026/07/17").ok).toBe(false);
    expect(validateDate("").ok).toBe(false);
  });

  it("実在しない日付（2/30など）を拒否する", () => {
    expect(validateDate("2026-02-30").ok).toBe(false);
  });
});

describe("calcIllustrativeTimeline", () => {
  it("認定調査・主治医意見書は並行して進む前提で、遅い方に審査会の日数を足す（直列の20日にはしない）", () => {
    const t = calcIllustrativeTimeline("2026-07-01");
    expect(t.ninteiChosaByDay).toBe(7);
    expect(t.shujiiIkenshoByDay).toBe(13);
    expect(t.bothReadyByDay).toBe(13); // max(7, 13)
    expect(t.shinsakaiByDay).toBe(25); // 13 + 12
  });

  it("目安の日付が addDays で申請日から正しく計算される", () => {
    const t = calcIllustrativeTimeline("2026-07-01");
    expect(t.ninteiChosaDate).toBe("2026-07-08");
    expect(t.shujiiIkenshoDate).toBe("2026-07-14");
    expect(t.shinsakaiDate).toBe("2026-07-26");
  });
});

describe("estimateStage", () => {
  const t = calcIllustrativeTimeline("2026-07-01");

  it("未申請（daysElapsed=null）は before_application", () => {
    expect(estimateStage(null, t)).toBe("before_application");
  });

  it("申請当日（0日）は shinsei", () => {
    expect(estimateStage(0, t)).toBe("shinsei");
  });

  it("1日〜6日（認定調査の目安7日未満）は chosa_and_ikensho", () => {
    expect(estimateStage(3, t)).toBe("chosa_and_ikensho");
    expect(estimateStage(6, t)).toBe("chosa_and_ikensho");
  });

  it("7日〜12日（意見書の目安13日未満）は ikensho_machi", () => {
    expect(estimateStage(7, t)).toBe("ikensho_machi");
    expect(estimateStage(12, t)).toBe("ikensho_machi");
  });

  it("13日〜24日（審査会の目安25日未満）は shinsakai", () => {
    expect(estimateStage(13, t)).toBe("shinsakai");
    expect(estimateStage(24, t)).toBe("shinsakai");
  });

  it("25日〜30日（原則の期限以内）は kekka_machi", () => {
    expect(estimateStage(25, t)).toBe("kekka_machi");
    expect(estimateStage(30, t)).toBe("kekka_machi");
  });

  it("31日以上（原則の期限超過）は over_deadline", () => {
    expect(estimateStage(31, t)).toBe("over_deadline");
    expect(estimateStage(90, t)).toBe("over_deadline");
  });

  it("全ての StageKey に日本語ラベルが定義されている", () => {
    const keys: (keyof typeof STAGE_LABELS)[] = [
      "before_application",
      "shinsei",
      "chosa_and_ikensho",
      "ikensho_machi",
      "shinsakai",
      "kekka_machi",
      "over_deadline",
    ];
    for (const k of keys) {
      expect(STAGE_LABELS[k]).toBeTruthy();
    }
  });
});

describe("calcNavi（総合）", () => {
  it("申請予定日が未来日のとき、申請前として扱い残り日数を返す", () => {
    const r = calcNavi({ applicationDate: "2026-08-01", today: "2026-07-17" });
    expect(r.applied).toBe(false);
    expect(r.daysUntilApplication).toBe(15);
    expect(r.daysElapsedSinceApplication).toBeNull();
    expect(r.estimatedStage).toBe("before_application");
  });

  it("申請日が今日と同じとき、経過0日・shinsei", () => {
    const r = calcNavi({ applicationDate: "2026-07-17", today: "2026-07-17" });
    expect(r.applied).toBe(true);
    expect(r.daysElapsedSinceApplication).toBe(0);
    expect(r.estimatedStage).toBe("shinsei");
  });

  it("申請から30日以内（境界含む）は原則の期限を超過していない", () => {
    const r = calcNavi({ applicationDate: "2026-06-17", today: "2026-07-17" });
    expect(r.daysElapsedSinceApplication).toBe(30);
    expect(r.isPastLegalDeadline).toBe(false);
    expect(r.estimatedStage).toBe("kekka_machi");
  });

  it("申請から31日経過すると原則の期限を超過している", () => {
    const r = calcNavi({ applicationDate: "2026-06-16", today: "2026-07-17" });
    expect(r.daysElapsedSinceApplication).toBe(31);
    expect(r.isPastLegalDeadline).toBe(true);
    expect(r.estimatedStage).toBe("over_deadline");
  });

  it("原則の期限日（legalDeadlineDate）は申請日から30日後", () => {
    const r = calcNavi({ applicationDate: "2026-07-01", today: "2026-07-17" });
    expect(r.legalDeadlineDate).toBe("2026-07-31");
  });

  it("うるう年をまたぐ申請日でも30日後を正しく計算する", () => {
    const r = calcNavi({ applicationDate: "2028-01-15", today: "2028-01-15" });
    expect(r.legalDeadlineDate).toBe("2028-02-14");
  });

  it("expired フラグは2026-07-17時点で false", () => {
    const r = calcNavi({ applicationDate: "2026-07-01", today: "2026-07-17" });
    expect(r.expired).toBe(false);
  });
});

describe("isApplicationFarInFuture / isApplicationVeryOld（ソフトバリデーション）", () => {
  it("1年以上先の申請予定日を警告する", () => {
    expect(isApplicationFarInFuture("2027-08-01", "2026-07-17")).toBe(true);
    expect(isApplicationFarInFuture("2026-12-01", "2026-07-17")).toBe(false);
  });

  it("2年以上前の申請日を警告する", () => {
    expect(isApplicationVeryOld("2024-01-01", "2026-07-17")).toBe(true);
    expect(isApplicationVeryOld("2025-01-01", "2026-07-17")).toBe(false);
  });
});
