/**
 * 対象属性メタ（audience）検証スクリプト（docs/12_パーソナライズ設計.md）。
 * - app/lib/tools/registry.json の全ツール、content/articles/*.md の全記事が
 *   妥当な audience を持つことを保証する（並べ替え・ハイライトの土台。SEOには不使用）。
 * - 語彙・整合ルールは app/lib/audience.ts の validateAudience と一致させること
 *   （型側は tests/audience.test.ts が本体の validateAudience で全データを検証する）。
 */
import { readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

const LIFE_STAGES = new Set([
  "pregnancy",
  "newborn",
  "infant",
  "toddler",
  "schoolAge",
  "adolescent",
  "adult",
  "senior",
]);
const LIFE_EVENTS = new Set(["pregnant", "parenting", "caregiving", "working"]);
const CHILD_AGE_BANDS = new Set([
  "prenatal",
  "age0_1",
  "age1_3",
  "age3_6",
  "age6_12",
  "age12_18",
]);
const GENDERS = new Set(["female", "male"]);

/** audience を検証し、問題メッセージ配列を返す（空＝妥当）。audience.ts と同じロジック */
function validateAudience(a) {
  const errors = [];
  if (a === null || typeof a !== "object") return ["audience がオブジェクトではありません"];

  if (typeof a.universal !== "boolean") errors.push("universal は boolean 必須");
  for (const [key, vocab] of [
    ["lifeStages", LIFE_STAGES],
    ["lifeEvents", LIFE_EVENTS],
    ["childAgeBands", CHILD_AGE_BANDS],
  ]) {
    const v = a[key];
    if (!Array.isArray(v)) {
      errors.push(`${key} は配列必須`);
      continue;
    }
    for (const item of v) if (!vocab.has(item)) errors.push(`${key} に未知の値: ${item}`);
    if (new Set(v).size !== v.length) errors.push(`${key} に重複`);
  }
  if (a.gender !== null && !GENDERS.has(a.gender)) errors.push("gender は female/male または null");

  if (a.universal === true) {
    if (
      (a.lifeStages?.length ?? 0) > 0 ||
      (a.lifeEvents?.length ?? 0) > 0 ||
      (a.childAgeBands?.length ?? 0) > 0 ||
      a.gender !== null
    ) {
      errors.push("universal=true のとき属性は空/null にする");
    }
  } else if (a.universal === false) {
    if ((a.lifeStages?.length ?? 0) === 0 && (a.lifeEvents?.length ?? 0) === 0) {
      errors.push("universal=false のとき lifeStages か lifeEvents を1つ以上持つ");
    }
  }

  const bands = Array.isArray(a.childAgeBands) ? a.childAgeBands : [];
  const events = Array.isArray(a.lifeEvents) ? a.lifeEvents : [];
  if (bands.includes("prenatal") && !events.includes("pregnant")) {
    errors.push("childAgeBands の prenatal は lifeEvents に pregnant を要する");
  }
  if (bands.some((b) => b !== "prenatal") && !events.includes("parenting")) {
    errors.push("childAgeBands（prenatal以外）は lifeEvents に parenting を要する");
  }
  return errors;
}

const problems = [];

// ---- tools ----
const tools = JSON.parse(
  readFileSync(resolve(process.cwd(), "app/lib/tools/registry.json"), "utf8"),
);
let toolCount = 0;
for (const t of tools) {
  if (!("audience" in t)) {
    problems.push(`ツール ${t.slug}: audience がありません`);
    continue;
  }
  const errs = validateAudience(t.audience);
  if (errs.length) problems.push(`ツール ${t.slug}: ${errs.join(" / ")}`);
  toolCount++;
}

// ---- articles ----
const articlesDir = resolve(process.cwd(), "content/articles");
const files = readdirSync(articlesDir).filter((f) => f.endsWith(".md"));
let articleCount = 0;
for (const f of files) {
  const raw = readFileSync(join(articlesDir, f), "utf8");
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) {
    problems.push(`記事 ${f}: フロントマターを読めません`);
    continue;
  }
  let fm;
  try {
    fm = JSON.parse(m[1]);
  } catch {
    problems.push(`記事 ${f}: フロントマターJSONが不正`);
    continue;
  }
  if (!("audience" in fm)) {
    problems.push(`記事 ${f}: audience がありません`);
    continue;
  }
  const errs = validateAudience(fm.audience);
  if (errs.length) problems.push(`記事 ${f}: ${errs.join(" / ")}`);
  articleCount++;
}

if (problems.length) {
  console.error("✗ audience メタ検証に失敗しました:\n" + problems.map((p) => "  - " + p).join("\n"));
  process.exit(1);
}
console.log(`✓ audience メタは妥当です（ツール ${toolCount} 件・記事 ${articleCount} 件）`);
