/**
 * ブランド哲学リンター（docs/00 §3.3「広告臭ゼロ」の機械的担保）。
 * ユーザーに見えるコード（app/ components/ と、将来の content/）から
 * 禁止表現を検知したら CI を失敗させる。
 * 意図的に言及する必要がある行（ポリシー説明等）は行内に brand-lint-allow と書く。
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const TARGET_DIRS = ["app", "components", "content"];
const EXTENSIONS = [".ts", ".tsx", ".md", ".mdx"];

/** 禁止表現（docs/00 §3.3・docs/06 §3 に由来） */
const BANNED = [
  { pattern: /おすすめ[0-9０-９]+選/, reason: "ランキング型記事の禁止" },
  { pattern: /ランキング/, reason: "ランキング乱発の禁止" },
  { pattern: /今だけ/, reason: "限定・緊急の演出の禁止" },
  { pattern: /期間限定/, reason: "限定・緊急の演出の禁止" },
  { pattern: /残りわずか/, reason: "限定・緊急の演出の禁止" },
  { pattern: /知らないと損/, reason: "煽りタイトルの禁止" },
  { pattern: /必見/, reason: "煽り表現の禁止" },
  { pattern: /徹底比較/, reason: "比較煽りの禁止" },
  { pattern: /今すぐ購入/, reason: "成約導線の禁止" },
  { pattern: /PR記事/, reason: "PR記事の禁止" },
  { pattern: /タイアップ/, reason: "タイアップの禁止" },
];

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules" || name.startsWith(".")) continue;
      walk(full, files);
    } else if (EXTENSIONS.some((ext) => name.endsWith(ext))) {
      files.push(full);
    }
  }
  return files;
}

const violations = [];
for (const dir of TARGET_DIRS) {
  if (!existsSync(dir)) continue;
  for (const file of walk(dir)) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (line.includes("brand-lint-allow")) return;
      for (const { pattern, reason } of BANNED) {
        if (pattern.test(line)) {
          violations.push(
            `${relative(process.cwd(), file)}:${i + 1} 「${line.trim().slice(0, 60)}」 → ${reason}`,
          );
        }
      }
    });
  }
}

if (violations.length > 0) {
  console.error("--- ブランド哲学リンター: 禁止表現を検知 ---");
  for (const v of violations) console.error(`✗ ${v}`);
  console.error(
    "\n判断基準は「ユーザーの生活が楽になるか」だけ（docs/00_企画書.md §3）。表現を直すか、ポリシー説明等の正当な言及なら行内に brand-lint-allow を付けてください。",
  );
  process.exit(1);
}
console.log("✓ 禁止表現は見つかりませんでした（ブランド哲学リンター）");
