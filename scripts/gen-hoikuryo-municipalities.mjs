/**
 * 保育料 自治体データの索引を自動生成する。
 *
 * ★これがコンフリクト税の撲滅装置★
 * data/seido/hoikuryo/*.json を置くだけで自治体が増える。lib/tools/impl/hoikuryo.ts の
 * municipalities 配列を手書きしないため、並行収集で 3-way コンフリクトが起きない。
 *
 * 出力（いずれも gitignore 済み・コミットしない）:
 *   1. lib/tools/impl/hoikuryo.municipalities.generated.ts
 *      - data/seido/hoikuryo/*.json を全国地方公共団体コード（municipalityCode）順に import
 *      - export const municipalityData: HoikuryoMunicipality[]
 *      - ★サーバ／テスト専用★（全 JSON の実体を静的 import する重いモジュール）。
 *        クライアントのツールバンドルに混ぜないこと（診断 S-2）。lib/tools/impl/hoikuryo.data.ts 経由でのみ使う。
 *   2. lib/tools/impl/hoikuryo.index.generated.ts
 *      - export const municipalitiesIndex: { id; name; prefecture }[]
 *      - ★軽量索引★。クライアントの自治体セレクタ用。階層表本体を含まない（初期バンドルから排除）。
 *      - 個別自治体の階層表は選択時に hoikuryo.loader.ts が JSON を動的 import する（診断 S-2 の根治）。
 *
 * 実行タイミング: postinstall / prebuild / pretest / pretypecheck / predev / prelint（package.json）。
 * 手動実行: node scripts/gen-hoikuryo-municipalities.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = join(ROOT, "data", "seido", "hoikuryo");
const OUT_DATA = join(ROOT, "lib", "tools", "impl", "hoikuryo.municipalities.generated.ts");
const OUT_INDEX = join(ROOT, "lib", "tools", "impl", "hoikuryo.index.generated.ts");

const files = readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));

/** 各ファイルの municipalityCode・name・prefecture を読み、コード順（同値はファイル名順）で安定ソート */
const entries = files
  .map((file) => {
    const slug = file.replace(/\.json$/, "");
    let code = "";
    let name = "";
    let prefecture = "";
    let id = slug;
    try {
      const json = JSON.parse(readFileSync(join(DATA_DIR, file), "utf8"));
      code = String(json.municipalityCode ?? "");
      name = String(json.name ?? "");
      prefecture = String(json.prefecture ?? "");
      id = String(json.id ?? slug);
    } catch {
      code = "";
    }
    return { file, slug, code, name, prefecture, id };
  })
  .sort((a, b) => a.code.localeCompare(b.code) || a.file.localeCompare(b.file));

/** slug から一意な JS 識別子（英数字のみ・先頭は m_） */
const ident = (slug, i) => "m_" + i + "_" + slug.replace(/[^a-zA-Z0-9]/g, "_");

const importLines = entries
  .map((e, i) => `import ${ident(e.slug, i)} from "@/data/seido/hoikuryo/${e.file}";`)
  .join("\n");
const arrayItems = entries.map((e, i) => `  ${ident(e.slug, i)},`).join("\n");

const outData = `// ⚠️ AUTO-GENERATED — DO NOT EDIT. scripts/gen-hoikuryo-municipalities.mjs が生成。gitignore 済み。
// data/seido/hoikuryo/ に JSON を置くだけで自治体が増える。この配列を手書きしないこと（コンフリクト税の撲滅）。
// ★サーバ／テスト専用★ 全自治体の階層表を静的 import する重いモジュール。クライアントのツールバンドルに
// 混ぜてはならない（診断 S-2）。利用は lib/tools/impl/hoikuryo.data.ts 経由に限る。
// 並び順: 全国地方公共団体コード（municipalityCode）順。件数 ${entries.length}（生成時点）。
import type { HoikuryoMunicipality } from "./hoikuryo";
${importLines}

export const municipalityData = [
${arrayItems}
] as unknown as HoikuryoMunicipality[];
`;

/** クライアント用の軽量索引（階層表本体を含まない）。JS リテラルの安全なエスケープ */
const q = (s) => JSON.stringify(String(s));
const indexItems = entries
  .map((e) => `  { id: ${q(e.id)}, name: ${q(e.name)}, prefecture: ${q(e.prefecture)} },`)
  .join("\n");

const outIndex = `// ⚠️ AUTO-GENERATED — DO NOT EDIT. scripts/gen-hoikuryo-municipalities.mjs が生成。gitignore 済み。
// クライアントの自治体セレクタ用の軽量索引。階層表本体（tiers 等）は含まない＝初期バンドルに乗らない。
// 個別自治体の階層表は選択時に lib/tools/impl/hoikuryo.loader.ts が JSON を動的 import する（診断 S-2 の根治）。
// 並び順: 全国地方公共団体コード（municipalityCode）順。件数 ${entries.length}（生成時点）。

export interface HoikuryoIndexEntry {
  id: string;
  name: string;
  prefecture: string;
}

export const municipalitiesIndex: HoikuryoIndexEntry[] = [
${indexItems}
];
`;

/** 内容が変わったときだけ write（不要な mtime 更新を避ける・診断 C 級） */
function writeIfChanged(path, content) {
  let prev = null;
  try {
    prev = readFileSync(path, "utf8");
  } catch {
    prev = null;
  }
  if (prev === content) return false;
  writeFileSync(path, content, "utf8");
  return true;
}

const wroteData = writeIfChanged(OUT_DATA, outData);
const wroteIndex = writeIfChanged(OUT_INDEX, outIndex);
console.log(
  `✓ hoikuryo 索引を生成（${entries.length}自治体・コード順）` +
    ` [municipalities:${wroteData ? "更新" : "変更なし"} / index:${wroteIndex ? "更新" : "変更なし"}]`,
);
