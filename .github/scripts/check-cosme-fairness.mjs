/**
 * check:cosme-fairness — 化粧品「実名・超公平」レコメンド（cosme-match）の公平性ゲート
 * specs/tools/cosme-match.md §0.4「賞賛のみ検知ゲート」の機械的担保。
 *
 * 検査内容:
 *   1. 全商品に notSuitedFor ≥ 1・cautions ≥ 1（賞賛のみの紹介を機械的に不可能にする）
 *   2. 禁止語（最上級・断定の賛美語）が商品データ・ツールUI（components/tools/impl/CosmeMatch*）に無いこと
 *   3. 同一ブランドが収録商品全体の30%を超えたら警告（エラーにはしない。データ偏りの可視化のみ）
 *   4. skinTypeFit/concernsFitがtrueの各値は、keyIngredients経由でingredient-skin-map.jsonから
 *      導出できる範囲であること（恣意的な手書きtrueの禁止）
 *   5. sources[].urlがメーカー公式ドメインのみであること（アフィリエイト・小売・レビューサイトの禁止）
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const PRODUCTS_DIR = "data/cosme/products";
const MAP_PATH = "data/cosme/ingredient-skin-map.json";
const UI_FILES = [
  "components/tools/impl/CosmeMatch.tsx",
  "components/tools/impl/CosmeMatch.calc.ts",
];

/** 禁止語（specs/tools/cosme-match.md §0.4②）。最上級・断定の賛美語 */
const BANNED_PHRASES = [
  "神コスメ",
  "絶対",
  "一番おすすめ",
  "これ1本でOK",
  "これ一本でOK",
  "万能",
  "必ず効果",
  "誰でも効く",
  "No.1",
  "ナンバーワン",
];

const RETAIL_OR_AFFILIATE_HOST_PATTERNS = [
  /cosme\.net/,
  /kakaku\.com/,
  /rakuten\.co\.jp/,
  /amazon\.co\.jp/,
  /yahoo\.co\.jp/,
  /lips(cosme)?\.com/,
  /qoo10\.jp/,
  /a8\.net/,
  /amzn\.to/,
  /valuecommerce/,
  /accesstrade/,
  /af\.moshimo\.com/,
];

const BRAND_CONCENTRATION_WARN_RATIO = 0.3;

function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function scanBannedPhrases(text, where, errors) {
  for (const phrase of BANNED_PHRASES) {
    if (text.includes(phrase)) {
      errors.push(`${where}: 禁止語「${phrase}」を検出しました（最上級・断定の賛美表現は使えません）`);
    }
  }
}

function main() {
  const errors = [];
  const warnings = [];

  if (!existsSync(PRODUCTS_DIR)) {
    console.log("✓ data/cosme/products が存在しません（cosme-match未導入）。検査をスキップします。");
    return;
  }
  if (!existsSync(MAP_PATH)) {
    errors.push(`${MAP_PATH} が見つかりません（ingredient-skin-map.json は必須です）`);
    fail(errors, warnings);
    return;
  }

  const map = loadJson(MAP_PATH);
  const ingredientById = new Map(map.ingredients.map((i) => [i.id, i]));
  const mapSourceIds = new Set(map.sources.map((s) => s.id));

  // ingredient-skin-map 自体の出典整合性
  for (const ing of map.ingredients) {
    if (!mapSourceIds.has(ing.sourceId)) {
      errors.push(`ingredient-skin-map.json: 成分「${ing.id}」の sourceId「${ing.sourceId}」が sources に存在しません`);
    }
  }

  const files = readdirSync(PRODUCTS_DIR).filter((f) => f.endsWith(".json"));
  const brandCounts = new Map();
  const seenIds = new Set();

  for (const file of files) {
    const path = join(PRODUCTS_DIR, file);
    const raw = readFileSync(path, "utf8");
    const p = JSON.parse(raw);
    const where = `data/cosme/products/${file}`;

    if (seenIds.has(p.id)) errors.push(`${where}: id「${p.id}」が他ファイルと重複しています`);
    seenIds.add(p.id);

    // ①notSuitedFor / cautions は1件以上必須
    if (!Array.isArray(p.notSuitedFor) || p.notSuitedFor.length === 0) {
      errors.push(`${where}: notSuitedFor（向かない人）が0件です。賞賛のみの紹介は禁止です`);
    }
    if (!Array.isArray(p.cautions) || p.cautions.length === 0) {
      errors.push(`${where}: cautions（注意点）が0件です。賞賛のみの紹介は禁止です`);
    }

    // ②禁止語（商品データ全体を文字列化して検査）
    scanBannedPhrases(raw, where, errors);

    // ⑤メーカー公式ドメインのみ（小売・アフィリエイト禁止）
    if (!Array.isArray(p.sources) || p.sources.length === 0) {
      errors.push(`${where}: sources（出典）が0件です`);
    } else {
      for (const s of p.sources) {
        if (!/^https:\/\//.test(s.url)) {
          errors.push(`${where}: sources の url が https:// で始まっていません（${s.url}）`);
          continue;
        }
        if (RETAIL_OR_AFFILIATE_HOST_PATTERNS.some((re) => re.test(s.url))) {
          errors.push(`${where}: sources の url が小売・レビュー・アフィリエイトサイトです（メーカー公式サイトのみ許可）: ${s.url}`);
        }
      }
    }

    // ④skinTypeFit / concernsFit の導出整合性
    const ingredientIds = (p.keyIngredients ?? []).map((k) => k.ingredientId).filter(Boolean);
    const linked = ingredientIds.map((id) => ingredientById.get(id)).filter(Boolean);
    for (const id of ingredientIds) {
      if (!ingredientById.has(id)) {
        errors.push(`${where}: keyIngredients の ingredientId「${id}」が ingredient-skin-map.json に存在しません`);
      }
    }
    if (p.skinTypeFit) {
      for (const [skinType, value] of Object.entries(p.skinTypeFit)) {
        if (value === true) {
          const supported = linked.some((ing) => ing.commonlyChosenFor.includes(skinType));
          if (!supported) {
            errors.push(
              `${where}: skinTypeFit.${skinType}=true ですが、keyIngredients（ingredient-skin-map経由）から導出できません（恣意的なtrueは禁止）`,
            );
          }
        }
      }
    }
    if (Array.isArray(p.concernsFit)) {
      for (const concern of p.concernsFit) {
        const supported = linked.some((ing) => (ing.concernsFit ?? []).includes(concern));
        if (!supported) {
          errors.push(
            `${where}: concernsFit「${concern}」が、keyIngredients（ingredient-skin-map経由）から導出できません`,
          );
        }
      }
    }

    if (p.status !== "discontinued") {
      brandCounts.set(p.brand, (brandCounts.get(p.brand) ?? 0) + 1);
    }
  }

  // ③同一ブランドの30%超は警告（エラーにしない）
  const activeTotal = [...brandCounts.values()].reduce((a, b) => a + b, 0);
  if (activeTotal > 0) {
    for (const [brand, count] of brandCounts) {
      const ratio = count / activeTotal;
      if (ratio > BRAND_CONCENTRATION_WARN_RATIO) {
        warnings.push(
          `ブランド「${brand}」が収録商品の${Math.round(ratio * 100)}%を占めています（30%超。データの偏りを確認してください）`,
        );
      }
    }
  }

  // ②禁止語（ツールUI）
  for (const file of UI_FILES) {
    if (!existsSync(file)) continue;
    const text = readFileSync(file, "utf8");
    scanBannedPhrases(text, file, errors);
  }

  fail(errors, warnings, files.length);
}

function fail(errors, warnings, fileCount = 0) {
  if (warnings.length > 0) {
    console.log("--- cosme-fairness 警告 ---");
    for (const w of warnings) console.log(`△ ${w}`);
  }
  if (errors.length > 0) {
    console.error("--- cosme-fairness エラー ---");
    for (const e of errors) console.error(`✗ ${e}`);
    process.exit(1);
  }
  console.log(`✓ check:cosme-fairness PASS（商品${fileCount}件・警告${warnings.length}件）`);
}

main();
