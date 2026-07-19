/**
 * 保育料 全自治体データ層（★サーバ／テスト専用★・診断 S-2）。
 *
 * このモジュールは data/seido/hoikuryo/*.json の全実体（約3.2MB）を静的 import する。
 * ★クライアントのツールバンドルに混ぜてはならない★（混ぜると診断 S-2 の巨大バンドルが再発する）。
 *   - サーバ（ページ SSR・SeidoNotice の出典一覧）と Node（vitest）だけが使う。
 *   - クライアントの自治体セレクタは軽量索引 hoikuryo.index.generated.ts を、
 *     選択された自治体の階層表は選択時に hoikuryo.loader.ts が動的 import する。
 *
 * 純粋ロジック（型・階層解決・calcMunicipality 等）は hoikuryo.ts を再エクスポートするので、
 * テストは従来どおりこの1モジュールから全 API を import できる。
 */
import { municipalityData } from "./hoikuryo.municipalities.generated";
import {
  calcMunicipality,
  resolveTier,
  type HoikuryoInput,
  type HoikuryoMunicipality,
  type HoikuryoResult,
  type HoikuryoTier,
  type TaxStatus,
} from "./hoikuryo";
import {
  estimateHouseholdShotokuwari,
  estimateShotokuwari,
  requiresPreprocessing,
  type HouseholdTierEstimate,
  type ShotokuwariInput,
  type TierEstimate,
} from "./hoikuryo-shotokuwari";

// 純粋ロジック（型・関数）をそのまま再公開。tests/hoikuryo.test.ts はこの1本から全部 import できる。
export * from "./hoikuryo";

/**
 * 収集済み自治体（全実体）。★data/seido/hoikuryo/*.json から自動生成（手書き配列は廃止）★
 * 索引は scripts/gen-hoikuryo-municipalities.mjs が municipalityCode（全国地方公共団体コード）順に生成する。
 * ★選択肢はこの配列からのみ生成する★ 未収集自治体の階層を創作しない（§7）。
 */
export const municipalities: HoikuryoMunicipality[] = municipalityData;

export function getMunicipality(id: string): HoikuryoMunicipality | undefined {
  return municipalities.find((m) => m.id === id);
}

/**
 * 保育料の試算（id 版）。全自治体配列から自治体を引いて calcMunicipality に委譲する。
 * クライアントは全配列を持たないため使わない（選択時に階層表を1件だけ動的読込 → calcMunicipality）。
 */
export function calc(input: HoikuryoInput): HoikuryoResult | null {
  const m = getMunicipality(input.municipalityId);
  if (!m) return null;
  return calcMunicipality(m, input);
}

/**
 * 世帯（父母2人分まで）の年収 → 階層 の【推計】。estimateTier の世帯版。
 * 前処理・課税状況の扱いは estimateTier と同じ（下のコメント参照）。
 */
export function estimateHouseholdTier(
  municipalityId: string,
  inputs: ShotokuwariInput[],
  taxStatus: TaxStatus,
): HouseholdTierEstimate {
  const m = getMunicipality(municipalityId);
  if (!m) {
    return { kind: "unavailable", reason: "municipality-not-found", note: `未収集の自治体です: ${municipalityId}` };
  }
  const household = estimateHouseholdShotokuwari(inputs);
  if (household.kind !== "estimated") {
    return { kind: "unavailable", reason: household.reason, note: household.note };
  }
  const isDesignatedCity = inputs.some((i) => i.isDesignatedCity);
  if (requiresPreprocessing(m, isDesignatedCity)) {
    return {
      kind: "preprocessing-required",
      household,
      note: m.bracketBasis?.note ?? "",
      caveats: [
        ...household.caveats,
        isDesignatedCity
          ? "政令指定都市の市民税所得割は8％で課税されますが、保育料の階層表は6％を前提とした金額で区切られています。" +
            "そのままでは階層を判定できないため、この自治体の案内にある換算方法をご確認ください。ツールでは換算を代行しません。"
          : "この自治体は、課税明細書の所得割額をそのまま階層表に当てはめず、独自の換算を行うと案内しています。" +
            "換算方法は下記の原文をご確認ください。ツールでは換算を代行しません。",
      ],
    };
  }
  const resolve = (income: number): HoikuryoTier | null => resolveTier(m, taxStatus, income).tier;
  const tier = resolve(household.total);
  if (!tier) {
    return { kind: "unavailable", reason: "tier-not-resolved", note: "階層を判定できませんでした。" };
  }
  const tiers = [resolve(household.range.min), resolve(household.range.max)].filter(
    (t): t is HoikuryoTier => t !== null,
  );
  const tierRange = tiers.filter((t, i) => tiers.findIndex((x) => x.tier === t.tier) === i);
  const caveats = [...household.caveats];
  if (tierRange.length > 1) {
    caveats.push(
      "推計の幅の中に階層の境界があるため、階層を1つに絞れていません。課税明細書の所得割額でご確認ください。",
    );
  }
  return { kind: "estimated", isEstimate: true, household, tier, tierRange, caveats };
}

/**
 * 年収 → 階層 の【推計】。
 *
 * ★前処理が必要な自治体では階層を返さない★ 6/8換算・税源移譲前税率などの換算は原典に構造化データが無く、
 * 端数処理も原典に無い（§9.1）。ツールが換算を代行せず、bracketBasis.note を提示してユーザーに委ねる。
 *
 * ★課税状況（taxStatus）を所得割額より先に見る★（§4 ステップ3）。A/B/C階層はいずれも所得割額0円で、
 * 金額では判別できない。均等割の非課税は断定しないため、taxStatus は入力として受け取る。
 */
export function estimateTier(
  municipalityId: string,
  input: ShotokuwariInput,
  taxStatus: TaxStatus,
): TierEstimate {
  const m = getMunicipality(municipalityId);
  if (!m) {
    return { kind: "unavailable", reason: "municipality-not-found", note: `未収集の自治体です: ${municipalityId}` };
  }

  const est = estimateShotokuwari(input);
  if (est.kind !== "estimated") {
    return { kind: "unavailable", reason: est.reason, note: est.note };
  }

  if (requiresPreprocessing(m, input.isDesignatedCity)) {
    return {
      kind: "preprocessing-required",
      shotokuwari: est,
      note: m.bracketBasis?.note ?? "",
      caveats: [
        ...est.caveats,
        input.isDesignatedCity
          ? "政令指定都市の市民税所得割は8％で課税されますが、保育料の階層表は6％を前提とした金額で区切られています。" +
            "そのままでは階層を判定できないため、この自治体の案内にある換算方法をご確認ください。ツールでは換算を代行しません。"
          : "この自治体は、課税明細書の所得割額をそのまま階層表に当てはめず、独自の換算を行うと案内しています。" +
            "換算方法は下記の原文をご確認ください。ツールでは換算を代行しません。",
      ],
    };
  }

  const resolve = (income: number): HoikuryoTier | null => resolveTier(m, taxStatus, income).tier;
  const tier = resolve(est.breakdown.shotokuwari);
  if (!tier) {
    return { kind: "unavailable", reason: "tier-not-resolved", note: "階層を判定できませんでした。" };
  }

  const tiers = [resolve(est.range.min), resolve(est.range.max)].filter(
    (t): t is HoikuryoTier => t !== null,
  );
  const tierRange = tiers.filter((t, i) => tiers.findIndex((x) => x.tier === t.tier) === i);

  const caveats = [...est.caveats];
  if (tierRange.length > 1) {
    caveats.push(
      "推計の幅の中に階層の境界があるため、階層を1つに絞れていません。" +
        "課税明細書の所得割額でご確認ください。",
    );
  }
  return { kind: "estimated", isEstimate: true, shotokuwari: est, tier, tierRange, caveats };
}
