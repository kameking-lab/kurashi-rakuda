import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * ツールの計算ロジック（lib/tools/impl/**）の単体テスト。
 * 各仕様書 specs/s-tools/*.md の「テストケース」章を実装したもの。
 *
 * YMYL の金額計算は「実装者≠検算者」のダブルチェックが原則（docs/08）。
 * テストは仕様書の期待値をそのまま書き写すのではなく、
 * 仕様書に記載された検算（原典の数値との突き合わせ）を再現する形で書く。
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
