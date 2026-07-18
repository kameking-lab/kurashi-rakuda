import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const REGISTRY_PATH = path.join(ROOT, "app/lib/tools/registry.json");
const ARTICLES_DIR = path.join(ROOT, "content/articles");
const OUT_DIR = path.join(__dirname, "out");

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
const liveTools = registry.filter(t => t.status === "live");

let count = 0;
for (const tool of liveTools) {
  const articlePath = path.join(ARTICLES_DIR, `tool-narisou-${tool.slug}.md`);
  if (!fs.existsSync(articlePath)) {
    continue;
  }

  const rawArticle = fs.readFileSync(articlePath, "utf8");
  const toolUrl = `https://kurashi-rakuda.vercel.app/tools/${tool.category}/${tool.slug}`;
  const paywallDivider = `
---

🚨 **ここから先は有料パートです** 🚨
ご購入いただいた方は、専用の計算ツールと詳細な解説をご利用いただけます。

**専用切り出しツールURL**: ${toolUrl}
※このURLはご購入者専用です。将来にわたり変更されません。

---
`;

  const modifiedArticle = rawArticle.replace(
    "## 計算の考え方", 
    paywallDivider + "\n## 計算の考え方"
  );

  const outPath = path.join(OUT_DIR, `note-${tool.slug}.md`);
  fs.writeFileSync(outPath, modifiedArticle, "utf8");
  count++;
  if (count >= 10) break;
}

console.log(`Generated ${count} articles in notegen/out/`);
