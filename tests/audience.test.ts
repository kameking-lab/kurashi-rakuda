import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { validateAudience, type Audience } from "@/app/lib/audience";
import { tools } from "@/app/lib/tools/registry";
import { getAllArticles } from "@/app/lib/articles/loader";

/**
 * 対象属性メタ（audience）の網羅検証。CI の check-audience.mjs と同じ不変条件を、
 * 本体の validateAudience（app/lib/audience.ts）で全ツール・全記事に対して確認する
 * （.mjs 側と型側でロジックが乖離しないことの担保）。
 */
describe("audience メタ", () => {
  it("validateAudience は妥当な値を通す", () => {
    const ok: Audience = {
      universal: false,
      lifeStages: ["infant", "toddler"],
      lifeEvents: ["parenting"],
      childAgeBands: ["age0_1", "age1_3"],
      gender: null,
    };
    expect(validateAudience(ok)).toEqual([]);
  });

  it("universal=true なのに属性を持つと不正", () => {
    expect(
      validateAudience({
        universal: true,
        lifeStages: ["adult"],
        lifeEvents: [],
        childAgeBands: [],
        gender: null,
      }),
    ).not.toEqual([]);
  });

  it("prenatal は pregnant を要する", () => {
    expect(
      validateAudience({
        universal: false,
        lifeStages: ["pregnancy"],
        lifeEvents: ["parenting"],
        childAgeBands: ["prenatal"],
        gender: null,
      }),
    ).not.toEqual([]);
  });

  it("未知の語彙を弾く", () => {
    expect(
      validateAudience({
        universal: false,
        lifeStages: ["teenager"],
        lifeEvents: [],
        childAgeBands: [],
        gender: null,
      }),
    ).not.toEqual([]);
  });

  it("全ツール（registry）が妥当な audience を持つ", () => {
    for (const t of tools) {
      expect(validateAudience(t.audience), `tool ${t.slug}`).toEqual([]);
    }
  });

  it("全記事（frontmatter）が妥当な audience を持つ（既定値フォールバックに依存しない）", () => {
    // ローダのフォールバックに頼らず、frontmatter に実際に audience があることを確認する
    const dir = join(process.cwd(), "content", "articles");
    for (const f of readdirSync(dir).filter((n) => n.endsWith(".md"))) {
      const raw = readFileSync(join(dir, f), "utf8");
      const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      expect(m, `frontmatter ${f}`).not.toBeNull();
      const fm = JSON.parse(m![1]);
      expect("audience" in fm, `${f} に audience`).toBe(true);
      expect(validateAudience(fm.audience), `article ${f}`).toEqual([]);
    }
  });

  it("ローダ経由でも全記事が妥当な audience を返す", () => {
    for (const a of getAllArticles()) {
      expect(validateAudience(a.audience), `loaded ${a.slug}`).toEqual([]);
    }
  });
});
