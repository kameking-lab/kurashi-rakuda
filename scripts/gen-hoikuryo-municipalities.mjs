/**
 * 保育料 自治体データの索引を自動生成する。
 *
 * ★これがコンフリクト税の撲滅装置★
 * data/seido/hoikuryo/*.json を置くだけで自治体が増える。lib/tools/impl/hoikuryo.ts の
 * municipalities 配列を手書きしないため、並行収集で 3-way コンフリクトが起きない。
 *
 * 出力: lib/tools/impl/hoikuryo.municipalities.generated.ts（gitignore 済み・コミットしない）
 *   - data/seido/hoikuryo/*.json を全国地方公共団体コード（municipalityCode）順に import
 *   - export const municipalityData: HoikuryoMunicipality[]
 *
 * 実行タイミング: postinstall / prebuild / pretest / pretypecheck / predev / prelint（package.json）。
 * 手動実行: node scripts/gen-hoikuryo-municipalities.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = join(ROOT, "data", "seido", "hoikuryo");
const OUT = join(ROOT, "lib", "tools", "impl", "hoikuryo.municipalities.generated.ts");

const files = readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));

/** 各ファイルの municipalityCode を読み、コード順（同値はファイル名順）で安定ソート */
const entries = files
  .map((file) => {
    const slug = file.replace(/\.json$/, "");
    let code = "";
    try {
      code = String(JSON.parse(readFileSync(join(DATA_DIR, file), "utf8")).municipalityCode ?? "");
    } catch {
      code = "";
    }
    return { file, slug, code };
  })
  .sort((a, b) => a.code.localeCompare(b.code) || a.file.localeCompare(b.file));

/** slug から一意な JS 識別子（英数字のみ・先頭は m_） */
const ident = (slug, i) => "m_" + i + "_" + slug.replace(/[^a-zA-Z0-9]/g, "_");

const importLines = entries
  .map((e, i) => `import ${ident(e.slug, i)} from "@/data/seido/hoikuryo/${e.file}";`)
  .join("\n");
const arrayItems = entries.map((e, i) => `  ${ident(e.slug, i)},`).join("\n");

const out = `// ⚠️ AUTO-GENERATED — DO NOT EDIT. scripts/gen-hoikuryo-municipalities.mjs が生成。gitignore 済み。
// data/seido/hoikuryo/ に JSON を置くだけで自治体が増える。この配列を手書きしないこと（コンフリクト税の撲滅）。
// 並び順: 全国地方公共団体コード（municipalityCode）順。件数 ${entries.length}（生成時点）。
import type { HoikuryoMunicipality } from "./hoikuryo";
${importLines}

export const municipalityData = [
${arrayItems}
] as unknown as HoikuryoMunicipality[];
`;

writeFileSync(OUT, out, "utf8");
console.log(`✓ hoikuryo.municipalities.generated.ts を生成（${entries.length}自治体・コード順）`);
