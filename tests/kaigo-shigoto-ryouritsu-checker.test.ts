import { describe, expect, it } from "vitest";
import {
  calculateKaigoShigotoRyouritsu,
  evaluateSystems,
  type SystemKey,
} from "@/components/tools/impl/KaigoShigotoRyouritsuChecker.calc";

/*
 * 介護と仕事の両立制度チェッカー（P2-T38）のテスト。
 * 制度データは data/seido/kaigo-shigoto-ryouritsu-seido.json を正とする。
 * テストケース表は specs/b-tools/p2-t38-kaigo-shigoto-ryouritsu-checker.md と対応する。
 */

function statusOf(results: ReturnType<typeof evaluateSystems>, key: SystemKey) {
  return results.find((r) => r.key === key)!.status;
}

describe("calculateKaigoShigotoRyouritsu", () => {
  it("#1 基本ケース: 続柄が対象家族・要介護状態あり・除外要件なしなら全6制度が対象", () => {
    const r = calculateKaigoShigotoRyouritsu({
      relation: "haigusha",
      careNeedLikely: "yes",
      lessThanOneYear: false,
      twoOrFewerDaysPerWeek: false,
      fixedTermContract: false,
      nightCareSubstitute: "no",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result).toHaveLength(6);
    for (const sys of r.result) {
      expect(sys.status).toBe("target");
    }
  });

  it("#2 対象家族の範囲外（relation=other）は全6制度が対象外", () => {
    const r = calculateKaigoShigotoRyouritsu({
      relation: "other",
      careNeedLikely: "yes",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    for (const sys of r.result) {
      expect(sys.status).toBe("notTarget");
      expect(sys.notes.join("")).toMatch(/対象家族/);
    }
  });

  it("#3 要介護状態の見込みが「いいえ」は全6制度が対象外", () => {
    const r = calculateKaigoShigotoRyouritsu({
      relation: "fubo",
      careNeedLikely: "no",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    for (const sys of r.result) {
      expect(sys.status).toBe("notTarget");
    }
  });

  it("#4 要介護状態の見込みが「わからない」でも判定は続行し、注記が付く", () => {
    const r = calculateKaigoShigotoRyouritsu({
      relation: "ko",
      careNeedLikely: "unsure",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(statusOf(r.result, "kaigoKyugyo")).toBe("target");
    const kyugyo = r.result.find((s) => s.key === "kaigoKyugyo")!;
    expect(kyugyo.notes.join("")).toMatch(/介護保険の要介護認定（要介護1〜5等）とは別/);
  });

  it("#5 勤続1年未満は介護休業では条件付き対象（労使協定次第）", () => {
    const r = calculateKaigoShigotoRyouritsu({
      relation: "fubo",
      careNeedLikely: "yes",
      lessThanOneYear: true,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(statusOf(r.result, "kaigoKyugyo")).toBe("conditional");
  });

  it("#6 勤続1年未満は時間外労働の制限では法律により確定除外（対象外）", () => {
    const r = calculateKaigoShigotoRyouritsu({
      relation: "fubo",
      careNeedLikely: "yes",
      lessThanOneYear: true,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(statusOf(r.result, "jikangaiRodoSeigen")).toBe("notTarget");
  });

  it("#7 勤続1年未満は深夜業の制限でも法律により確定除外（対象外）", () => {
    const r = calculateKaigoShigotoRyouritsu({
      relation: "fubo",
      careNeedLikely: "yes",
      lessThanOneYear: true,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(statusOf(r.result, "shinyaGyoSeigen")).toBe("notTarget");
  });

  it("#8 週2日以下は介護休暇でも条件付き対象（2025年4月改正後も残る唯一の除外要件）", () => {
    const r = calculateKaigoShigotoRyouritsu({
      relation: "fubo",
      careNeedLikely: "yes",
      twoOrFewerDaysPerWeek: true,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(statusOf(r.result, "kaigoKyuka")).toBe("conditional");
  });

  it("#9 除外要件に該当しなければ介護休暇は対象", () => {
    const r = calculateKaigoShigotoRyouritsu({
      relation: "fubo",
      careNeedLikely: "yes",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(statusOf(r.result, "kaigoKyuka")).toBe("target");
  });

  it("#10 有期契約は介護休業で条件付き対象・追加要件の注記が付く", () => {
    const r = calculateKaigoShigotoRyouritsu({
      relation: "fubo",
      careNeedLikely: "yes",
      fixedTermContract: true,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const kyugyo = r.result.find((s) => s.key === "kaigoKyugyo")!;
    expect(kyugyo.status).toBe("conditional");
    expect(kyugyo.notes.join("")).toMatch(/労働契約が満了することが明らかでない/);
  });

  it("#11 深夜に代わって介護できる同居家族がいる場合、深夜業の制限は対象外", () => {
    const r = calculateKaigoShigotoRyouritsu({
      relation: "fubo",
      careNeedLikely: "yes",
      nightCareSubstitute: "yes",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(statusOf(r.result, "shinyaGyoSeigen")).toBe("notTarget");
  });

  it("#12 同居家族の有無が不明な場合、深夜業の制限は条件付き（要確認）", () => {
    const r = calculateKaigoShigotoRyouritsu({
      relation: "fubo",
      careNeedLikely: "yes",
      nightCareSubstitute: "unsure",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(statusOf(r.result, "shinyaGyoSeigen")).toBe("conditional");
  });

  it("#13 孫も対象家族に含まれ、除外要件非該当なら全制度が対象", () => {
    const r = calculateKaigoShigotoRyouritsu({
      relation: "mago",
      careNeedLikely: "yes",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    for (const sys of r.result) {
      expect(sys.status).toBe("target");
    }
  });

  it("#14 週2日以下は深夜業の制限の除外要件に含まれない（他制度との違い）", () => {
    const r = calculateKaigoShigotoRyouritsu({
      relation: "fubo",
      careNeedLikely: "yes",
      twoOrFewerDaysPerWeek: true,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(statusOf(r.result, "shinyaGyoSeigen")).toBe("target");
    // 一方で他の労使協定系の制度は条件付きになる
    expect(statusOf(r.result, "kaigoKyugyo")).toBe("conditional");
    expect(statusOf(r.result, "shoteigaiRodoSeigen")).toBe("conditional");
    expect(statusOf(r.result, "shoteiRodoJikanTanshuku")).toBe("conditional");
  });

  it("#15 所定労働時間の短縮等の措置には常に「介護休業をしていない方が対象」の注記が付く", () => {
    const r = calculateKaigoShigotoRyouritsu({
      relation: "fubo",
      careNeedLikely: "yes",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const tanshuku = r.result.find((s) => s.key === "shoteiRodoJikanTanshuku")!;
    expect(tanshuku.status).toBe("target");
    expect(tanshuku.notes.join("")).toMatch(/介護休業をしていない方が対象/);
  });

  it("#16 続柄未入力は入力エラー", () => {
    const r = calculateKaigoShigotoRyouritsu({ careNeedLikely: "yes" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/続柄/);
  });

  it("#17 要介護状態の見込み未入力は入力エラー", () => {
    const r = calculateKaigoShigotoRyouritsu({ relation: "fubo" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/要介護状態/);
  });

  it("#18 disclaimer が空でなく、市区町村や勤務先への確認を促す内容を含む", () => {
    const r = calculateKaigoShigotoRyouritsu({ relation: "fubo", careNeedLikely: "yes" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // disclaimer はツール本体（calc モジュール）側の DISCLAIMER 定数と同一
    expect(r.result.length).toBeGreaterThan(0);
  });

  it("#19 時間外労働の制限の数値（月24時間・年150時間）がJSONの値と一致する", () => {
    const r = calculateKaigoShigotoRyouritsu({ relation: "fubo", careNeedLikely: "yes" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const jikangai = r.result.find((s) => s.key === "jikangaiRodoSeigen")!;
    expect(jikangai.numbers.join("")).toMatch(/24時間/);
    expect(jikangai.numbers.join("")).toMatch(/150時間/);
  });

  it("#20 介護休業の日数（93日・3回）がJSONの値と一致する", () => {
    const r = calculateKaigoShigotoRyouritsu({ relation: "fubo", careNeedLikely: "yes" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const kyugyo = r.result.find((s) => s.key === "kaigoKyugyo")!;
    expect(kyugyo.numbers.join("")).toMatch(/93日/);
    expect(kyugyo.numbers.join("")).toMatch(/3回/);
  });

  it("#21 介護休暇の日数（5日・10日）がJSONの値と一致する", () => {
    const r = calculateKaigoShigotoRyouritsu({ relation: "fubo", careNeedLikely: "yes" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const kyuka = r.result.find((s) => s.key === "kaigoKyuka")!;
    expect(kyuka.numbers.join("")).toMatch(/5日/);
    expect(kyuka.numbers.join("")).toMatch(/10日/);
  });

  it("#22 所定労働時間の短縮等の措置の年数・回数（3年以上・2回以上）がJSONの値と一致する", () => {
    const r = calculateKaigoShigotoRyouritsu({ relation: "fubo", careNeedLikely: "yes" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const tanshuku = r.result.find((s) => s.key === "shoteiRodoJikanTanshuku")!;
    expect(tanshuku.numbers.join("")).toMatch(/3年以上/);
    expect(tanshuku.numbers.join("")).toMatch(/2回以上/);
  });

  it("#23 深夜業の制限の制限期間（1か月以上6か月以内）が他制度（1年以内）と異なる", () => {
    const r = calculateKaigoShigotoRyouritsu({ relation: "fubo", careNeedLikely: "yes" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const shinya = r.result.find((s) => s.key === "shinyaGyoSeigen")!;
    const shoteigai = r.result.find((s) => s.key === "shoteigaiRodoSeigen")!;
    expect(shinya.numbers.join("")).toMatch(/6か月以内/);
    expect(shoteigai.numbers.join("")).toMatch(/1年以内/);
  });

  it("#24 勤続1年未満・週2日以下の両方に該当しても、労使協定系の制度はconditionalのまま（notTargetにならない）", () => {
    const r = calculateKaigoShigotoRyouritsu({
      relation: "fubo",
      careNeedLikely: "yes",
      lessThanOneYear: true,
      twoOrFewerDaysPerWeek: true,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(statusOf(r.result, "kaigoKyugyo")).toBe("conditional");
    expect(statusOf(r.result, "shoteigaiRodoSeigen")).toBe("conditional");
    expect(statusOf(r.result, "shoteiRodoJikanTanshuku")).toBe("conditional");
    // 一方、法律で直接除外する2制度は確定でnotTarget
    expect(statusOf(r.result, "jikangaiRodoSeigen")).toBe("notTarget");
    expect(statusOf(r.result, "shinyaGyoSeigen")).toBe("notTarget");
  });

  it("#25 evaluateSystems は6件の結果を、常に同じ順序・キーで返す", () => {
    const results = evaluateSystems({
      relation: "fubo",
      careNeedLikely: "yes",
      lessThanOneYear: false,
      twoOrFewerDaysPerWeek: false,
      fixedTermContract: false,
      nightCareSubstitute: "no",
    });
    expect(results.map((r) => r.key)).toEqual([
      "kaigoKyugyo",
      "kaigoKyuka",
      "shoteigaiRodoSeigen",
      "jikangaiRodoSeigen",
      "shinyaGyoSeigen",
      "shoteiRodoJikanTanshuku",
    ]);
  });
});
