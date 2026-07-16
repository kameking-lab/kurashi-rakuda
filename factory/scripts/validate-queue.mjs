#!/usr/bin/env node
// 使い方: node factory/scripts/validate-queue.mjs
// factory/queue/*.json を factory/schema/job.schema.json 相当のルールで検査し、
// カテゴリ配分が docs/02_ツール一覧.md の分布(妊娠出産16/子育て20/家事18/お金11/健康12/仕事12/介護12 → 60本比例配分)
// と一致しているかを確認する。JSON Schemaライブラリに依存せず手書きバリデータで実装（依存ゼロ方針）。
import fs from "node:fs";
import path from "node:path";

const QUEUE_DIR = path.resolve("factory/queue");
const EXPECTED_DISTRIBUTION = {
  "妊娠・出産": 10,
  "子育て": 12,
  "家事・料理": 11,
  "お金": 6,
  "健康・美容": 7,
  "仕事・キャリア": 7,
  "介護": 7,
};

const REQUIRED_FIELDS = ["job_id", "batch", "category", "type", "title_draft", "priority", "seido_data", "status"];
const VALID_TYPES = ["seido-kaisetsu", "tool-narisou", "dandori"];
const VALID_PRIORITY = ["S", "A", "B", "C"];
const VALID_STATUS = ["queued", "in_progress", "generated", "gated_pass", "gated_fail"];

function main() {
  const files = fs.readdirSync(QUEUE_DIR).filter((f) => f.endsWith(".json") && f !== "index.json");
  const errors = [];
  const seenIds = new Set();
  const distribution = {};

  for (const f of files) {
    const filePath = path.join(QUEUE_DIR, f);
    const job = JSON.parse(fs.readFileSync(filePath, "utf8"));

    for (const field of REQUIRED_FIELDS) {
      if (job[field] === undefined) errors.push(`${f}: missing field "${field}"`);
    }
    if (job.job_id && seenIds.has(job.job_id)) errors.push(`${f}: duplicate job_id ${job.job_id}`);
    if (job.job_id) seenIds.add(job.job_id);
    if (job.type && !VALID_TYPES.includes(job.type)) errors.push(`${f}: invalid type "${job.type}"`);
    if (job.priority && !VALID_PRIORITY.includes(job.priority)) errors.push(`${f}: invalid priority "${job.priority}"`);
    if (job.status && !VALID_STATUS.includes(job.status)) errors.push(`${f}: invalid status "${job.status}"`);
    if (job.category) distribution[job.category] = (distribution[job.category] || 0) + 1;
  }

  console.log(`checked ${files.length} job files`);
  console.log("category distribution:", distribution);

  for (const [cat, expected] of Object.entries(EXPECTED_DISTRIBUTION)) {
    const actual = distribution[cat] || 0;
    if (actual !== expected) {
      errors.push(`distribution mismatch for "${cat}": expected ${expected}, got ${actual}`);
    }
  }
  const totalExpected = Object.values(EXPECTED_DISTRIBUTION).reduce((a, b) => a + b, 0);
  if (files.length !== totalExpected) {
    errors.push(`total job count mismatch: expected ${totalExpected}, got ${files.length}`);
  }

  if (errors.length > 0) {
    console.error(`\n${errors.length} error(s):`);
    for (const e of errors) console.error(`  ✗ ${e}`);
    process.exit(1);
  }
  console.log("\nOK: queue matches docs/02 category distribution (60 jobs)");
}

main();
