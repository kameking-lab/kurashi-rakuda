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

// 洗顔料
import senkaPerfectWhipF from "./senka-perfect-whip-f.json";
import curelJyunshinHoshitsuAwaSengan from "./curel-jyunshin-hoshitsu-awa-sengan.json";
import hadalaboGokujunHyaluronAwaSengan from "./hadalabo-gokujun-hyaluron-awa-sengan.json";
import namerakaHonpoAwaSenganNc from "./nameraka-honpo-awa-sengan-nc.json";
import cowBrandMutenkaAwaNoSengan from "./cow-brand-mutenka-awa-no-sengan.json";
import orbisClearfulWash from "./orbis-clearful-wash.json";
import chifureScrubFacewash from "./chifure-scrub-facewash.json";
import ishizawaLabKeanaNadeshikoOkomeSenganryo from "./ishizawa-lab-keana-nadeshiko-okome-senganryo.json";
import koseSoftymoCleansingWashBlack from "./kose-softymo-cleansing-wash-black.json";

// 化粧水
import curelJunshinHoshitsuLotionIii from "./curel-junshin-hoshitsu-lotion-iii.json";
import hadalaboGokujunHyaluronEki from "./hadalabo-gokujun-hyaluron-eki.json";
import namerakaHonpoTotemoShittoriLotionNc from "./nameraka-honpo-totemo-shittori-lotion-nc.json";
import orbisUEssenceLotion from "./orbis-u-essence-lotion.json";
import ihadaYakuyouUruoiLotionTotemoShittori from "./ihada-yakuyou-uruoi-lotion-totemo-shittori.json";
import ishizawaLabKeanaOtokonokoLotion from "./ishizawa-lab-keana-otokonoko-lotion.json";
import naturieHatomugiKeshoMizu from "./naturie-hatomugi-kesho-mizu.json";
import aqualabelAquaLotionShittori from "./aqualabel-aqua-lotion-shittori.json";
import koseSekkiseiYakuyou from "./kose-sekkisei-yakuyou.json";
import cowMutenkaMoistureLotionShittori from "./cow-mutenka-moisture-lotion-shittori.json";

// 乳液/クリーム
import hadalaboGokujunHyaluronCream from "./hadalabo-gokujun-hyaluron-cream.json";
import namerakaHonpoCreamNc from "./nameraka-honpo-cream-nc.json";
import curelJunshinHoshitsuFaceCream from "./curel-junshin-hoshitsu-face-cream.json";
import orbisAquanistMoistureLm from "./orbis-aquanist-moisture-lm.json";
import cowMutenkaHoshitsuEmulsion from "./cow-mutenka-hoshitsu-emulsion.json";
import kikumasamuneNihonshuEmulsion from "./kikumasamune-nihonshu-emulsion.json";
import orbisClearfulMoisture from "./orbis-clearful-moisture.json";
import shiseidoEssentialEnergyHydratingCream from "./shiseido-essential-energy-hydrating-cream.json";
import naturieHatomugiHoshitsuGel from "./naturie-hatomugi-hoshitsu-gel.json";
import aqualabelTreatmentMilkWhitening from "./aqualabel-treatment-milk-whitening.json";

// 日焼け止め
import curelJunshinHoshitsuUvEssence from "./curel-junshin-hoshitsu-uv-essence.json";
import hadalaboGokujunUvWhiteGel from "./hadalabo-gokujun-uv-white-gel.json";
import sunplaySuperBlock from "./sunplay-super-block.json";
import orbisSunscreenFrience from "./orbis-sunscreen-frience.json";
import allieChronoBeautyGelUvEx from "./allie-chrono-beauty-gel-uv-ex.json";
import rohtoSkinAquaHyaluronSerumUv from "./rohto-skin-aqua-hyaluron-serum-uv.json";

export const COSME_PRODUCT_FILES = [
  chifureFacewashShittori,
  chifureLotionTotemoShittori,
  mujiSensitiveLotionShittori,
  chifureCreamHoshitsu,
  bioreUvAquaRichAiryVeil,

  senkaPerfectWhipF,
  curelJyunshinHoshitsuAwaSengan,
  hadalaboGokujunHyaluronAwaSengan,
  namerakaHonpoAwaSenganNc,
  cowBrandMutenkaAwaNoSengan,
  orbisClearfulWash,
  chifureScrubFacewash,
  ishizawaLabKeanaNadeshikoOkomeSenganryo,
  koseSoftymoCleansingWashBlack,

  curelJunshinHoshitsuLotionIii,
  hadalaboGokujunHyaluronEki,
  namerakaHonpoTotemoShittoriLotionNc,
  orbisUEssenceLotion,
  ihadaYakuyouUruoiLotionTotemoShittori,
  ishizawaLabKeanaOtokonokoLotion,
  naturieHatomugiKeshoMizu,
  aqualabelAquaLotionShittori,
  koseSekkiseiYakuyou,
  cowMutenkaMoistureLotionShittori,

  hadalaboGokujunHyaluronCream,
  namerakaHonpoCreamNc,
  curelJunshinHoshitsuFaceCream,
  orbisAquanistMoistureLm,
  cowMutenkaHoshitsuEmulsion,
  kikumasamuneNihonshuEmulsion,
  orbisClearfulMoisture,
  shiseidoEssentialEnergyHydratingCream,
  naturieHatomugiHoshitsuGel,
  aqualabelTreatmentMilkWhitening,

  curelJunshinHoshitsuUvEssence,
  hadalaboGokujunUvWhiteGel,
  sunplaySuperBlock,
  orbisSunscreenFrience,
  allieChronoBeautyGelUvEx,
  rohtoSkinAquaHyaluronSerumUv,
];
