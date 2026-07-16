// YMYL数値の機械照合ゲート本体。
// safe-ai-site の web/src/lib/plain/fidelity.ts（原文↔平易文の数値・義務主体照合）の設計思想を移植し、
// 本サイト向けに「本文中の数値 ⇔ frontmatter.facts[] ⇔ factory/data/seido/*.json（一次情報の転記）」の
// 三者照合に組み替えたもの。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FACTORY_ROOT = path.resolve(__dirname, "../../");

const ALLOWLIST_PATH = path.join(FACTORY_ROOT, "config/source-allowlist.json");
const ARTICLE_TYPES_PATH = path.join(FACTORY_ROOT, "config/article-types.json");
const SEIDO_DIR = path.join(FACTORY_ROOT, "data/seido");

// 本文中の「金額・日数・条件」等YMYL数値として抽出する単位トークン。
// 西暦年（2026年）はrevision_yearで別管理するため意図的に除外する。
const UNIT_TOKENS = [
  "円", "%", "％", "歳", "ヶ月", "か月", "カ月", "週", "日間", "日",
  "人", "回", "件", "種類", "mL", "ml", "g", "kg", "cm", "度", "割", "点", "時間", "分",
];
// 長いトークンを先にマッチさせる（"日間"が"日"に食われないように）
const SORTED_UNITS = [...UNIT_TOKENS].sort((a, b) => b.length - a.length);
const UNIT_ALT = SORTED_UNITS.map((u) => u.replace(/[%％]/g, (c) => `\\${c}`)).join("|");
const NUMBER_RE = new RegExp(`([0-9]+(?:,[0-9]{3})*(?:\\.[0-9]+)?)(万)?(${UNIT_ALT})`, "g");

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
    const numStr = m[1].replace(/,/g, "");
    const manFlag = m[2] === "万";
    const unit = normUnit(m[3]);
    let value = parseFloat(numStr);
    if (manFlag) value *= 10000;
    found.push({ raw, value, unit, key: `${value}${unit}` });
  }
  return found;
}

export function factKey(fact) {
  return `${fact.value}${normUnit(fact.unit)}`;
}

function resolvePath(obj, dotted) {
  return dotted.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

// seido_ref 形式: "<ファイル名>.json#<ドットパス>"
export function resolveSeidoRef(seidoRef) {
  const m = seidoRef.match(/^([^#]+)#(.+)$/);
  if (!m) return { error: `invalid seido_ref format: ${seidoRef}` };
  const [, file, dotted] = m;
  const filePath = path.join(SEIDO_DIR, file);
  if (!fs.existsSync(filePath)) {
    return { error: `seido data file not found: data/seido/${file}` };
  }
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const resolved = resolvePath(data, dotted);
  if (resolved === undefined) {
    return { error: `path not found in ${file}: ${dotted}` };
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
