import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import { RAKKU_POSES, EXPRESSION_TO_POSE, type RakkuPose } from "@/components/mascot/poses";
import manifest from "@/components/mascot/manifest.json";

/**
 * マスコット画像の受け入れ規約（docs/09_マスコット.md §5）のテスト。
 * 「manifest が実在しないファイルを指す」「規約外のポーズ名が混入する」を防ぐ。
 */

const POSE_SLUGS = Object.keys(RAKKU_POSES) as RakkuPose[];

describe("マスコットのポーズ定義と受け入れ台帳", () => {
  it("ポーズは docs/09 §2 の10種と1対1", () => {
    expect(POSE_SLUGS).toHaveLength(10);
    expect(new Set(POSE_SLUGS).size).toBe(10);
    for (const slug of ["front", "worried", "sleep", "calc"] as const) {
      expect(POSE_SLUGS).toContain(slug);
    }
  });

  it("expression の後方互換マッピングは定義済みポーズを指す", () => {
    expect(POSE_SLUGS).toContain(EXPRESSION_TO_POSE.smile);
    expect(POSE_SLUGS).toContain(EXPRESSION_TO_POSE.sorry);
  });

  it("manifest.files は規約どおり（ポーズ⊆定義・ファイル名一致・実在する）", () => {
    for (const [pose, file] of Object.entries(manifest.files as Record<string, string>)) {
      expect(POSE_SLUGS, `未定義のポーズ "${pose}" が台帳にあります`).toContain(pose);
      expect(file, `${pose} のファイル名が規約外です`).toMatch(new RegExp(`^${pose}\\.(png|webp)$`));
      expect(
        existsSync(resolve(process.cwd(), "public", "mascot", file)),
        `台帳の ${file} が public/mascot/ に実在しません（npm run mascot:manifest で再生成を）`,
      ).toBe(true);
    }
  });
});
