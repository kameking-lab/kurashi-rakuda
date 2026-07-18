/**
 * 対象属性メタ（audience）。ツール（registry.json）と記事（frontmatter）に付与し、
 * 任意プロフィールに基づく「並べ替え・ハイライト」の土台にする。
 *
 * 設計原則（docs/12_パーソナライズ設計.md）:
 *   - これは「並べ替え・ハイライト」専用のメタであり、絞り込み（非表示）には使わない。
 *     全ツール/記事は audience の値に関わらず常にURL不変で存在し、クロール可能でなければならない。
 *   - プロフィール未設定・Googlebot には全件を既定順で表示する（SEOを殺さない）。
 *   - audience はページの内容や出典を一切変えない。表示順・強調の手がかりにのみ使う。
 */

/** ライフステージ（本人または子の段階、複数可） */
export const LIFE_STAGES = [
  "pregnancy", // 妊娠中
  "newborn", // 新生児（0〜1歳ごろ）
  "infant", // 乳児
  "toddler", // 幼児（1〜6歳ごろ）
  "schoolAge", // 学童
  "adolescent", // 思春期
  "adult", // 成人
  "senior", // シニア
] as const;
export type LifeStage = (typeof LIFE_STAGES)[number];

/** ライフイベント（プロフィールで設定しうる「いまの状況」） */
export const LIFE_EVENTS = [
  "pregnant", // 妊娠・妊活中
  "parenting", // 子育て中
  "caregiving", // 介護中
  "working", // 就労中（働き方の悩み）
] as const;
export type LifeEvent = (typeof LIFE_EVENTS)[number];

/** 子ども関連ツールが対象とする子の年齢帯 */
export const CHILD_AGE_BANDS = [
  "prenatal", // 胎児（妊娠中）
  "age0_1", // 0〜1歳
  "age1_3", // 1〜3歳
  "age3_6", // 3〜6歳
  "age6_12", // 6〜12歳（学童）
  "age12_18", // 12〜18歳
] as const;
export type ChildAgeBand = (typeof CHILD_AGE_BANDS)[number];

/** 性別依存の場合のみ設定（任意）。null は不問 */
export const GENDERS = ["female", "male"] as const;
export type Gender = (typeof GENDERS)[number];

export interface Audience {
  /**
   * 属性非依存＝誰にでも関係するツール/記事（調味料換算・炊飯水・洗濯表示など）。
   * true のとき lifeStages / lifeEvents / childAgeBands は空・gender は null にする。
   */
  universal: boolean;
  /** 関係するライフステージ（複数可）。広めに含める（過度に絞らない） */
  lifeStages: LifeStage[];
  /** 関係するライフイベント（複数可） */
  lifeEvents: LifeEvent[];
  /** 子ども関連の場合の対象年齢帯（複数可）。子ども非関連なら空 */
  childAgeBands: ChildAgeBand[];
  /** 性別依存のみ設定。null=不問（既定） */
  gender: Gender | null;
}

/**
 * audience の妥当性を検証し、問題があればメッセージ配列を返す（空配列＝妥当）。
 * ビルド不要の純関数。CI（scripts/check-audience.mjs）と型の単体テストで使う。
 */
export function validateAudience(a: unknown): string[] {
  const errors: string[] = [];
  if (a === null || typeof a !== "object") return ["audience がオブジェクトではありません"];
  const o = a as Record<string, unknown>;

  if (typeof o.universal !== "boolean") errors.push("universal は boolean 必須");
  const arrays: [keyof Audience, readonly string[]][] = [
    ["lifeStages", LIFE_STAGES],
    ["lifeEvents", LIFE_EVENTS],
    ["childAgeBands", CHILD_AGE_BANDS],
  ];
  for (const [key, vocab] of arrays) {
    const v = o[key];
    if (!Array.isArray(v)) {
      errors.push(`${key} は配列必須`);
      continue;
    }
    for (const item of v) {
      if (!vocab.includes(item as string)) errors.push(`${key} に未知の値: ${String(item)}`);
    }
    if (new Set(v as string[]).size !== v.length) errors.push(`${key} に重複があります`);
  }
  if (o.gender !== null && !GENDERS.includes(o.gender as Gender)) {
    errors.push(`gender は ${GENDERS.join("/")} または null`);
  }

  // universal の一貫性: 万人向けなら属性フィールドは空でなければならない
  if (o.universal === true) {
    if (
      (Array.isArray(o.lifeStages) && o.lifeStages.length > 0) ||
      (Array.isArray(o.lifeEvents) && o.lifeEvents.length > 0) ||
      (Array.isArray(o.childAgeBands) && o.childAgeBands.length > 0) ||
      o.gender !== null
    ) {
      errors.push("universal=true のとき属性（lifeStages/lifeEvents/childAgeBands/gender）は空/null にする");
    }
  } else if (o.universal === false) {
    const stages = Array.isArray(o.lifeStages) ? o.lifeStages.length : 0;
    const events = Array.isArray(o.lifeEvents) ? o.lifeEvents.length : 0;
    if (stages === 0 && events === 0) {
      errors.push("universal=false のとき lifeStages か lifeEvents を少なくとも1つ持つ");
    }
  }

  // 子の年齢帯の整合: prenatal は妊娠、それ以外は子育てのイベントと対応させる（広めの一貫性）
  if (Array.isArray(o.childAgeBands) && Array.isArray(o.lifeEvents)) {
    const bands = o.childAgeBands as string[];
    const events = o.lifeEvents as string[];
    if (bands.includes("prenatal") && !events.includes("pregnant")) {
      errors.push("childAgeBands に prenatal があるとき lifeEvents に pregnant を含める");
    }
    if (bands.some((b) => b !== "prenatal") && !events.includes("parenting")) {
      errors.push("childAgeBands（prenatal以外）があるとき lifeEvents に parenting を含める");
    }
  }

  return errors;
}
