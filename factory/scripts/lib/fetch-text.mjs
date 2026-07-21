// 出典ページ／PDFの取得とテキスト化。scripts/verify-seido.mjs の同名ロジックの
// 移植版（記事出典専用に factory/scripts 側へ複製。両者は検査対象スキーマが違うため
// 共有モジュール化はせず、実体参照テーブル等の「一度直したバグ」だけを引き継ぐ）。
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * ★ここに無い実体参照は文字化けした literal として残り、照合が必ず失敗する。★
 * scripts/verify-seido.mjs の HTML_ENTITIES と同じ表（大阪府ページの &times; 事故の教訓）。
 */
const HTML_ENTITIES = {
  nbsp: " ", ensp: " ", emsp: " ", thinsp: " ",
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'",
  times: "×", divide: "÷", minus: "−", plusmn: "±",
  yen: "¥", cent: "¢", pound: "£", euro: "€", deg: "°",
  middot: "・", bull: "•", hellip: "…", ndash: "–", mdash: "—",
  lsquo: "'", rsquo: "'", ldquo: '"', rdquo: '"',
  laquo: "«", raquo: "»", sect: "§", para: "¶", dagger: "†", Dagger: "‡",
  copy: "©", reg: "®", trade: "™", permil: "‰",
  frac12: "½", frac14: "¼", frac34: "¾", sup1: "¹", sup2: "²", sup3: "³",
  larr: "←", rarr: "→", uarr: "↑", darr: "↓", harr: "↔",
  le: "≤", ge: "≥", ne: "≠", asymp: "≈", prime: "′", Prime: "″",
};

export function decodeEntities(s) {
  return s.replace(/&(#[0-9]+|#x[0-9a-f]+|[a-z][a-z0-9]*);/gi, (m, body) => {
    if (body[0] === "#") {
      const cp = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      if (!Number.isFinite(cp) || cp < 0 || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) return m;
      try {
        return String.fromCodePoint(cp);
      } catch {
        return m;
      }
    }
    const named = HTML_ENTITIES[body];
    if (named !== undefined) return named;
    const lower = HTML_ENTITIES[body.toLowerCase()];
    return lower !== undefined ? lower : m;
  });
}

export function stripHtml(html) {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  );
}

/** <title> の中身だけを取り出す（本文除去前の生HTMLに対して使う） */
export function extractTitleTag(html) {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (!m) return null;
  return decodeEntities(m[1].replace(/\s+/g, " ")).trim();
}

export function decodeHtml(buf, contentTypeHeader) {
  let charset = (contentTypeHeader.match(/charset=([\w-]+)/) || [])[1];
  if (!charset) {
    const head = buf.subarray(0, 2048).toString("latin1");
    charset = (head.match(/charset=["']?([\w-]+)/i) || [])[1];
  }
  charset = (charset || "utf-8").toLowerCase();
  const alias = { shift_jis: "shift_jis", sjis: "shift_jis", "x-sjis": "shift_jis", "windows-31j": "shift_jis", "euc-jp": "euc-jp" };
  const enc = alias[charset] || charset;
  try {
    return new TextDecoder(enc).decode(buf);
  } catch {
    return buf.toString("utf8");
  }
}

/** 全角/半角・カンマ・空白の揺れを吸収して比較するための正規化 */
export function normalize(s) {
  return String(s)
    .normalize("NFKC")
    .replace(/[\s　]/g, "")
    .replace(/[，,]/g, ",");
}

let pdfFallbackWarned = false;

/** PDF→テキスト。PyMuPDF優先・pdftotextは代替（scripts/verify-seido.mjsと同方針） */
export async function pdfToText(buf) {
  const dir = await mkdtemp(join(tmpdir(), "sources-"));
  const pdfPath = join(dir, "doc.pdf");
  try {
    await writeFile(pdfPath, buf);
    const py = `
import sys, fitz
d = fitz.open(sys.argv[1])
sys.stdout.reconfigure(encoding='utf-8')
for p in d:
    print(p.get_text())
`;
    const pyPath = join(dir, "x.py");
    await writeFile(pyPath, py, "utf8");
    for (const exe of ["python", "python3"]) {
      try {
        const { stdout } = await execFileAsync(exe, [pyPath, pdfPath], { maxBuffer: 64 * 1024 * 1024 });
        if (stdout && stdout.trim().length > 0) return stdout;
      } catch {
        /* try next interpreter */
      }
    }
    try {
      const { stdout } = await execFileAsync("pdftotext", ["-layout", "-enc", "UTF-8", pdfPath, "-"], {
        maxBuffer: 64 * 1024 * 1024,
      });
      if (stdout && stdout.trim().length > 0) {
        if (!pdfFallbackWarned) {
          console.warn("警告: PyMuPDF が利用できないため pdftotext で代替します（表・読み順の乱れに注意）。`pip install pymupdf` を推奨します。");
          pdfFallbackWarned = true;
        }
        return stdout;
      }
    } catch {
      /* fall through */
    }
    throw new Error("PDFのテキスト化に失敗（PyMuPDF も pdftotext も利用不可）");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/**
 * e-Gov 法令検索（laws.e-gov.go.jp/law/<lawId>）は JavaScript で本文を描画する SPA であり、
 * HTML を取得しても数百バイト程度の空シェルしか返らない（＝条文が1文字も含まれない）。
 * そのまま照合すると全ての条文チェックが「見つかりません」で誤って落ちる。
 * 法令本文は e-Gov 法令API v2 から取得する（scripts/verify-seido.mjs と同じ対処。P0002同様の教訓）。
 * 出典URLとしては人間が読める /law/<lawId> を維持したいので、照合時のみAPIに差し替える。
 */
function egovApiUrl(urlStr) {
  const m = /^https:\/\/(?:laws|elaws)\.e-gov\.go\.jp\/law\/([A-Za-z0-9]+)/.exec(urlStr);
  if (!m) return null;
  return `https://laws.e-gov.go.jp/api/2/law_data/${m[1]}?response_format=xml`;
}

/**
 * 出典URLを取得する。戻り値は { status, ok, text, titleTag } で、
 * ネットワークエラー（DNS失敗・タイムアウト等）は例外を投げる（呼び出し側でリトライする）。
 * HTTPエラー応答（404等）は例外を投げず status に反映する（恒久リンク切れの判定に必要なため）。
 */
export async function fetchSource(url, { timeoutMs = 20000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const apiUrl = egovApiUrl(url);
    const res = await fetch(apiUrl ?? url, {
      headers: apiUrl
        ? { "User-Agent": "kurashi-rakuda-source-verifier/1.0", Accept: "application/xml" }
        : {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 kurashi-rakuda-source-verifier/1.0",
            "Accept-Language": "ja",
          },
      redirect: "follow",
      signal: controller.signal,
    });
    const status = res.status;
    if (!res.ok) {
      return { status, ok: false, text: null, titleTag: null };
    }
    if (apiUrl) {
      const xml = await res.text();
      return { status, ok: true, text: normalize(stripHtml(xml)), titleTag: null };
    }
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    const isPdf = ct.includes("application/pdf") || url.toLowerCase().endsWith(".pdf");
    const buf = Buffer.from(await res.arrayBuffer());
    if (isPdf) {
      const text = await pdfToText(buf);
      return { status, ok: true, text: normalize(text), titleTag: null };
    }
    const html = decodeHtml(buf, ct);
    const titleTag = extractTitleTag(html);
    const text = normalize(stripHtml(html));
    return { status, ok: true, text, titleTag };
  } finally {
    clearTimeout(timer);
  }
}
