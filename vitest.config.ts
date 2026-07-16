import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * G2（Q3ツール実装）の計算ロジック用テスト設定。
 * UIコンポーネントはE2E/実機確認で担保し、ここでは純関数（calc）のみを対象とする。
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
