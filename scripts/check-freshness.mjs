#!/usr/bin/env node
/**
 * check-freshness.mjs — data/tables と記事 front-matter のデータ鮮度監査（P2-I01）
 *
 * data/seido の鮮度（nextCheckDue）は scripts/verify-seido.mjs の構造検査が担う。
 * 本スクリプトはその監視外だった2面を担当する（D2=洗濯表示の教訓: 陳腐化がゲートを
 * すり抜けるのは「誰も監視していない面」からである）:
 *
 *   1. data/tables/*.json — 参考値・非制度データ。
 *      メタ（次回再確認日・出典・確認日）を義務化し、期限超過を検出する。
 *      表記は camelCase（nextCheckDue/lastVerified/org/source/sources）と
 *      snake_case（next_check_due/last_verified/source_url）が混在しているため両方を受ける。
 *   2. content/articles/*.md — front-matter（JSON）の next_check_due。
 *      全記事に必須。期限超過を検出する。
 *
 * 判定（verify-seido.mjs の nextCheckDue と同じ規約）:
 *   - フィールド欠落 → エラー
 *   - 期限超過（< 今日） → エラー
 *   - 期限まで30日以内 → 警告
 *
 * CI では PR/push で常時実行（欠落・超過をブロック）し、日次スケジュールでは
 * 失敗時に verify-seido.yml が Issue を1本に集約して自動起票する（1日1Issue）。
 *
 * Usage:
 *   node scripts/check-freshness.mjs          # 監査を実行
 *   node scripts/check-freshness.mjs --json   # 機械可読な結果を stdout に
 *
 * Exit codes: 0 = OK（警告はありうる） / 1 = エラーあり / 2 = 実行時エラー
 */

import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TABLES_DIR = join(ROOT, 'data', 'tables');
const ARTICLES_DIR = join(ROOT, 'content', 'articles');

/** 基準日は JST（verify-seido.mjs と同じ理由でタイムゾーン固定） */
const TODAY = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
const WARN_DAYS = 30;

const AS_JSON = process.argv.includes('--json');

/** @type {{level:'error'|'warn', file:string, message:string}[]} */
const findings = [];
const stats = { tables: 0, articles: 0 };
const err = (file, message) => findings.push({ level: 'error', file, message });
const warn = (file, message) => findings.push({ level: 'warn', file, message });

function checkDue(file, due, label) {
  if (!due) {
    err(file, `${label}（次回再確認日）がありません（全ファイル必須。P2-I01）`);
    return;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(due))) {
    err(file, `${label} "${due}" が YYYY-MM-DD 形式ではありません`);
    return;
  }
  if (due < TODAY) {
    err(
      file,
      `★再確認期限超過★ ${label} "${due}" を過ぎています。一次情報と突き合わせ、確認日を更新するか値を差し替えたうえで次回日付を設定してください（手順: docs/10_公開チェックリスト.md）`
    );
  } else {
    const days = Math.ceil((new Date(due) - new Date(TODAY)) / 86400000);
    if (days <= WARN_DAYS) warn(file, `再確認期限まで残り${days}日（${due}）`);
  }
}

// 制度データでない編集資産（出典・確認日・再確認期限を持たない設計）は鮮度監査の対象外。
// search-synonyms.json は検索の同義語辞書（specs/ai/01 §2。煽り語混入は brand-lint が担保）。
const NON_SEIDO_TABLES = new Set(['search-synonyms.json']);

async function checkTables() {
  if (!existsSync(TABLES_DIR)) return;
  for (const name of (await readdir(TABLES_DIR)).filter((f) => f.endsWith('.json') && !NON_SEIDO_TABLES.has(f)).sort()) {
    const file = relative(ROOT, join(TABLES_DIR, name));
    stats.tables++;
    let d;
    try {
      d = JSON.parse(await readFile(join(TABLES_DIR, name), 'utf8'));
    } catch (e) {
      err(file, `JSONとしてパースできません: ${e.message}`);
      continue;
    }
    checkDue(file, d.nextCheckDue ?? d.next_check_due, 'nextCheckDue');
    const hasSource = 'org' in d || 'source' in d || 'sources' in d || 'source_url' in d;
    if (!hasSource) {
      err(file, '出典メタ（org / source / sources / source_url のいずれか）がありません（P2-I01 で義務化）');
    }
    const verified = d.lastVerified ?? d.last_verified;
    if (!verified) {
      err(file, '確認日（lastVerified / last_verified）がありません（P2-I01 で義務化）');
    } else if (verified > TODAY) {
      err(file, `確認日 "${verified}" が未来の日付です`);
    }
  }
}

async function checkArticles() {
  if (!existsSync(ARTICLES_DIR)) return;
  for (const name of (await readdir(ARTICLES_DIR)).filter((f) => f.endsWith('.md')).sort()) {
    const file = relative(ROOT, join(ARTICLES_DIR, name));
    stats.articles++;
    const text = await readFile(join(ARTICLES_DIR, name), 'utf8');
    const m = /^---\r?\n(\{[\s\S]*?\n\})\r?\n---/.exec(text);
    if (!m) {
      err(file, 'front-matter（JSON）が見つかりません');
      continue;
    }
    let fm;
    try {
      fm = JSON.parse(m[1]);
    } catch (e) {
      err(file, `front-matter がJSONとしてパースできません: ${e.message}`);
      continue;
    }
    checkDue(file, fm.next_check_due, 'next_check_due');
  }
}

async function main() {
  await checkTables();
  await checkArticles();

  const errors = findings.filter((f) => f.level === 'error');
  const warns = findings.filter((f) => f.level === 'warn');

  if (AS_JSON) {
    console.log(JSON.stringify({ ok: errors.length === 0, today: TODAY, stats, findings }, null, 2));
  } else {
    for (const f of findings) {
      console.log(`${f.level === 'error' ? 'ERROR' : 'WARN '} ${f.file}\n      ${f.message}`);
    }
    console.log('');
    console.log(`検査: data/tables ${stats.tables}ファイル / 記事 ${stats.articles}本（基準日 ${TODAY}）`);
    console.log(`エラー: ${errors.length} / 警告: ${warns.length}`);
  }
  process.exit(errors.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
