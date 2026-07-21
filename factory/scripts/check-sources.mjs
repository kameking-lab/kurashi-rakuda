#!/usr/bin/env node
/**
 * check-sources.mjs — 記事出典ゲート（content/articles/*.md の sources[] 検査）
 *
 * 目的: 記事本文が主張する事実の出典URLが、実在し（liveness）、かつ本当にその事実を
 * 書いているか（verify.expect 逐語照合）を機械的に検査する。「出典URLは本物だが
 * 中身は書いていない」型の捏造（記事生成モデルが実在URLに実在しない数値を紐付ける事故）
 * を検知する。scripts/verify-seido.mjs（data/seido/ 向け）と同じ思想の、記事向け実装。
 *
 * 検査は2段階:
 *   1. 構造検査（オフライン・常時実行・PRブロッキング）
 *      - 新規・変更記事（--base で指定した基準との git diff）は、全 source に
 *        verify.expect（1件以上の逐語文字列）が必須
 *      - 既存の111記事（本ゲート導入前）は verify.expect 無しでも構造検査は通す
 *        （grandfather。--fetch のliveness検査は既存記事にも適用される）
 *   2. 出典照合（ネットワーク・--fetch 指定時のみ・スケジュール実行想定）
 *      - 全記事の重複排除済みURLについて HTTP 200 を確認（リトライ・キャッシュあり）
 *        恒久的な404は error、それ以外の取得失敗（タイムアウト・5xx等）は warn
 *        （相手サイト都合の一時障害でPRを塞がないため。verify-seidoと同方針）
 *      - verify.expect がある source は、取得した本文に逐語一致するかを照合
 *      - トップページURL（パスが空か"/"）を出典にしている場合、取得した <title> と
 *        source.title の乖離を warn（独自タイトルの捏造疑いを検知）
 *
 * Usage:
 *   node factory/scripts/check-sources.mjs                      # 構造検査のみ
 *   node factory/scripts/check-sources.mjs --base=origin/master # 新規/変更記事の判定基準
 *   node factory/scripts/check-sources.mjs --fetch              # 出典照合も実行
 *   node factory/scripts/check-sources.mjs --fetch --json
 *   node factory/scripts/check-sources.mjs --fetch --report=out.md  # 棚卸しレポートを書き出す
 *
 * Exit codes: 0=OK（警告はありうる） / 1=エラーあり / 2=実行時エラー
 */
import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { parseArticle } from "./lib/frontmatter.mjs";
import { fetchSource, normalize } from "./lib/fetch-text.mjs";

const execFileAsync = promisify(execFile);

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const ARTICLES_DIR = join(ROOT, "content", "articles");

const args = process.argv.slice(2);
const DO_FETCH = args.includes("--fetch");
const AS_JSON = args.includes("--json");
const BASE_REF = (args.find((a) => a.startsWith("--base=")) || "").split("=")[1] || null;
const REPORT_PATH = (args.find((a) => a.startsWith("--report=")) || "").split("=")[1] || null;

/** @type {{level:'error'|'warn', file:string, path:string, message:string}[]} */
const findings = [];
const err = (file, path, message) => findings.push({ level: "error", file, path, message });
const warn = (file, path, message) => findings.push({ level: "warn", file, path, message });

const stats = { articles: 0, sourceEntries: 0, uniqueUrls: 0, fetched: 0, checkedExpect: 0 };

/** 棚卸し: 死リンク・要retrofit記事の一覧（起票用） */
const deadLinks = [];
const retrofitCandidates = new Set(); // verify.expect が無い grandfather source を持つ記事ファイル名
const zeroSourceArticles = new Set(); // 出典が1件もない grandfather 記事
const titleDrifts = [];

async function collectArticles() {
  if (!existsSync(ARTICLES_DIR)) {
    console.error(`記事ディレクトリがありません: ${ARTICLES_DIR}`);
    process.exit(2);
  }
  const files = (await readdir(ARTICLES_DIR)).filter((f) => f.endsWith(".md")).sort();
  const out = [];
  for (const f of files) {
    const full = join(ARTICLES_DIR, f);
    const raw = await readFile(full, "utf8");
    let article;
    try {
      article = parseArticle(raw);
    } catch (e) {
      err(f, "$", `frontmatter を解析できません: ${e.message}`);
      continue;
    }
    out.push({ file: f, full, frontmatter: article.frontmatter });
  }
  return out;
}

/** --base との git diff で新規/変更された記事ファイル名の集合を返す。基準が取れなければ空集合（安全側） */
async function collectChangedFiles(base) {
  if (!base) return new Set();
  try {
    const { stdout } = await execFileAsync("git", ["diff", "--name-only", `${base}...HEAD`, "--", "content/articles"], {
      cwd: ROOT,
      maxBuffer: 8 * 1024 * 1024,
    });
    return new Set(
      stdout
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((p) => p.split("/").pop())
    );
  } catch (e) {
    console.warn(`警告: git diff に失敗したため新規/変更記事の判定をスキップします（全記事をgrandfather扱い）: ${e.message}`);
    return new Set();
  }
}

function isTopPage(urlStr) {
  try {
    const u = new URL(urlStr);
    return u.pathname === "" || u.pathname === "/";
  } catch {
    return false;
  }
}

function checkStructure(article, isChanged) {
  const { file, frontmatter } = article;
  const sources = Array.isArray(frontmatter.sources) ? frontmatter.sources : [];
  if (sources.length === 0) {
    if (isChanged) {
      err(file, "$.sources", "出典が1件もありません");
    } else {
      // grandfather: 既存記事の出典ゼロは重大な棚卸し対象だがCIを即赤にはしない（retrofitキューへ）
      warn(file, "$.sources", "出典が1件もありません（grandfather。retrofitキューで解消予定）");
      zeroSourceArticles.add(file);
    }
    return;
  }
  let missingExpect = false;
  sources.forEach((s, i) => {
    stats.sourceEntries++;
    const p = `$.sources[${i}]`;
    if (!s.url) {
      err(file, p, "source.url がありません");
      return;
    }
    try {
      new URL(s.url);
    } catch {
      err(file, p, `source.url が不正なURLです: ${s.url}`);
      return;
    }
    const hasExpect = Array.isArray(s.verify?.expect) && s.verify.expect.length > 0;
    if (!hasExpect) {
      if (isChanged) {
        err(file, p, `新規・変更記事は verify.expect（出典本文の逐語一部）が必須です: ${s.url}`);
      } else {
        missingExpect = true;
      }
    }
  });
  if (missingExpect) retrofitCandidates.add(file);
}

async function checkAgainstSource(url, entries) {
  // entries: [{file, path, source}] — 同一URLを引用する全記事分
  let result;
  let lastErr = null;
  const attempts = 3;
  for (let i = 0; i < attempts; i++) {
    try {
      result = await fetchSource(url);
      break;
    } catch (e) {
      lastErr = e;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  stats.fetched++;

  if (!result) {
    // ネットワーク例外（タイムアウト・DNS失敗等）: 相手サイト都合の可能性があるためwarnのみ
    for (const e of entries) {
      warn(e.file, e.path, `出典の取得に失敗しました（照合スキップ・恒久リンク切れとは断定しません）: ${url} — ${lastErr?.message}`);
    }
    return;
  }

  if (!result.ok) {
    if (result.status === 404) {
      deadLinks.push({ url, status: result.status, articles: entries.map((e) => e.file) });
      for (const e of entries) {
        err(e.file, e.path, `出典URLが404です（恒久リンク切れの可能性）: ${url}`);
      }
    } else {
      for (const e of entries) {
        warn(e.file, e.path, `出典URLがHTTP ${result.status} を返しました（一時的な可能性があるためwarn）: ${url}`);
      }
    }
    return;
  }

  // liveness OK。verify.expect があれば逐語照合。トップページなら title 乖離も見る。
  for (const e of entries) {
    const expect = e.source.verify?.expect;
    if (Array.isArray(expect) && expect.length) {
      for (const needle of expect) {
        stats.checkedExpect++;
        if (!result.text || !result.text.includes(normalize(needle))) {
          err(e.file, e.path, `出典に「${needle}」が見つかりません。事実が出典に存在しないか、ページの表記が変わった可能性があります（出典: ${url}）`);
        }
      }
    }
    if (isTopPage(url) && result.titleTag && e.source.title) {
      const pageTitle = normalize(result.titleTag);
      const claimedTitle = normalize(e.source.title);
      if (!pageTitle.includes(claimedTitle) && !claimedTitle.includes(pageTitle)) {
        titleDrifts.push({ file: e.file, url, claimed: e.source.title, actual: result.titleTag });
        warn(
          e.file,
          e.path,
          `トップページURLに対し、出典タイトル「${e.source.title}」がページの実タイトル「${result.titleTag}」と一致しません（サブページを装った捏造タイトルの疑い）`
        );
      }
    }
  }
}

async function main() {
  const articles = await collectArticles();
  stats.articles = articles.length;
  const changed = await collectChangedFiles(BASE_REF);

  for (const article of articles) {
    checkStructure(article, changed.has(article.file));
  }

  if (DO_FETCH) {
    /** @type {Map<string, {file:string, path:string, source:object}[]>} */
    const byUrl = new Map();
    for (const article of articles) {
      const sources = Array.isArray(article.frontmatter.sources) ? article.frontmatter.sources : [];
      sources.forEach((s, i) => {
        if (!s.url) return;
        try {
          new URL(s.url);
        } catch {
          return; // 構造検査側で既にerror済み
        }
        if (!byUrl.has(s.url)) byUrl.set(s.url, []);
        byUrl.get(s.url).push({ file: article.file, path: `$.sources[${i}]`, source: s });
      });
    }
    stats.uniqueUrls = byUrl.size;
    for (const [url, entries] of byUrl) {
      await checkAgainstSource(url, entries);
    }
  }

  const errors = findings.filter((f) => f.level === "error");
  const warns = findings.filter((f) => f.level === "warn");

  if (REPORT_PATH) {
    const lines = [];
    lines.push("# 記事出典 棚卸しレポート（factory/scripts/check-sources.mjs --report）");
    lines.push("");
    lines.push(`生成元コミット時点。検査記事数: ${stats.articles} / 出典延べ数: ${stats.sourceEntries} / ユニークURL: ${stats.uniqueUrls}`);
    lines.push("");
    lines.push(`## 出典が1件もない記事（${zeroSourceArticles.size}本。最優先でretrofit）`);
    if (zeroSourceArticles.size === 0) {
      lines.push("なし");
    } else {
      for (const f of [...zeroSourceArticles].sort()) lines.push(`- [ ] ${f}`);
    }
    lines.push("");
    lines.push("## 死リンク（HTTP 404。要差し替え）");
    if (deadLinks.length === 0) {
      lines.push("なし");
    } else {
      for (const d of deadLinks) lines.push(`- ${d.url} — 参照記事: ${d.articles.join(", ")}`);
    }
    lines.push("");
    lines.push(`## verify.expect 未設定の記事（grandfather・要retrofit、${retrofitCandidates.size}本）`);
    if (retrofitCandidates.size === 0) {
      lines.push("なし");
    } else {
      for (const f of [...retrofitCandidates].sort()) lines.push(`- [ ] ${f}`);
    }
    lines.push("");
    lines.push("## タイトル乖離（トップページURL＋独自タイトルの疑い）");
    if (titleDrifts.length === 0) {
      lines.push("なし");
    } else {
      for (const t of titleDrifts) lines.push(`- ${t.file}: 「${t.claimed}」宣言 ⇔ 実タイトル「${t.actual}」（${t.url}）`);
    }
    await mkdir(dirname(join(ROOT, REPORT_PATH)), { recursive: true }).catch(() => {});
    await writeFile(join(ROOT, REPORT_PATH), lines.join("\n") + "\n", "utf8");
  }

  if (AS_JSON) {
    console.log(JSON.stringify({ ok: errors.length === 0, stats, deadLinks, retrofitCandidates: [...retrofitCandidates], zeroSourceArticles: [...zeroSourceArticles], titleDrifts, findings }, null, 2));
  } else {
    for (const f of findings) {
      const tag = f.level === "error" ? "ERROR" : "WARN ";
      console.log(`${tag} ${f.file} ${f.path}\n      ${f.message}`);
    }
    console.log("");
    console.log(`検査記事数: ${stats.articles} / 出典延べ数: ${stats.sourceEntries}` + (DO_FETCH ? ` / ユニークURL: ${stats.uniqueUrls} / 取得: ${stats.fetched} / 照合した逐語文字列: ${stats.checkedExpect}` : "（--fetch で出典照合を実行）"));
    console.log(`grandfather（verify.expect未設定）の記事: ${retrofitCandidates.size} / 出典ゼロ: ${zeroSourceArticles.size} / 死リンク: ${deadLinks.length} / タイトル乖離: ${titleDrifts.length}`);
    console.log(`エラー: ${errors.length} / 警告: ${warns.length}`);
  }

  process.exit(errors.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
