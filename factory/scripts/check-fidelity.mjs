#!/usr/bin/env node
// 使い方: node factory/scripts/check-fidelity.mjs content/articles/*.md
// safe-ai-site の `npm run plain:test`（vitest経由でfidelity.tsを実行）に相当するCLI版。
// 依存ゼロで動かすため vitest ではなく素のNodeスクリプトとして実装している。
import fs from "node:fs";
import path from "node:path";
import { parseArticle } from "./lib/frontmatter.mjs";
import { checkFidelity } from "./lib/fidelity.mjs";

function collectTargets(patterns) {
  const files = [];
  for (const p of patterns) {
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
      for (const f of fs.readdirSync(p)) {
        if (f.endsWith(".md")) files.push(path.join(p, f));
      }
    } else if (fs.existsSync(p)) {
      files.push(p);
    } else {
      console.error(`warning: path not found, skipping: ${p}`);
    }
  }
  return files;
}

function main() {
  const args = process.argv.slice(2);
  const patterns = args.length > 0 ? args : ["content/articles"];
  const targets = collectTargets(patterns);

  if (targets.length === 0) {
    console.error("no target files found");
    process.exit(1);
  }

  let totalViolations = 0;
  let totalWarnings = 0;
  const results = [];

  for (const file of targets) {
    const raw = fs.readFileSync(file, "utf8");
    let result;
    try {
      const article = parseArticle(raw);
      result = checkFidelity(article);
    } catch (e) {
      result = { ok: false, violations: [{ code: "parse-error", detail: e.message }], warnings: [] };
    }
    results.push({ file, ...result });
    totalViolations += result.violations.length;
    totalWarnings += result.warnings.length;
  }

  for (const r of results) {
    const status = r.ok ? "PASS" : "FAIL";
    console.log(`[${status}] ${r.file}`);
    for (const v of r.violations) console.log(`  ✗ ${v.code}: ${v.detail}`);
    for (const w of r.warnings) console.log(`  ! ${w.code}: ${w.detail}`);
  }

  const passed = results.filter((r) => r.ok).length;
  console.log(`\n${passed}/${results.length} passed, ${totalViolations} violations, ${totalWarnings} warnings`);

  process.exit(totalViolations > 0 ? 1 : 0);
}

main();
