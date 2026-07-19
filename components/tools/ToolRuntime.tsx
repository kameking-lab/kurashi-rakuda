"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

/**
 * ツール実装の【クライアント側 遅延ロード基盤】（診断 S-2 の根治）。
 *
 * ★なぜクライアントコンポーネントなのか★
 * クライアント JS のコード分割は「クライアント境界」でしか起きない。サーバコンポーネント側で
 * next/dynamic や動的 import をしても、そのルートから到達可能なクライアントコンポーネントは
 * すべて1つの page チャンクにまとめられてしまう（実測: 64ツールで page チャンク 1.5MB）。
 * そこでこの "use client" 境界に slug→dynamic() の表を置く。開いた slug のツールだけが別チャンクとして
 * 遅延ロードされ、他63ツールのコードはダウンロードされない（First Load JS を自治体・ツール数から切り離す）。
 *
 * ssr は既定(true)。サーバ側でもツールを描画するため、初期 HTML（入力フォーム）は分割前と同等。
 * このファイルは page.tsx の implementations と1対1で対応する（ツール追加時は両方に1行足す）。
 */
const registry: Record<string, ComponentType> = {
  "seichou-kyokusen": dynamic(() => import("@/components/tools/impl/SeichouKyokusen").then((m) => ({ default: m.SeichouKyokusen }))),
  "kosodate-kyufu-sougou-check": dynamic(() => import("@/components/tools/impl/KosodateKyufuSougouCheck").then((m) => ({ default: m.KosodateKyufuSougouCheck }))),
  "taishoku-timing-songeki": dynamic(() => import("@/components/tools/impl/TaishokuTimingSongeki").then((m) => ({ default: m.TaishokuTimingSongeki }))),
  "fuyounai-shaho-songeki-bunkiten": dynamic(() => import("@/components/tools/impl/FuyounaiShahoSongeki").then((m) => ({ default: m.FuyounaiShahoSongeki }))),
  "youikuhi-santeihyou": dynamic(() => import("@/components/tools/impl/YouikuhiSanteihyou").then((m) => ({ default: m.YouikuhiSanteihyou }))),
  "funin-chiryou-hoken-tekiyou": dynamic(() => import("@/components/tools/impl/FuninChiryouHokenTekiyou").then((m) => ({ default: m.FuninChiryouHokenTekiyou }))),
  "shokuji-sesshu-kijun-ninpu": dynamic(() => import("@/components/tools/impl/ShokujiSesshuKijunNinpu").then((m) => ({ default: m.ShokujiSesshuKijunNinpu }))),
  "kodomo-iryouhi-jyosei": dynamic(() => import("@/components/tools/impl/KodomoIryouhiJyosei").then((m) => ({ default: m.KodomoIryouhiJyosei }))),
  "kougaku-iryou-kaigo-gassan": dynamic(() => import("@/components/tools/impl/KougakuIryouKaigoGassan").then((m) => ({ default: m.KougakuIryouKaigoGassan }))),
  "kougaku-kaigo-service-hi": dynamic(() => import("@/components/tools/impl/KougakuKaigoServiceHi").then((m) => ({ default: m.KougakuKaigoServiceHi }))),
  "kaigo-kyugyou-kyufukin": dynamic(() => import("@/components/tools/impl/KaigoKyugyouKyufukin").then((m) => ({ default: m.KaigoKyugyouKyufukin }))),
  "jidou-fuyou-teate": dynamic(() => import("@/components/tools/impl/JidouFuyouTeate").then((m) => ({ default: m.JidouFuyouTeate }))),
  "chomiryo-kanzan": dynamic(() => import("@/components/tools/impl/ChomiryoKanzan").then((m) => ({ default: m.ChomiryoKanzan }))),
  "ajitsuke-ougonhi": dynamic(() => import("@/components/tools/impl/AjitsukeOugonhi").then((m) => ({ default: m.AjitsukeOugonhi }))),
  "jido-teate": dynamic(() => import("@/components/tools/impl/JidoTeate").then((m) => ({ default: m.JidoTeate }))),
  "getsurei": dynamic(() => import("@/components/tools/impl/Getsurei").then((m) => ({ default: m.Getsurei }))),
  "jintsuu-kankaku-counter": dynamic(() => import("@/components/tools/impl/JintsuuKankakuCounter").then((m) => ({ default: m.JintsuuKankakuCounter }))),
  "shussan-yoteibi": dynamic(() => import("@/components/tools/impl/ShussanYoteibi").then((m) => ({ default: m.ShussanYoteibi }))),
  "seiri-shuki": dynamic(() => import("@/components/tools/impl/SeiriShuki").then((m) => ({ default: m.SeiriShuki }))),
  "inunohi": dynamic(() => import("@/components/tools/impl/Inunohi").then((m) => ({ default: m.Inunohi }))),
  "fuyo-kabe": dynamic(() => import("@/components/tools/impl/FuyoKabe").then((m) => ({ default: m.FuyoKabe }))),
  "yobousesshu": dynamic(() => import("@/components/tools/impl/Yobousesshu").then((m) => ({ default: m.Yobousesshu }))),
  "hokatsu-schedule": dynamic(() => import("@/components/tools/impl/HokatsuSchedule").then((m) => ({ default: m.HokatsuSchedule }))),
  "junyu-milk-ryo": dynamic(() => import("@/components/tools/impl/JunyuMilkRyo").then((m) => ({ default: m.JunyuMilkRyo }))),
  "rinyushoku-ryo": dynamic(() => import("@/components/tools/impl/RinyushokuRyo").then((m) => ({ default: m.RinyushokuRyo }))),
  "shincho-yosoku": dynamic(() => import("@/components/tools/impl/ShinchoYosoku").then((m) => ({ default: m.ShinchoYosoku }))),
  "hoikuryo": dynamic(() => import("@/components/tools/impl/Hoikuryo").then((m) => ({ default: m.Hoikuryo }))),
  "sankyu-ikukyu-money": dynamic(() => import("@/components/tools/impl/SankyuIkukyuMoney").then((m) => ({ default: m.SankyuIkukyuMoney }))),
  "fukki-bi-keisan": dynamic(() => import("@/components/tools/impl/FukkiBiKeisan").then((m) => ({ default: m.FukkiBiKeisan }))),
  "jitan-kyuyo": dynamic(() => import("@/components/tools/impl/JitanKyuyo").then((m) => ({ default: m.JitanKyuyo }))),
  "fukushoku-tedori": dynamic(() => import("@/components/tools/impl/FukushokuTedori").then((m) => ({ default: m.FukushokuTedori }))),
  "sentaku-hyoji": dynamic(() => import("@/components/tools/impl/SentakuHyoji").then((m) => ({ default: m.SentakuHyoji }))),
  "reito-hozon": dynamic(() => import("@/components/tools/impl/ReitoHozon").then((m) => ({ default: m.ReitoHozon }))),
  "tsukurioki-himochi-ichiran": dynamic(() => import("@/components/tools/impl/TsukuriokiHimochiIchiran").then((m) => ({ default: m.TsukuriokiHimochiIchiran }))),
  "suihan-mizu": dynamic(() => import("@/components/tools/impl/SuihanMizu").then((m) => ({ default: m.SuihanMizu }))),
  "kondate-teian": dynamic(() => import("@/components/tools/impl/KondateTeian").then((m) => ({ default: m.KondateTeian }))),
  "kaimono-list-jidou-seisei": dynamic(() => import("@/components/tools/impl/KaimonoListJidouSeisei").then((m) => ({ default: m.KaimonoListJidouSeisei }))),
  "kaigo-jikofutan": dynamic(() => import("@/components/tools/impl/KaigoJikofutan").then((m) => ({ default: m.KaigoJikofutan }))),
  "youji-mushouka-checker": dynamic(() => import("@/components/tools/impl/YoujiMushoukaChecker").then((m) => ({ default: m.YoujiMushoukaChecker }))),
  "ninshin-kenshin-schedule": dynamic(() => import("@/components/tools/impl/NinshinKenshinSchedule").then((m) => ({ default: m.NinshinKenshinSchedule }))),
  "youkaigo-nintei-dandori-navi": dynamic(() => import("@/components/tools/impl/YoukaigoNinteiDandoriNavi").then((m) => ({ default: m.YoukaigoNinteiDandoriNavi }))),
  "kaigo-shisetsu-hiyou-hayami": dynamic(() => import("@/components/tools/impl/KaigoShisetsuHiyouHayami").then((m) => ({ default: m.KaigoShisetsuHiyouHayami }))),
  "kaigo-shigoto-ryouritsu-checker": dynamic(() => import("@/components/tools/impl/KaigoShigotoRyouritsuChecker").then((m) => ({ default: m.KaigoShigotoRyouritsuChecker }))),
  "namonaki-kaji-checker": dynamic(() => import("@/components/tools/impl/NamonakiKajiChecker").then((m) => ({ default: m.NamonakiKajiChecker }))),
  "shokuhi-meyasu": dynamic(() => import("@/components/tools/impl/ShokuhiMeyasu").then((m) => ({ default: m.ShokuhiMeyasu }))),
  "yosan-haibun-keisan": dynamic(() => import("@/components/tools/impl/YosanHaibunKeisan").then((m) => ({ default: m.YosanHaibunKeisan }))),
  "shussan-junbi-checklist": dynamic(() => import("@/components/tools/impl/ShussanJunbiChecklist").then((m) => ({ default: m.ShussanJunbiChecklist }))),
  "sango-tetsuzuki-checklist": dynamic(() => import("@/components/tools/impl/SangoTetsuzukiChecklist").then((m) => ({ default: m.SangoTetsuzukiChecklist }))),
  "recipe-ninzuu-kansan": dynamic(() => import("@/components/tools/impl/RecipeNinzuuKansan").then((m) => ({ default: m.RecipeNinzuuKansan }))),
  "hoikuen-omukae-gyakusan": dynamic(() => import("@/components/tools/impl/HoikuenOmukaeGyakusan").then((m) => ({ default: m.HoikuenOmukaeGyakusan }))),
  "shou1-kabe-kinmu-simulation": dynamic(() => import("@/components/tools/impl/Shou1KabeKinmuSimulation").then((m) => ({ default: m.Shou1KabeKinmuSimulation }))),
  "renji-watt-kansan": dynamic(() => import("@/components/tools/impl/RenjiWattKansan").then((m) => ({ default: m.RenjiWattKansan }))),
  "gakudou-kabe-dandori-check": dynamic(() => import("@/components/tools/impl/GakudouKabeDandoriCheck").then((m) => ({ default: m.GakudouKabeDandoriCheck }))),
  "josei-kenshin-schedule": dynamic(() => import("@/components/tools/impl/JoseiKenshinSchedule").then((m) => ({ default: m.JoseiKenshinSchedule }))),
  "part-shift-shunyuu-keisan": dynamic(() => import("@/components/tools/impl/PartShiftShunyuuKeisan").then((m) => ({ default: m.PartShiftShunyuuKeisan }))),
  "kaigo-service-gyaku-hiki": dynamic(() => import("@/components/tools/impl/KaigoServiceGyakuHiki").then((m) => ({ default: m.KaigoServiceGyakuHiki }))),
  "josei-tekisei-taijuu-shihyou": dynamic(() => import("@/components/tools/impl/JoseiTekiseiTaijuuShihyou").then((m) => ({ default: m.JoseiTekiseiTaijuuShihyou }))),
  "ninshin-taiju-zoka-checker": dynamic(() => import("@/components/tools/impl/NinshinTaijuZokaChecker").then((m) => ({ default: m.NinshinTaijuZokaChecker }))),
  "pms-yosoku-calendar": dynamic(() => import("@/components/tools/impl/PmsYosokuCalendar").then((m) => ({ default: m.PmsYosokuCalendar }))),
  "akachan-suimin-gyakusan": dynamic(() => import("@/components/tools/impl/AkachanSuiminGyakusan").then((m) => ({ default: m.AkachanSuiminGyakusan }))),
  "child-seat-kitei": dynamic(() => import("@/components/tools/impl/ChildSeatKitei").then((m) => ({ default: m.ChildSeatKitei }))),
  "yuukyuu-fuyo-nissuu-kijun": dynamic(() => import("@/components/tools/impl/YuukyuuFuyoNissuuKijun").then((m) => ({ default: m.YuukyuuFuyoNissuuKijun }))),
  "kyouiku-kunren-kyufukin": dynamic(() => import("@/components/tools/impl/KyouikuKunrenKyufukin").then((m) => ({ default: m.KyouikuKunrenKyufukin }))),
  "iryouhi-koujo-kodomo": dynamic(() => import("@/components/tools/impl/IryouhiKoujoKodomo").then((m) => ({ default: m.IryouhiKoujoKodomo }))),
};

export function ToolRuntime({ slug }: { slug: string }) {
  const Tool = registry[slug];
  if (!Tool) return null;
  return <Tool />;
}
