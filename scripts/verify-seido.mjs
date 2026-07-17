#!/usr/bin/env node
/**
 * verify-seido.mjs — 制度データと出典ページの機械照合
 *
 * data/seido/ 配下の全JSONについて、以下を検査する:
 *
 *   1. 構造検査（オフライン・常時実行）
 *      - JSONとしてパースできるか
 *      - 共通スキーマの必須フィールド（id/name/fiscalYear/asOf/sources/disclaimer）があるか
 *      - id がファイル名と一致するか
 *      - 全ての sourceId 参照が sources に存在するか（＝出典なしの数値がないか）
 *      - 全ての valueNode に checkedAt があるか
 *      - 一次情報以外の出典が混入していないか（ドメイン許可リスト）
 *      - amendments の expiresOn が past でないか（＝期限切れデータの検出）
 *
 *   2. 出典照合（ネットワーク・--fetch 指定時のみ）
 *      - 各 verify.expect の文字列が、出典ページ本文に実在するか
 *      - HTML は文字コードを判定して本文抽出、PDF は pdftotext / PyMuPDF でテキスト化
 *
 * CIでは「構造検査は常に」「出典照合は日次スケジュール」で回す想定。
 * 出典照合はネットワークと相手サイトの都合で落ちうるため、PRブロックには使わない。
 *
 * Usage:
 *   node scripts/verify-seido.mjs                # 構造検査のみ（高速・オフライン）
 *   node scripts/verify-seido.mjs --fetch        # 出典照合も実行
 *   node scripts/verify-seido.mjs --fetch --only=fuyou-kabe
 *   node scripts/verify-seido.mjs --json         # 機械可読な結果を stdout に
 *
 * Exit codes:
 *   0 = すべてOK（警告はありうる）
 *   1 = エラーあり
 *   2 = 実行時エラー（引数不正・ディレクトリなし等）
 */

import { readFile, readdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, basename, extname, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SEIDO_DIR = join(ROOT, 'data', 'seido');
/**
 * 基準日は JST（日本標準時）で求める。
 * 制度データの checkedAt / effectiveFrom / expiresOn は全て日本の官公庁が定める
 * 日本時間の日付であり、UTC で判定すると日本時間の午前中（UTC では前日）に
 * 「確認日が未来」と誤検知してCIが落ちる。
 * CI のタイムゾーンに依存しないよう、UTC+9 に固定して算出する。
 */
const TODAY = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);

/**
 * 一次情報のみを許可する。まとめサイト・民間解説サイトの混入をCIで機械的に防ぐ。
 * 自治体ドメインは無数にあるため、サフィックスで許可する。
 */
const ALLOWED_HOSTS = [
  'laws.e-gov.go.jp',
  'elaws.e-gov.go.jp',
  'www.e-gov.go.jp',
  'www.mhlw.go.jp',
  'www.cfa.go.jp',
  'www.nta.go.jp',
  'www.mof.go.jp',
  'www.soumu.go.jp',
  'www.nenkin.go.jp',
  'www.kyoukaikenpo.or.jp',
  'www.kaigokensaku.mhlw.go.jp',
  'www.hellowork.mhlw.go.jp',
  'jsite.mhlw.go.jp',
  // ↓2026-07-17 社長決裁で追加した3ドメイン。各団体が自ら策定する基準の出典に限定して使う。
  'www.jasso.or.jp', // 日本肥満学会。肥満度分類（同学会が策定主体）のみ
  'www.jcia.org', // 日本化粧品工業会。SPF/PA測定・表示基準（同会が策定主体）のみ
  'w-health.jp', // 厚生労働省研究班「女性の健康推進室 ヘルスケアラボ」（厚労省事業サイト・非go.jpドメイン）
  'www.w-health.jp',
];
const ALLOWED_HOST_SUFFIXES = ['.lg.jp', '.go.jp'];
/**
 * 自治体の公式ドメインのうち .lg.jp / .go.jp でないもの。
 * 自治体は子育て情報を別サブドメインの専用サイトで公開していることが多いため
 * （例: 札幌市の kosodate.city.sapporo.jp、名古屋市の kodomokosodate.city.nagoya.jp＝「ここなご」）、
 * ドメイン一致だけでなくサブドメインも許可する。
 * ★ここに追加してよいのは、当該自治体が公式に運営するサイトのみ。★
 * 民間の保活情報サイト・まとめサイトは、たとえ自治体名を冠していても追加してはならない。
 */
const ALLOWED_MUNICIPAL_DOMAINS = [
  'city.sapporo.jp',
  'city.kawasaki.jp',
  'city.nagoya.jp',
  'city.nerima.tokyo.jp',
  'city.ota.tokyo.jp',
  'city.edogawa.tokyo.jp',
  'city.adachi.tokyo.jp',
  'city.suginami.tokyo.jp',
];

const args = process.argv.slice(2);
const DO_FETCH = args.includes('--fetch');
const AS_JSON = args.includes('--json');
const ONLY = (args.find((a) => a.startsWith('--only=')) || '').split('=')[1] || null;

/** @type {{level:'error'|'warn', file:string, path:string, message:string}[]} */
const findings = [];
const stats = { files: 0, sources: 0, valueNodes: 0, checked: 0, fetched: 0, skipped: 0 };

const err = (file, path, message) => findings.push({ level: 'error', file, path, message });
const warn = (file, path, message) => findings.push({ level: 'warn', file, path, message });

// ---------------------------------------------------------------- utilities

/** JSON を再帰的に歩き、(path, node) を渡す */
function walk(node, fn, path = '$') {
  fn(path, node);
  if (Array.isArray(node)) {
    node.forEach((v, i) => walk(v, fn, `${path}[${i}]`));
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) walk(v, fn, `${path}.${k}`);
  }
}

/** valueNode らしきオブジェクトか（value と sourceId を持つ） */
const isValueNode = (n) =>
  n && typeof n === 'object' && !Array.isArray(n) && 'value' in n && 'sourceId' in n;

/** sourceId を参照しているノードか（valueNode でなくても sourceId を持つものがある） */
const hasSourceRef = (n) =>
  n && typeof n === 'object' && !Array.isArray(n) && typeof n.sourceId === 'string';

function hostAllowed(urlStr) {
  let host;
  try {
    host = new URL(urlStr).host;
  } catch {
    return false;
  }
  if (ALLOWED_HOSTS.includes(host)) return true;
  if (ALLOWED_MUNICIPAL_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))) return true;
  return ALLOWED_HOST_SUFFIXES.some((s) => host.endsWith(s));
}

/** 全角/半角・カンマ・空白の揺れを吸収して比較するための正規化 */
function normalize(s) {
  return String(s)
    .normalize('NFKC')
    .replace(/[\s 　]/g, '')
    .replace(/[，,]/g, ',');
}

// ---------------------------------------------------------------- fetching

const pageCache = new Map();

/**
 * e-Gov 法令検索（laws.e-gov.go.jp/law/<lawId>）は JavaScript で本文を描画する SPA であり、
 * HTML を取得しても 700バイト程度の空シェルしか返らない（＝条文が1文字も含まれない）。
 * そのまま照合すると全ての条文チェックが「見つかりません」で誤って落ちる。
 * 法令本文は e-Gov 法令API v2 から取得する。
 * 出典URLとしては人間が読める /law/<lawId> を維持したいので、照合時のみAPIに差し替える。
 */
function egovApiUrl(urlStr) {
  const m = /^https:\/\/(?:laws|elaws)\.e-gov\.go\.jp\/law\/([A-Za-z0-9]+)/.exec(urlStr);
  if (!m) return null;
  return `https://laws.e-gov.go.jp/api/2/law_data/${m[1]}?response_format=xml`;
}

async function fetchText(url, contentType) {
  if (pageCache.has(url)) return pageCache.get(url);

  const apiUrl = egovApiUrl(url);
  if (apiUrl) {
    const res = await fetch(apiUrl, {
      headers: { 'User-Agent': 'kurashi-rakuda-seido-verifier/1.0', Accept: 'application/xml' },
    });
    if (!res.ok) throw new Error(`e-Gov法令API HTTP ${res.status}`);
    // XMLタグを除去して条文テキストのみにする
    const text = stripHtml(await res.text());
    pageCache.set(url, text);
    stats.fetched++;
    return text;
  }

  const res = await fetch(url, {
    headers: {
      // 一次情報サイトはUA未設定を弾く場合がある
      'User-Agent': 'kurashi-rakuda-seido-verifier/1.0 (+https://github.com/kameking-lab/kurashi-rakuda)',
      'Accept-Language': 'ja',
    },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const ct = (res.headers.get('content-type') || '').toLowerCase();
  const isPdf = contentType === 'pdf' || ct.includes('application/pdf') || url.endsWith('.pdf');

  let text;
  if (isPdf) {
    const buf = Buffer.from(await res.arrayBuffer());
    text = await pdfToText(buf);
  } else {
    const buf = Buffer.from(await res.arrayBuffer());
    text = decodeHtml(buf, ct);
    text = stripHtml(text);
  }
  pageCache.set(url, text);
  stats.fetched++;
  return text;
}

/** Shift_JIS / EUC-JP の官公庁ページが残っているため、charset を見て復号する */
function decodeHtml(buf, contentTypeHeader) {
  let charset = (contentTypeHeader.match(/charset=([\w-]+)/) || [])[1];
  if (!charset) {
    const head = buf.subarray(0, 2048).toString('latin1');
    charset = (head.match(/charset=["']?([\w-]+)/i) || [])[1];
  }
  charset = (charset || 'utf-8').toLowerCase();
  const alias = { 'shift_jis': 'shift_jis', 'sjis': 'shift_jis', 'x-sjis': 'shift_jis', 'windows-31j': 'shift_jis', 'euc-jp': 'euc-jp' };
  const enc = alias[charset] || charset;
  try {
    return new TextDecoder(enc).decode(buf);
  } catch {
    return buf.toString('utf8');
  }
}

/**
 * 名前付き実体参照の対応表。
 *
 * ★ここに無い実体参照は「文字化けした literal」として残り、照合が必ず失敗する。★
 * 官公庁・自治体のページは記号を実体参照で書くことが多い。実例として、大阪府の
 * 児童扶養手当のページは乗算記号を `&times;` で出力しており、当初の実装（nbsp/amp/
 * lt/gt の4つのみをデコード）では「×」を含む verify.expect が**必ず失敗していた**。
 * データ作成者はこれを「制度が変わった」ではなく「照合できない」として expect 側で
 * 回避せざるを得ず、照合の網が静かに緩む。実体参照の取りこぼしは沈黙して害を成すため、
 * 数値参照（&#215; / &#xD7;）を含めて一括で解決する。
 */
const HTML_ENTITIES = {
  nbsp: ' ', ensp: ' ', emsp: ' ', thinsp: ' ',
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  times: '×', divide: '÷', minus: '−', plusmn: '±',
  yen: '¥', cent: '¢', pound: '£', euro: '€', deg: '°',
  middot: '・', bull: '•', hellip: '…', ndash: '–', mdash: '—',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  laquo: '«', raquo: '»', sect: '§', para: '¶', dagger: '†', Dagger: '‡',
  copy: '©', reg: '®', trade: '™', permil: '‰',
  frac12: '½', frac14: '¼', frac34: '¾', sup1: '¹', sup2: '²', sup3: '³',
  larr: '←', rarr: '→', uarr: '↑', darr: '↓', harr: '↔',
  le: '≤', ge: '≥', ne: '≠', asymp: '≈', prime: '′', Prime: '″',
};

/**
 * 実体参照を1回のパスで復号する。
 * ★段階的な .replace() で連鎖させてはならない★ 例えば `&amp;` を先に `&` へ戻すと、
 * 原文の `&amp;lt;`（＝リテラル "&lt;" の意）が後段で `<` に化ける（二重復号）。
 * 1パスなら、復号後に生まれた `&` が再び実体参照として解釈されることはない。
 */
function decodeEntities(s) {
  return s.replace(/&(#[0-9]+|#x[0-9a-f]+|[a-z][a-z0-9]*);/gi, (m, body) => {
    if (body[0] === '#') {
      const cp = body[1] === 'x' || body[1] === 'X'
        ? parseInt(body.slice(2), 16)
        : parseInt(body.slice(1), 10);
      // 不正なコードポイント（範囲外・サロゲート）は原文のまま残す
      if (!Number.isFinite(cp) || cp < 0 || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) return m;
      try {
        return String.fromCodePoint(cp);
      } catch {
        return m;
      }
    }
    const named = HTML_ENTITIES[body];
    if (named !== undefined) return named;
    // 大文字小文字の揺れ（&Times; 等）を吸収する。ただし Dagger/Prime のように
    // 大小で別字を指すものは上の完全一致で既に解決済み。
    const lower = HTML_ENTITIES[body.toLowerCase()];
    return lower !== undefined ? lower : m;
  });
}

function stripHtml(html) {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  );
}

/**
 * PDF→テキスト。
 *
 * ★PyMuPDF を優先し、pdftotext は代替とする。★
 * 官公庁の日本語PDFに対して pdftotext -layout は、重なり合うテキストラン（見出しの
 * 袋文字・ルビ等）を座標順に混ぜてしまい、
 *   「０９平成2源３泉年４所月得税令の和８改年正４月のあらまし」
 * のような読めない文字列を出力する。空文字列にはならないため「非空なら採用」という
 * 判定では検知できず、表のセル文字列が全て照合失敗する。
 * PyMuPDF の get_text() は読み順を保つため、日本語PDFではこちらが正しい。
 *
 * ★制約★ 結合セルの多い表（国税庁のあらまし等）は、どちらの方法でも列の対応関係は
 * 復元できない。そのため本スクリプトは「表構造の再現」ではなく「期待する文字列が
 * ページ内に存在するか」のみを検査する。表の構造的な正しさ（どの行がどの値か）は
 * specs/s-tools/ 側のテストケースで担保する。
 */
async function pdfToText(buf) {
  const dir = await mkdtemp(join(tmpdir(), 'seido-'));
  const pdfPath = join(dir, 'doc.pdf');
  try {
    await writeFile(pdfPath, buf);

    const py = `
import sys, fitz
d = fitz.open(sys.argv[1])
sys.stdout.reconfigure(encoding='utf-8')
for p in d:
    print(p.get_text())
`;
    const pyPath = join(dir, 'x.py');
    await writeFile(pyPath, py, 'utf8');
    for (const exe of ['python', 'python3']) {
      try {
        const { stdout } = await execFileAsync(exe, [pyPath, pdfPath], { maxBuffer: 64 * 1024 * 1024 });
        if (stdout && stdout.trim().length > 0) return stdout;
      } catch {
        /* try next interpreter */
      }
    }

    // PyMuPDF が無い環境（CIの最小イメージ等）向けの代替。
    // 日本語の表は読み順が崩れるため、照合失敗は誤検知の可能性がある旨を警告する。
    try {
      const { stdout } = await execFileAsync('pdftotext', ['-layout', '-enc', 'UTF-8', pdfPath, '-'], {
        maxBuffer: 64 * 1024 * 1024,
      });
      if (stdout && stdout.trim().length > 0) {
        if (!pdfFallbackWarned) {
          console.warn(
            '警告: PyMuPDF が利用できないため pdftotext で代替します。日本語PDFの表は読み順が崩れ、' +
              '照合が誤って失敗する場合があります。`pip install pymupdf` を推奨します。'
          );
          pdfFallbackWarned = true;
        }
        return stdout;
      }
    } catch {
      /* fall through */
    }

    throw new Error('PDFのテキスト化に失敗（PyMuPDF も pdftotext も利用不可）');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
let pdfFallbackWarned = false;

// ---------------------------------------------------------------- checks

function checkStructure(file, data) {
  const rel = relative(ROOT, file);
  const id = basename(file, extname(file));

  for (const key of ['id', 'name', 'fiscalYear', 'asOf', 'sources', 'disclaimer']) {
    if (data[key] === undefined) err(rel, `$.${key}`, `必須フィールド ${key} がありません`);
  }

  if (data.id && data.id !== id) {
    err(rel, '$.id', `id "${data.id}" がファイル名 "${id}" と一致しません`);
  }

  if (typeof data.disclaimer === 'string' && data.disclaimer.length < 20) {
    err(rel, '$.disclaimer', '免責表示文が短すぎます（20文字以上必須。YMYL領域のため）');
  }

  // --- sources
  const sourceIds = new Set();
  if (Array.isArray(data.sources)) {
    if (data.sources.length === 0) err(rel, '$.sources', '出典が1件もありません');
    for (const [i, s] of data.sources.entries()) {
      stats.sources++;
      const p = `$.sources[${i}]`;
      if (!s.id) err(rel, p, 'source.id がありません');
      else {
        if (sourceIds.has(s.id)) err(rel, p, `source.id "${s.id}" が重複しています`);
        sourceIds.add(s.id);
      }
      for (const k of ['title', 'publisher', 'url', 'checkedAt', 'tier']) {
        if (!s[k]) err(rel, p, `source.${k} がありません（一次情報の要件）`);
      }
      if (s.url && !hostAllowed(s.url)) {
        err(rel, p, `一次情報でない出典が含まれています: ${s.url} — 許可されるのは e-Gov・府省庁・公的機関・自治体公式のみ（まとめサイト引用禁止）`);
      }
      if (s.contentType === 'pdf' && !s.landingUrl) {
        warn(rel, p, 'PDF出典に landingUrl がありません。PDFは差し替えられるため掲載元ページを併記してください');
      }
      if (s.checkedAt && s.checkedAt > TODAY) {
        err(rel, p, `checkedAt "${s.checkedAt}" が未来の日付です`);
      }
    }
  }

  // --- sourceId 参照の健全性 & valueNode の必須項目
  walk(data, (path, node) => {
    if (path.startsWith('$.sources')) return;
    if (!hasSourceRef(node)) return;
    if (!sourceIds.has(node.sourceId)) {
      err(rel, path, `sourceId "${node.sourceId}" が sources に存在しません`);
    }
    // amendments は制度の改正予定を記述するもので、個別の確認日は持たない
    // （データセット全体の asOf と sources[].checkedAt が確認日を担保する）。
    // 期限チェックは checkAmendments 側で別途行う。
    if (path.startsWith('$.amendments')) return;
    if (!node.checkedAt) {
      err(rel, path, '出典を参照するノードに checkedAt がありません（確認日は全項目必須）');
    } else if (node.checkedAt > TODAY) {
      err(rel, path, `checkedAt "${node.checkedAt}" が未来の日付です`);
    }
    if (isValueNode(node)) {
      stats.valueNodes++;
      if (!('amendmentNote' in node)) {
        err(rel, path, 'amendmentNote がありません（改正予定メモは全項目必須。無ければ「なし（YYYY-MM-DD時点）」と明記）');
      }
      const v = node.verify;
      if (v && v.skip && !v.skipReason) {
        err(rel, path, 'verify.skip=true には skipReason が必須です');
      }
    }
  });

  // --- amendments の期限
  if (Array.isArray(data.amendments)) {
    for (const [i, a] of data.amendments.entries()) {
      const p = `$.amendments[${i}]`;
      if (!a.summary) err(rel, p, 'amendment.summary がありません');
      if (!a.status) err(rel, p, 'amendment.status がありません');
      if (a.sourceId && !sourceIds.has(a.sourceId)) {
        err(rel, p, `sourceId "${a.sourceId}" が sources に存在しません`);
      }
      if (a.expiresOn && a.expiresOn < TODAY) {
        err(
          rel,
          p,
          `★期限切れ★ expiresOn "${a.expiresOn}" を過ぎています。この制度データの数値は既に無効の可能性があります: ${a.summary.slice(0, 60)}…`
        );
      } else if (a.expiresOn) {
        const days = Math.ceil((new Date(a.expiresOn) - new Date(TODAY)) / 86400000);
        if (days <= 30) {
          warn(rel, p, `期限まで残り${days}日（${a.expiresOn}）。更新の準備を: ${a.summary.slice(0, 60)}…`);
        }
      }
      if (a.status === 'scheduled' && a.effectiveFrom && a.effectiveFrom <= TODAY) {
        warn(rel, p, `status=scheduled ですが effectiveFrom "${a.effectiveFrom}" は既に到来しています。status を in-force に更新してください`);
      }
    }
  }
}

async function checkAgainstSources(file, data) {
  const rel = relative(ROOT, file);
  const sources = new Map((data.sources || []).map((s) => [s.id, s]));

  /** @type {{path:string, sourceId:string, expect:string[]}[]} */
  const jobs = [];
  walk(data, (path, node) => {
    if (path.startsWith('$.sources')) return;
    if (!hasSourceRef(node)) return;
    const v = node.verify;
    if (!v) return;
    if (v.skip) {
      stats.skipped++;
      return;
    }
    if (Array.isArray(v.expect) && v.expect.length) {
      jobs.push({ path, sourceId: node.sourceId, expect: v.expect });
    }
  });

  // 出典ごとにまとめて1回だけ取得する
  const bySource = new Map();
  for (const j of jobs) {
    if (!bySource.has(j.sourceId)) bySource.set(j.sourceId, []);
    bySource.get(j.sourceId).push(j);
  }

  for (const [sourceId, group] of bySource) {
    const src = sources.get(sourceId);
    if (!src) continue;
    let text;
    try {
      text = await fetchText(src.url, src.contentType);
    } catch (e) {
      warn(rel, `$.sources[${sourceId}]`, `出典の取得に失敗しました（照合スキップ）: ${src.url} — ${e.message}`);
      continue;
    }
    const hay = normalize(text);
    for (const job of group) {
      for (const needle of job.expect) {
        stats.checked++;
        if (!hay.includes(normalize(needle))) {
          err(
            rel,
            job.path,
            `出典に「${needle}」が見つかりません。制度が改正されたか、出典ページの表記が変わった可能性があります（出典: ${src.url}）`
          );
        }
      }
    }
  }
}

// ---------------------------------------------------------------- main

async function collectFiles(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await collectFiles(p)));
    else if (e.name.endsWith('.json')) out.push(p);
  }
  return out;
}

async function main() {
  if (!existsSync(SEIDO_DIR)) {
    console.error(`制度データのディレクトリがありません: ${SEIDO_DIR}`);
    process.exit(2);
  }

  let files = await collectFiles(SEIDO_DIR);
  if (ONLY) files = files.filter((f) => basename(f, '.json') === ONLY);
  if (files.length === 0) {
    console.error(ONLY ? `--only=${ONLY} に一致するファイルがありません` : '検査対象のJSONがありません');
    process.exit(2);
  }

  for (const file of files.sort()) {
    stats.files++;
    const rel = relative(ROOT, file);
    let data;
    try {
      data = JSON.parse(await readFile(file, 'utf8'));
    } catch (e) {
      err(rel, '$', `JSONとしてパースできません: ${e.message}`);
      continue;
    }
    checkStructure(file, data);
    if (DO_FETCH) await checkAgainstSources(file, data);
  }

  const errors = findings.filter((f) => f.level === 'error');
  const warns = findings.filter((f) => f.level === 'warn');

  if (AS_JSON) {
    console.log(JSON.stringify({ ok: errors.length === 0, stats, findings }, null, 2));
  } else {
    for (const f of findings) {
      const tag = f.level === 'error' ? 'ERROR' : 'WARN ';
      console.log(`${tag} ${f.file} ${f.path}\n      ${f.message}`);
    }
    console.log('');
    console.log(`検査ファイル数: ${stats.files} / 出典: ${stats.sources} / 出典付き数値ノード: ${stats.valueNodes}`);
    if (DO_FETCH) {
      console.log(`出典取得: ${stats.fetched}ページ / 照合した文字列: ${stats.checked} / 照合スキップ: ${stats.skipped}`);
    } else {
      console.log('出典照合はスキップしました（--fetch で実行）');
    }
    console.log(`エラー: ${errors.length} / 警告: ${warns.length}`);
  }

  process.exit(errors.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
