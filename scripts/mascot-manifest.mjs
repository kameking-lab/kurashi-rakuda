#!/usr/bin/env node
/**
 * mascot-manifest.mjs — マスコット画像の受け入れ検査と台帳生成
 *
 * public/mascot/ を走査し、配置規約（docs/09_マスコット.md §5）を検査して
 * components/mascot/manifest.json を再生成する。
 *
 * 検査内容:
 *   - ファイル名が `<ポーズスラッグ>.png|webp`（スラッグは components/mascot/poses.ts と同一の10種）
 *   - PNG は正方形かつ 512px 以上（1024px 推奨。IHDR ヘッダから読む）
 *   - 同一ポーズの重複（front.png と front.webp の併存）はエラー
 *
 * Usage:
 *   node scripts/mascot-manifest.mjs          # 検査して manifest.json を書き出す
 *   node scripts/mascot-manifest.mjs --check  # 検査のみ（manifest が実態と一致するかをCIで確認）
 *
 * Exit codes: 0=OK / 1=規約違反 / 2=実行時エラー
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const MASCOT_DIR = join(ROOT, "public", "mascot");
const MANIFEST_PATH = join(ROOT, "components", "mascot", "manifest.json");

/** components/mascot/poses.ts と同一のスラッグ（ここが SSOT とズレたら tests/mascot.test.ts が検出する） */
const POSES = ["front", "bow", "guide", "worried", "happy", "carry", "sit", "calc", "sleep", "cheer"];

const CHECK_ONLY = process.argv.includes("--check");
const errors = [];
const warns = [];

/** PNG の IHDR から width/height を読む（シグネチャ8B + length4B + "IHDR"4B + W4B + H4B） */
function pngSize(buf) {
  const isPng = buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47;
  if (!isPng || buf.toString("latin1", 12, 16) !== "IHDR") return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

async function main() {
  const files = {};

  if (existsSync(MASCOT_DIR)) {
    const entries = (await readdir(MASCOT_DIR)).filter((f) => !f.startsWith("."));
    for (const name of entries.sort()) {
      const m = /^([a-z]+)\.(png|webp)$/.exec(name);
      if (!m) {
        errors.push(`${name}: ファイル名が規約外です。<ポーズ>.png|webp（ポーズ: ${POSES.join("/")}）`);
        continue;
      }
      const [, pose, ext] = m;
      if (!POSES.includes(pose)) {
        errors.push(`${name}: 未定義のポーズ "${pose}" です（定義は components/mascot/poses.ts）`);
        continue;
      }
      if (files[pose]) {
        errors.push(`${name}: ポーズ "${pose}" が重複しています（${files[pose]} と併存）`);
        continue;
      }
      if (ext === "png") {
        const size = pngSize(await readFile(join(MASCOT_DIR, name)));
        if (!size) {
          errors.push(`${name}: PNG として読めません`);
          continue;
        }
        if (size.width !== size.height) {
          errors.push(`${name}: 正方形ではありません（${size.width}×${size.height}）。全ポーズで頭身・余白を揃えるため正方形必須`);
          continue;
        }
        if (size.width < 512) {
          errors.push(`${name}: ${size.width}px は小さすぎます（512px 以上、1024px 推奨）`);
          continue;
        }
        if (size.width < 1024) warns.push(`${name}: ${size.width}px（1024px 推奨）`);
      }
      files[pose] = name;
    }
  }

  const manifest = { ...JSON.parse(await readFile(MANIFEST_PATH, "utf8")), files };

  if (CHECK_ONLY) {
    const current = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
    if (JSON.stringify(current.files) !== JSON.stringify(files)) {
      errors.push(
        `manifest.json が public/mascot/ の実態と一致しません。\`npm run mascot:manifest\` で再生成してください`,
      );
    }
  } else if (errors.length === 0) {
    await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  }

  for (const w of warns) console.log(`WARN  ${w}`);
  for (const e of errors) console.log(`ERROR ${e}`);
  console.log(
    `受け入れ済みポーズ: ${Object.keys(files).length}/10（未配置はSVGフォールバック描画） / エラー: ${errors.length}`,
  );
  process.exit(errors.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
