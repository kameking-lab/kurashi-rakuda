import { describe, expect, it } from "vitest";
import { calculateYobousesshu } from "@/components/tools/impl/Yobousesshu.calc";

/*
 * 予防接種スケジューラー（Q3-06）のテスト。
 * 仕様: specs/b-tools/18-vaccination-scheduler.md の「テストケース（12件、基準日は2026-07-17）」を
 * 反映しつつ、本実装の判定ロジック（data/tables/yobousesshu.json 準拠）に基づいて期待値を組み立てる。
 *
 * 実装上の解釈メモ（仕様書の例示との差分）:
 * - 日本脳炎第2期「9歳〜13歳に至るまで」は、他の「◯歳に至るまで」表記
 *   （例: B型肝炎「1歳に至るまで」＝テスト4で1歳到達日ちょうどに終了と判定）と同一の
 *   境界解釈（終了年齢に達した日を含めて終了）を一貫して適用する。そのため13歳6ヶ月時点は
 *   「対象期間を過ぎています」と判定する（本テストではこの一貫した境界解釈を検証する）。
 */

const BASE = "2026-07-17";

function findVaccine(result: ReturnType<typeof calculateYobousesshu>, id: string) {
  if (!result.ok) throw new Error("expected ok result");
  const v = result.vaccines.find((x) => x.id === id);
  if (!v) throw new Error(`vaccine not found: ${id}`);
  return v;
}

describe("calculateYobousesshu", () => {
  it("1: 本日生まれ（生後0ヶ月0日）は全ワクチンが対象期間前で、4種は生後2ヶ月から開始と表示", () => {
    const r = calculateYobousesshu({ birthDate: "2026-07-17", sex: "unspecified", todayOverride: BASE });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.ageSummary.label).toBe("生後0ヶ月");
    expect(r.vaccines.every((v) => v.status === "before")).toBe(true);

    for (const id of ["hepatitis_b", "rotavirus", "gosyu_kongo", "shoni_haien_kyukin"]) {
      const v = findVaccine(r, id);
      expect(v.doseEstimates[0].label).toBe("2026年9月頃");
    }
  });

  it("2: 生後2ヶ月0日は該当4ワクチンの1回目が対象期間内で、目安時期は今月", () => {
    const r = calculateYobousesshu({ birthDate: "2026-05-17", sex: "unspecified", todayOverride: BASE });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.ageSummary.label).toBe("生後2ヶ月");
    for (const id of ["hepatitis_b", "rotavirus", "gosyu_kongo", "shoni_haien_kyukin"]) {
      const v = findVaccine(r, id);
      expect(v.status).toBe("within");
      expect(v.doseEstimates[0].label).toBe("2026年7月頃");
    }
  });

  it("3: 生後7ヶ月0日はBCGが対象期間内（標準的接種期間5〜8ヶ月）", () => {
    const r = calculateYobousesshu({ birthDate: "2025-12-17", sex: "unspecified", todayOverride: BASE });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.ageSummary.label).toBe("生後7ヶ月");
    expect(findVaccine(r, "bcg").status).toBe("within");
    const hepB = findVaccine(r, "hepatitis_b");
    expect(hepB.status).toBe("within");
    expect(hepB.doseEstimates[2].label).toBe("2026年7月頃"); // 3回目の目安が現在月に近い
  });

  it("4: ちょうど1歳0ヶ月はMR第1期・水痘が開始し、B型肝炎は対象終了（境界値）", () => {
    const r = calculateYobousesshu({ birthDate: "2025-07-17", sex: "unspecified", todayOverride: BASE });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.ageSummary.label).toBe("1歳0ヶ月");
    expect(findVaccine(r, "mr_1").status).toBe("within");
    expect(findVaccine(r, "suito").status).toBe("within");
    expect(findVaccine(r, "hepatitis_b").status).toBe("ended");
  });

  it("5: ちょうど3歳0ヶ月は日本脳炎第1期が開始し、肺炎球菌は対象期間内だが完了目安時期を過ぎている旨を表示", () => {
    const r = calculateYobousesshu({ birthDate: "2023-07-17", sex: "unspecified", todayOverride: BASE });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(findVaccine(r, "nippon_noen_1").status).toBe("within");
    const pneumo = findVaccine(r, "shoni_haien_kyukin");
    expect(pneumo.status).toBe("within");
    expect(pneumo.statusLabel).toMatch(/完了目安時期を過ぎています/);
  });

  it("6: 5歳6ヶ月（就学前年度想定）はMR第2期が対象期間内（年度4/1基準の判定）", () => {
    const r = calculateYobousesshu({ birthDate: "2021-01-17", sex: "unspecified", todayOverride: BASE });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(findVaccine(r, "mr_2").status).toBe("within");
  });

  it("7: ちょうど11歳0ヶ月・女性は二種混合第2期とHPVがともに対象期間内として開始", () => {
    const r = calculateYobousesshu({ birthDate: "2015-07-17", sex: "female", todayOverride: BASE });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(findVaccine(r, "nishu_kongo_2").status).toBe("within");
    const hpv = findVaccine(r, "hpv");
    expect(hpv.status).toBe("within");
    expect(hpv.statusLabel).not.toMatch(/女性のみ/);
  });

  it("8: 13歳6ヶ月・女性はHPVが対象期間内（高校1年相当に近い）", () => {
    const r = calculateYobousesshu({ birthDate: "2013-01-17", sex: "female", todayOverride: BASE });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(findVaccine(r, "hpv").status).toBe("within");
  });

  it("9: ちょうど16歳0ヶ月・女性はHPVがまだ対象期間内（学年末=年度末までが対象）", () => {
    const r = calculateYobousesshu({ birthDate: "2010-07-17", sex: "female", todayOverride: BASE });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const hpv = findVaccine(r, "hpv");
    expect(hpv.status).toBe("within");
    expect(hpv.catchupNote).toBeNull();

    // 対象年度末（2027-03-31）を過ぎるとキャッチアップ接種の注記付きで「対象期間を過ぎています」になる
    const after = calculateYobousesshu({
      birthDate: "2010-07-17",
      sex: "female",
      todayOverride: "2027-04-01",
    });
    expect(after.ok).toBe(true);
    if (!after.ok) return;
    const hpvAfter = findVaccine(after, "hpv");
    expect(hpvAfter.status).toBe("ended");
    expect(hpvAfter.catchupNote).toMatch(/キャッチアップ接種/);
  });

  it("10: ちょうど18歳0ヶ月は全ワクチンが対象期間を過ぎている（バリデーションは通る）", () => {
    const r = calculateYobousesshu({ birthDate: "2008-07-17", sex: "unspecified", todayOverride: BASE });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.vaccines.every((v) => v.status === "ended")).toBe(true);
  });

  it("11: 生年月日が未来日はバリデーションエラー", () => {
    const r = calculateYobousesshu({ birthDate: "2026-08-01", sex: "unspecified", todayOverride: BASE });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/生年月日をご確認ください/);
  });

  it("12: 13歳6ヶ月・男性はHPV欄のみ「対象は女性のみ」、他は#8と同様に判定される", () => {
    const r = calculateYobousesshu({ birthDate: "2013-01-17", sex: "male", todayOverride: BASE });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const hpv = findVaccine(r, "hpv");
    expect(hpv.status).toBe("male-not-applicable");
    expect(hpv.statusLabel).toMatch(/女性のみ/);
    // 二種混合第2期は「11歳〜13歳に至るまで」。13歳6ヶ月は他の「◯歳に至るまで」ワクチンと
    // 同じ境界解釈で対象終了と判定する（性別に関わらず同じ判定になることを確認する）。
    expect(findVaccine(r, "nishu_kongo_2").status).toBe("ended");
  });

  it("13: 19歳の誕生日当日はバリデーションエラー（範囲外）", () => {
    const r = calculateYobousesshu({ birthDate: "2007-07-17", sex: "unspecified", todayOverride: BASE });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/0〜18歳の範囲外/);
  });

  it("14: 19歳の誕生日前日はまだ範囲内（境界値、バリデーションを通過する）", () => {
    const r = calculateYobousesshu({ birthDate: "2007-07-18", sex: "unspecified", todayOverride: BASE });
    expect(r.ok).toBe(true);
  });

  it("15: 不正な日付形式はバリデーションエラー", () => {
    const r = calculateYobousesshu({ birthDate: "2025/01/01", sex: "unspecified", todayOverride: BASE });
    expect(r.ok).toBe(false);
  });

  it("16: 存在しない日付（2月30日）はバリデーションエラー", () => {
    const r = calculateYobousesshu({ birthDate: "2025-02-30", sex: "unspecified", todayOverride: BASE });
    expect(r.ok).toBe(false);
  });

  it("17: ワクチン一覧は対象開始が早い順（sortKey昇順）に自動ソートされる", () => {
    const r = calculateYobousesshu({ birthDate: "2015-07-17", sex: "female", todayOverride: BASE });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const keys = r.vaccines.map((v) => v.sortKey);
    const sorted = [...keys].sort((a, b) => a - b);
    expect(keys).toEqual(sorted);
  });

  it("18: MR第2期は満6歳到達日が4/1のとき、その年度末(3/31)までが対象で翌日は対象終了（境界値）", () => {
    const within = calculateYobousesshu({
      birthDate: "2020-04-01",
      sex: "unspecified",
      todayOverride: "2026-03-31",
    });
    expect(within.ok).toBe(true);
    if (within.ok) expect(findVaccine(within, "mr_2").status).toBe("within");

    const ended = calculateYobousesshu({
      birthDate: "2020-04-01",
      sex: "unspecified",
      todayOverride: "2026-04-01",
    });
    expect(ended.ok).toBe(true);
    if (ended.ok) expect(findVaccine(ended, "mr_2").status).toBe("ended");
  });

  it("19: YMYL固定文言（3段落）が結果に含まれ、医療機関への相談を促す文言を含む", () => {
    const r = calculateYobousesshu({ birthDate: "2020-01-01", sex: "unspecified", todayOverride: BASE });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.disclaimer.length).toBe(3);
    expect(r.disclaimer.every((p) => p.length > 20)).toBe(true);
    expect(r.disclaimer.join(" ")).toMatch(/かかりつけ医|医療機関/);
    expect(r.basisYear).toBe("2026年度");
  });
});

describe("G2検収指摘の回帰テスト（4/1生まれの年度末カットオフ）", () => {
  it("4/1生まれのHPV上限は16歳到達日（誕生日の前日=3/31）と同年の3/31", () => {
    // 2010-04-01生まれ: 16歳到達日は2026-03-31 → 上限は2026-03-31
    const before = calculateYobousesshu({ birthDate: "2010-04-01", sex: "female", todayOverride: "2026-03-31" });
    expect(before.ok).toBe(true);
    if (before.ok) expect(findVaccine(before, "hpv").status).toBe("within");
    const after = calculateYobousesshu({ birthDate: "2010-04-01", sex: "female", todayOverride: "2026-04-01" });
    expect(after.ok).toBe(true);
    if (after.ok) expect(findVaccine(after, "hpv").status).toBe("ended");
  });

  it("4/2生まれのHPV上限は従来どおり翌年3/31", () => {
    const r = calculateYobousesshu({ birthDate: "2010-04-02", sex: "female", todayOverride: "2027-03-31" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(findVaccine(r, "hpv").status).toBe("within");
    const r2 = calculateYobousesshu({ birthDate: "2010-04-02", sex: "female", todayOverride: "2027-04-01" });
    expect(r2.ok).toBe(true);
    if (r2.ok) expect(findVaccine(r2, "hpv").status).toBe("ended");
  });
});
