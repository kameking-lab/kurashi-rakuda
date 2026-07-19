/**
 * data/cosme/products/*.json の集約インデックス（商品1件=1ファイルの運用を維持しつつ、
 * ランタイムでは配列としてまとめてimportできるようにする）。
 * ★商品を追加・削除したら、このファイルにも1行追加/削除すること★
 * .github/scripts/check-cosme-fairness.mjs はディレクトリを直接走査するため本ファイルに依存しないが、
 * tests/cosme-match.test.ts がこのインデックスとディレクトリの件数一致を検査する。
 */
import chifureFacewashShittori from "./chifure-facewash-shittori.json";
import chifureLotionTotemoShittori from "./chifure-lotion-totemo-shittori.json";
import mujiSensitiveLotionShittori from "./muji-sensitive-lotion-shittori.json";
import chifureCreamHoshitsu from "./chifure-cream-hoshitsu.json";
import bioreUvAquaRichAiryVeil from "./biore-uv-aqua-rich-airy-veil.json";

export const COSME_PRODUCT_FILES = [
  chifureFacewashShittori,
  chifureLotionTotemoShittori,
  mujiSensitiveLotionShittori,
  chifureCreamHoshitsu,
  bioreUvAquaRichAiryVeil,
];
