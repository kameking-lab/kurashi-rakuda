import { describe, expect, it } from "vitest";
import {
  AGE_THRESHOLD,
  calcChildSeatKitei,
  childSeatDataset,
  classifyObligation,
  EXEMPTIONS,
  EXEMPTION_KEYS,
  EXEMPTION_NUMBER_LABEL,
  PENALTY,
  STATISTICS,
  validateAge,
} from "@/components/tools/impl/ChildSeatKitei.calc";
import { isDataExpired } from "@/lib/tools/seido";
import childSeatKiteiJson from "@/data/seido/child-seat-kitei.json";

/*
 * チャイルドシート適合チェック（P3-T01）のテスト。
 * 仕様: specs/b-tools/p3-t01-child-seat-kitei.md
 * 制度事実は data/seido/child-seat-kitei.json を正とし、本テストでは
 * ハードコードされていないこと・参照が壊れていないことを重点的に確認する。
 */

const TODAY = "2026-07-18";

describe("AGE_THRESHOLD", () => {
  it("データから読み込まれた値である（6歳未満）", () => {
    expect(AGE_THRESHOLD).toBe(childSeatKiteiJson.data.obligation.ageThreshold.value);
    expect(AGE_THRESHOLD).toBe(6);
  });
});

describe("classifyObligation（年齢境界値）", () => {
  it("5歳 → obligated（使用義務あり）", () => {
    expect(classifyObligation(5)).toBe("obligated");
  });

  it("6歳 → notObligated（義務なし。6歳未満ではないため）", () => {
    expect(classifyObligation(6)).toBe("notObligated");
  });

  it("0歳 → obligated", () => {
    expect(classifyObligation(0)).toBe("obligated");
  });

  it("7歳 → notObligated", () => {
    expect(classifyObligation(7)).toBe("notObligated");
  });
});

describe("validateAge", () => {
  it("整数かつ範囲内なら ok", () => {
    expect(validateAge(3)).toEqual({ ok: true });
  });

  it("非整数はエラー", () => {
    const v = validateAge(5.5);
    expect(v.ok).toBe(false);
    expect(v.error).toBeTruthy();
  });

  it("負の値はエラー", () => {
    expect(validateAge(-1).ok).toBe(false);
  });

  it("上限を超える値はエラー", () => {
    expect(validateAge(21).ok).toBe(false);
  });
});

describe("calcChildSeatKitei（総合）", () => {
  it("5歳・免除選択なし → obligated・exemptionRelevant=true・matchedExemptionsは空", () => {
    const r = calcChildSeatKitei(5, [], TODAY);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.obligationStatus).toBe("obligated");
    expect(r.exemptionRelevant).toBe(true);
    expect(r.matchedExemptions).toEqual([]);
  });

  it("6歳 → notObligated・exemptionRelevant=false（免除を論じる前提がない）", () => {
    const r = calcChildSeatKitei(6, ["emergency"], TODAY);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.obligationStatus).toBe("notObligated");
    expect(r.exemptionRelevant).toBe(false);
    // 6歳以上は義務の前提がないため、選択があっても matchedExemptions は空にする
    expect(r.matchedExemptions).toEqual([]);
  });

  it("5歳・emergencyを選択 → matchedExemptionsに第8号が含まれる", () => {
    const r = calcChildSeatKitei(5, ["emergency"], TODAY);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.matchedExemptions).toHaveLength(1);
    expect(r.matchedExemptions[0].key).toBe("emergency");
    expect(r.matchedExemptions[0].number).toBe("第8号");
  });

  it("5歳・複数の免除事由を選択 → すべて含まれる", () => {
    const r = calcChildSeatKitei(5, ["medical", "commercialPassenger"], TODAY);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const keys = r.matchedExemptions.map((e) => e.key);
    expect(keys).toContain("medical");
    expect(keys).toContain("commercialPassenger");
  });

  it("不正な年齢は ok:false でエラーメッセージを返す", () => {
    const r = calcChildSeatKitei(-1, [], TODAY);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBeTruthy();
  });
});

describe("免除事由（施行令第26条の3の2第3項 全8号）", () => {
  it("8つの号がすべて定義されている", () => {
    expect(EXEMPTION_KEYS).toHaveLength(8);
  });

  it("号数ラベルが第1号〜第8号である", () => {
    expect(EXEMPTION_NUMBER_LABEL.structurallyImpossible).toBe("第1号");
    expect(EXEMPTION_NUMBER_LABEL.emergency).toBe("第8号");
  });

  it("各免除事由の条文要旨（value）がデータソースと一致する", () => {
    const sourceExemptions = childSeatKiteiJson.data.exemptions;
    expect(EXEMPTIONS.structurallyImpossible.value).toBe(sourceExemptions.structurallyImpossible.value);
    expect(EXEMPTIONS.seatCountExceeded.value).toBe(sourceExemptions.seatCountExceeded.value);
    expect(EXEMPTIONS.medical.value).toBe(sourceExemptions.medical.value);
    expect(EXEMPTIONS.physique.value).toBe(sourceExemptions.physique.value);
    expect(EXEMPTIONS.nursing.value).toBe(sourceExemptions.nursing.value);
    expect(EXEMPTIONS.commercialPassenger.value).toBe(sourceExemptions.commercialPassenger.value);
    expect(EXEMPTIONS.nonProfitTransport.value).toBe(sourceExemptions.nonProfitTransport.value);
    expect(EXEMPTIONS.emergency.value).toBe(sourceExemptions.emergency.value);
  });
});

describe("罰則（penalty） — 反則金が存在しないことの確認", () => {
  it("fineAmount は null である（0円ではなく『存在しない』）", () => {
    expect(PENALTY.fineAmount).toBeNull();
  });

  it("hasFine は false である", () => {
    expect(PENALTY.hasFine).toBe(false);
  });

  it("hasCriminalPenalty は false である（刑事罰なし）", () => {
    expect(PENALTY.hasCriminalPenalty).toBe(false);
  });

  it("違反点数は1点である", () => {
    expect(PENALTY.points).toBe(1);
  });

  it("責任を負う者は運転者である", () => {
    expect(PENALTY.liablePerson).toBe(childSeatKiteiJson.data.penalty.liablePerson.value);
  });
});

describe("統計（statistics） — データから取得されていることの確認", () => {
  it("usageRate はデータソースと一致する（82.4%）", () => {
    expect(STATISTICS.usageRate).toBe(childSeatKiteiJson.data.statistics.usageRate.value);
    expect(STATISTICS.usageRate).toBe(82.4);
  });

  it("usageRate5（5歳の使用率）はデータソースと一致する（66.7%）", () => {
    expect(STATISTICS.usageRate5).toBe(childSeatKiteiJson.data.statistics.usageRate5.value);
    expect(STATISTICS.usageRate5).toBe(66.7);
  });

  it("fatalityRatio（不使用者致死率）はデータソースと一致する（5.3倍）", () => {
    expect(STATISTICS.fatalityRatio).toBe(childSeatKiteiJson.data.statistics.fatalityRatio.value);
    expect(STATISTICS.fatalityRatio).toBe(5.3);
  });

  it("properSeatingRate（適切な着座の割合）はデータソースと一致する（55.6%）", () => {
    expect(STATISTICS.properSeatingRate).toBe(
      childSeatKiteiJson.data.statistics.properSeatingRate.value,
    );
    expect(STATISTICS.properSeatingRate).toBe(55.6);
  });
});

describe("isDataExpired（データ鮮度）", () => {
  it("2026-07-18時点ではデータは期限切れではない", () => {
    expect(isDataExpired(childSeatDataset, TODAY)).toBe(false);
  });

  it("calcChildSeatKitei の expired フラグも false になる", () => {
    const r = calcChildSeatKitei(3, [], TODAY);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.expired).toBe(false);
  });
});
