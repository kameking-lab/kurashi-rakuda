/**
 * check-ai-boundary.mjs — AI 連携の「唯一の例外」を機械的に封じ込める境界リンター（docs/16 §0）。
 *
 * 三原則（クライアント完結・API課金ゼロ・外部送信ゼロ）に対し、AI 機能だけが「ユーザーが明示的に
 * ボタンを押した時のみサーバー経由で送信する」例外を持つ。その例外が漸進的に広がって「気づいたら
 * 他機能も送信していた」という原則崩壊を防ぐため、次の2点を CI で強制する:
 *
 *   1. app/api 配下の API ルート（route.ts）は、specs/ai に列挙された AI ルート（app/api/ai/**）のみ。
 *   2. app / components / lib のうち、外部送信（fetch 等）を書いてよいのは lib/ai/ 配下のみ。
 *
 * 例外を意図する行には `ai-boundary-allow` を書く（レビューで根拠を残すため）。
 */
import { readdirSync, statSync, readFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const rel = (p) => relative(ROOT, p).replace(/\\/g, "/");

/** specs/ai に列挙された AI ルートの置き場（この配下の route.* のみ許可） */
const ALLOWED_API_DIRS = ["app/api/ai"];
/** 外部送信（fetch 等）を許可するディレクトリ接頭辞 */
const FETCH_ALLOWED_PREFIXES = ["lib/ai/"];

/** 外部送信になりうる呼び出しの検出（リモート URL の動的 import も含む） */
const EXFIL_RE =
  /\bfetch\s*\(|\bXMLHttpRequest\b|new\s+WebSocket\b|navigator\.sendBeacon\b|\bEventSource\b|import\(\s*[`'"]https?:/;

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      walk(full, files);
    } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(name)) {
      files.push(full);
    }
  }
  return files;
}

const violations = [];

// (1) app/api ルートの許可リスト
if (existsSync("app/api")) {
  for (const file of walk("app/api")) {
    const r = rel(file);
    if (!/\/route\.(ts|tsx|js|jsx)$/.test(r)) continue; // ルートハンドラのみがエンドポイントを定義する
    const allowed = ALLOWED_API_DIRS.some((d) => r.startsWith(d + "/"));
    if (!allowed) {
      violations.push(
        `${r}: specs/ai に列挙されていない API ルートです（app/api 配下は AI 機能の ${ALLOWED_API_DIRS.join("・")} のみ許可）`,
      );
    }
  }
}

// (2) fetch 等の外部送信は lib/ai/ のみ
for (const base of ["app", "components", "lib"]) {
  if (!existsSync(base)) continue;
  for (const file of walk(base)) {
    const r = rel(file);
    if (FETCH_ALLOWED_PREFIXES.some((p) => r.startsWith(p))) continue;
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (line.includes("ai-boundary-allow")) return;
      if (EXFIL_RE.test(line)) {
        violations.push(
          `${r}:${i + 1} 外部送信の可能性（${line.trim().slice(0, 60)}）→ 送信を書けるのは lib/ai/ 配下のみ（ユーザーの明示操作時の AI 機能に限定）`,
        );
      }
    });
  }
}

if (violations.length > 0) {
  console.error("--- AI境界リンター: 逸脱を検知 ---");
  for (const v of violations) console.error(`✗ ${v}`);
  console.error(
    "\nAI 機能以外は端末内完結（外部送信ゼロ）が不変条件です（docs/16 §0）。API ルートは app/api/ai/ 配下のみ、" +
      "外部送信は lib/ai/ 配下のみに置いてください。正当な例外は行内に ai-boundary-allow を付けて根拠を残すこと。",
  );
  process.exit(1);
}
console.log("✓ AI境界は健全（app/api は AI ルートのみ・外部送信は lib/ai/ のみ）");
