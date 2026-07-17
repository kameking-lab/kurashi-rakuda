/**
 * solves メタ検証・集計スクリプト（docs/07 の Phase 完了条件「解決できる悩み数」の計測器）。
 * - app/lib/tools/registry.json の全エントリを検証
 * - content/articles/*.md のフロントマター solves も集計対象（記事が実際に答えている悩みのみ。水増し禁止）
 * - 一意な solves 数を集計して出力
 */
import { readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

const CATEGORIES = new Set([
  "pregnancy",
  "childcare",
  "kaji",
  "money",
  "health",
  "career",
  "care",
]);

const registryPath = resolve(process.cwd(), "app/lib/tools/registry.json");
const tools = JSON.parse(readFileSync(registryPath, "utf8"));

const errors = [];
const slugs = new Set();
const queueIds = new Set();

if (!Array.isArray(tools) || tools.length === 0) {
  errors.push("registry.json が空か、配列ではありません");
}

for (const t of tools) {
  const where = `[${t.slug ?? "(slugなし)"}]`;
  if (!/^(Q\d+-\d+|P\d+-T\d+)$/.test(t.queueId ?? "")) {
    errors.push(`${where} queueId が BACKLOG の ID 形式（Q3-05 / P2-T14 等）ではありません: ${t.queueId}`);
  }
  if (queueIds.has(t.queueId)) errors.push(`${where} queueId が重複しています`);
  queueIds.add(t.queueId);

  if (!/^[a-z0-9-]+$/.test(t.slug ?? "")) {
    errors.push(`${where} slug は英小文字・数字・ハイフンのみにしてください`);
  }
  if (slugs.has(t.slug)) errors.push(`${where} slug が重複しています`);
  slugs.add(t.slug);

  if (!CATEGORIES.has(t.category)) {
    errors.push(`${where} category が7カテゴリのいずれでもありません: ${t.category}`);
  }
  if (!t.title || !t.description) {
    errors.push(`${where} title / description は必須です`);
  }
  if (!Array.isArray(t.solves) || t.solves.length === 0) {
    errors.push(`${where} solves（解決できる悩み）を1件以上書いてください`);
  } else if (t.solves.some((s) => typeof s !== "string" || s.trim() === "")) {
    errors.push(`${where} solves に空文字があります`);
  }
  if (!["live", "planned"].includes(t.status)) {
    errors.push(`${where} status は live か planned です: ${t.status}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t.updated ?? "")) {
    errors.push(`${where} updated は YYYY-MM-DD 形式にしてください`);
  }
  if (t.status === "live" && (!Array.isArray(t.sources) || t.sources.length === 0)) {
    errors.push(`${where} 公開中（live）のツールは出典（sources）が必須です`);
  }
  if (t.basisYear !== null && typeof t.basisYear !== "string") {
    errors.push(`${where} basisYear は文字列か null にしてください`);
  }
}

// 記事フロントマターの solves を集計（JSONフロントマター形式）
const articlesDir = resolve(process.cwd(), "content/articles");
const articleSolves = [];
let articleCount = 0;
for (const f of readdirSync(articlesDir)) {
  if (!f.endsWith(".md")) continue;
  articleCount += 1;
  const raw = readFileSync(join(articlesDir, f), "utf8");
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) {
    errors.push(`[記事 ${f}] フロントマターを読み取れません`);
    continue;
  }
  let fm;
  try {
    fm = JSON.parse(m[1]);
  } catch (e) {
    errors.push(`[記事 ${f}] フロントマターのJSONが不正です: ${e.message}`);
    continue;
  }
  if (fm.solves !== undefined) {
    if (!Array.isArray(fm.solves) || fm.solves.some((s) => typeof s !== "string" || s.trim() === "")) {
      errors.push(`[記事 ${f}] solves は空でない文字列の配列にしてください`);
    } else {
      articleSolves.push(...fm.solves);
    }
  }
}

const toolSolves = new Set(tools.flatMap((t) => t.solves ?? []));
const uniqueSolves = new Set([...toolSolves, ...articleSolves]);
const live = tools.filter((t) => t.status === "live");

console.log("--- solves メタ集計 ---");
console.log(`ツール総数        : ${tools.length}`);
console.log(`公開中（live）    : ${live.length}`);
console.log(`記事総数          : ${articleCount}`);
console.log(`解決できる悩み数  : ${uniqueSolves.size}（一意。ツール由来${toolSolves.size}＋記事による追加${uniqueSolves.size - toolSolves.size}）`);
console.log(
  `Phase 1 完了条件  : ツール20本・悩み100種（docs/07_ロードマップ.md）`,
);

if (errors.length > 0) {
  console.error("\n--- 検証エラー ---");
  for (const e of errors) console.error(`✗ ${e}`);
  process.exit(1);
}
console.log("\n✓ registry.json は妥当です");
