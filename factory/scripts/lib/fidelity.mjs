// YMYL数値の機械照合ゲート本体。
// safe-ai-site の web/src/lib/plain/fidelity.ts（原文↔平易文の数値・義務主体照合）の設計思想を移植し、
// 本サイト向けに「本文中の数値 ⇔ frontmatter.facts[] ⇔ data/（一次情報の転記）」の三者照合に組み替えたもの。
//
// ★データの単一ソースは root data/ ★（G2データ一元化、2026-07-17 社長決裁）
//   - 制度データ: data/seido/*.json（共通スキーマ。数値は valueNode {value, sourceId, checkedAt}）
//   - 非制度の対照表: data/tables/*.json
//   - 旧 factory/data/seido/ 形式の seido_ref は config/seido-ref-map.json で root へ解決する（互換レイヤー）
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FACTORY_ROOT = path.resolve(__dirname, "../../");
const REPO_ROOT = path.resolve(FACTORY_ROOT, "../");

const ALLOWLIST_PATH = path.join(FACTORY_ROOT, "config/source-allowlist.json");
const ARTICLE_TYPES_PATH = path.join(FACTORY_ROOT, "config/article-types.json");
const REF_MAP_PATH = path.join(FACTORY_ROOT, "config/seido-ref-map.json");
const SEIDO_DIR = path.join(REPO_ROOT, "data/seido");
const TABLES_DIR = path.join(REPO_ROOT, "data/tables");

// 本文中の「金額・日数・条件」等YMYL数値として抽出する単位トークン。
// 西暦年（2026年）はrevision_yearで別管理するため意図的に除外する。
const UNIT_TOKENS = [
  "円", "%", "％", "歳", "ヶ月", "か月", "カ月", "週", "日間", "日",
  "人", "回", "件", "種類", "mL", "ml", "g", "kg", "cm", "度", "割", "点", "時間", "分",
];
// 長いトークンを先にマッチさせる（"日間"が"日"に食われないように）
const SORTED_UNITS = [...UNIT_TOKENS].sort((a, b) => b.length - a.length);
const UNIT_ALT = SORTED_UNITS.map((u) => u.replace(/[%％]/g, (c) => `\\${c}`)).join("|");
// 負数の表記（「マイナス18度」「−18度」）も1つの数値として認識する。
// 冷凍庫の目安温度のような負の値を、符号を落とした正の数として照合してしまわないため
// （data/tables/reitou-hozon.json（旧）が符号曖昧な 18 を持っていた問題の再発防止）。
// ASCIIハイフンは英数式・ISO日付（2026-08-01）と衝突しやすいため含めない。
const NUMBER_RE = new RegExp(`(マイナス|−|－)?([0-9]+(?:,[0-9]{3})*(?:\\.[0-9]+)?)(万)?(${UNIT_ALT})`, "g");

function normUnit(u) {
  if (u === "％") return "%";
  if (u === "か月" || u === "カ月") return "ヶ月";
  return u;
}

export function loadAllowlist() {
  return JSON.parse(fs.readFileSync(ALLOWLIST_PATH, "utf8"));
}

export function loadArticleTypes() {
  return JSON.parse(fs.readFileSync(ARTICLE_TYPES_PATH, "utf8"));
}

export function isTrustedUrl(url, allowlist) {
  let hostname;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  return allowlist.domains.some((d) => hostname === d.domain || hostname.endsWith("." + d.domain));
}

// 本文中に出現する「数値+単位」トークンを抽出し、正規化キーの集合を返す。
export function extractBodyNumbers(body) {
  const found = [];
  for (const m of body.matchAll(NUMBER_RE)) {
    const raw = m[0];
    const minus = m[1] !== undefined;
    const numStr = m[2].replace(/,/g, "");
    const manFlag = m[3] === "万";
    const unit = normUnit(m[4]);
    let value = parseFloat(numStr);
    if (manFlag) value *= 10000;
    if (minus) value = -value;
    found.push({ raw, value, unit, key: `${value}${unit}` });
  }
  return found;
}

export function factKey(fact) {
  return `${fact.value}${normUnit(fact.unit)}`;
}

function resolvePath(obj, dotted) {
  // 配列は「items[id=gohan]」のように [<キー>=<値>] で要素を選択できる。
  // インデックス参照（items.3）は並べ替えで壊れるため、id を持つ配列はセレクタを使うこと。
  let acc = obj;
  for (const token of dotted.split(".")) {
    if (acc == null) return undefined;
    const sel = /^([^[]+)\[([^=\]]+)=([^\]]+)\]$/.exec(token);
    if (sel) {
      const arr = acc[sel[1]];
      if (!Array.isArray(arr)) return undefined;
      acc = arr.find((e) => e != null && String(e[sel[2]]) === sel[3]);
    } else {
      acc = acc[token];
    }
  }
  return acc;
}

let refMapCache = null;
function loadRefMap() {
  if (!refMapCache) {
    refMapCache = fs.existsSync(REF_MAP_PATH)
      ? JSON.parse(fs.readFileSync(REF_MAP_PATH, "utf8")).map
      : {};
  }
  return refMapCache;
}

// seido_ref 形式: "<ファイル名>.json#<ドットパス>"
// 解決順序:
//   1. 旧 factory 形式の ref は seido-ref-map.json で root の ref（＋scale）に変換
//   2. data/seido/ → data/tables/ の順でファイルを探す
//   3. 解決先が valueNode（{value, sourceId, ...}）の場合は .value を自動で剥がす
export function resolveSeidoRef(seidoRef) {
  const mapped = loadRefMap()[seidoRef];
  const scale = mapped?.scale ?? 1;
  const effectiveRef = mapped?.ref ?? seidoRef;

  const m = effectiveRef.match(/^([^#]+)#(.+)$/);
  if (!m) return { error: `invalid seido_ref format: ${effectiveRef}` };
  const [, file, dotted] = m;

  let filePath = path.join(SEIDO_DIR, file);
  if (!fs.existsSync(filePath)) filePath = path.join(TABLES_DIR, file);
  if (!fs.existsSync(filePath)) {
    return { error: `data file not found in data/seido or data/tables: ${file}` };
  }

  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  let resolved = resolvePath(data, dotted);
  if (resolved === undefined) {
    return { error: `path not found in ${file}: ${dotted}` };
  }
  if (resolved !== null && typeof resolved === "object" && "value" in resolved) {
    resolved = resolved.value;
  }
  if (typeof resolved === "number") {
    // 0.67 * 100 === 67.00000000000001 のような浮動小数点誤差を丸める
    resolved = Math.round(resolved * scale * 1e9) / 1e9;
  }
  return { value: resolved };
}

/**
 * 1記事分の忠実性ゲートを実行する。
 * @param {{frontmatter: object, body: string}} article
 * @returns {{ok: boolean, violations: Array<{code: string, detail: string}>, warnings: Array<{code: string, detail: string}>}}
 */
export function checkFidelity(article) {
  const { frontmatter: fm, body } = article;
  const violations = [];
  const warnings = [];
  const allowlist = loadAllowlist();
  const articleTypes = loadArticleTypes();

  const typeDef = articleTypes.types[fm.type];
  if (!typeDef) {
    violations.push({ code: "unknown-type", detail: `type "${fm.type}" is not defined in article-types.json` });
    return { ok: false, violations, warnings };
  }

  // 1. 必須frontmatterフィールド
  for (const field of typeDef.required_frontmatter) {
    if (fm[field] === undefined || fm[field] === null) {
      violations.push({ code: "frontmatter-missing", detail: `required field missing: ${field}` });
    }
  }

  // 2. 出典許可リスト照合
  for (const src of fm.sources || []) {
    if (!isTrustedUrl(src.url, allowlist)) {
      violations.push({ code: "source-not-allowlisted", detail: `${src.url} is not in factory/config/source-allowlist.json` });
    }
  }

  // 2.5. tool_ref の実在照合（G2検収で8/8件の不正slugがすり抜けた再発防止）
  if (fm.tool_ref) {
    const registryPath = path.join(REPO_ROOT, "app/lib/tools/registry.json");
    const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
    if (!registry.some((t) => t.slug === fm.tool_ref)) {
      violations.push({
        code: "tool-ref-not-found",
        detail: `tool_ref "${fm.tool_ref}" does not exist in app/lib/tools/registry.json (valid slugs: ${registry.map((t) => t.slug).join(", ")})`,
      });
    }
  }

  // 3. 本文見出し・フッター3点セット
  for (const heading of typeDef.required_body_headings || []) {
    if (!body.includes(heading)) {
      violations.push({ code: "heading-missing", detail: `required heading missing: ${heading}` });
    }
  }
  for (const marker of typeDef.required_footer_markers || []) {
    if (!body.includes(marker)) {
      violations.push({ code: "footer-marker-missing", detail: `required footer marker missing: ${marker}` });
    }
  }

  // 4. facts[] 最小件数
  const facts = fm.facts || [];
  if (facts.length < (typeDef.min_facts || 0)) {
    violations.push({ code: "facts-too-few", detail: `facts.length=${facts.length} < min_facts=${typeDef.min_facts}` });
  }

  if (typeDef.requires_fact_check) {
    // 5. seido_ref 機械照合
    for (const fact of facts) {
      if (fact.status === "stub") {
        if (!fact.stub_reason) {
          violations.push({ code: "stub-reason-missing", detail: `fact "${fact.key}" is status=stub but has no stub_reason` });
        } else {
          warnings.push({ code: "seido-stub", detail: `fact "${fact.key}" not yet cross-checked (stub): ${fact.stub_reason}` });
        }
        continue;
      }
      if (!fact.seido_ref) {
        violations.push({ code: "seido-ref-missing", detail: `fact "${fact.key}" status=verified but has no seido_ref` });
        continue;
      }
      const resolved = resolveSeidoRef(fact.seido_ref);
      if (resolved.error) {
        violations.push({ code: "seido-unresolved", detail: `fact "${fact.key}": ${resolved.error}` });
        continue;
      }
      if (Number(resolved.value) !== Number(fact.value)) {
        violations.push({
          code: "seido-mismatch",
          detail: `fact "${fact.key}" value=${fact.value} does not match data/seido value=${resolved.value} (${fact.seido_ref})`,
        });
      }
    }

    // 6. 本文の数値 ⇔ facts[] の双方向照合
    const bodyNumbers = extractBodyNumbers(body);
    const declaredKeys = new Set(facts.map(factKey));
    const bodyKeys = new Set(bodyNumbers.map((n) => n.key));

    for (const n of bodyNumbers) {
      if (!declaredKeys.has(n.key)) {
        violations.push({
          code: "number-undeclared",
          detail: `body contains "${n.raw}" (normalized ${n.key}) not declared in frontmatter.facts[]`,
        });
      }
    }
    for (const fact of facts) {
      const key = factKey(fact);
      if (!bodyKeys.has(key)) {
        warnings.push({ code: "fact-unused-in-body", detail: `fact "${fact.key}" (${key}) declared but not found verbatim in body text` });
      }
    }
  }

  return { ok: violations.length === 0, violations, warnings };
}
