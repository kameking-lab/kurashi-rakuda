import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getLiveTools, getTool } from "@/app/lib/tools/registry";
import { SourceList } from "@/components/ui/SourceList";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ChomiryoKanzan } from "@/components/tools/impl/ChomiryoKanzan";
import { AjitsukeOugonhi } from "@/components/tools/impl/AjitsukeOugonhi";
import { JidoTeate } from "@/components/tools/impl/JidoTeate";
import { JIDO_TEATE_DISCLAIMER } from "@/components/tools/impl/JidoTeate.calc";
import { Getsurei } from "@/components/tools/impl/Getsurei";
import { JintsuuKankakuCounter } from "@/components/tools/impl/JintsuuKankakuCounter";
import { ShussanYoteibi } from "@/components/tools/impl/ShussanYoteibi";
import { SeiriShuki } from "@/components/tools/impl/SeiriShuki";
import { Inunohi } from "@/components/tools/impl/Inunohi";
import { FuyoKabe } from "@/components/tools/impl/FuyoKabe";
import { Yobousesshu } from "@/components/tools/impl/Yobousesshu";
import { HokatsuSchedule } from "@/components/tools/impl/HokatsuSchedule";
import { JunyuMilkRyo } from "@/components/tools/impl/JunyuMilkRyo";
import { RinyushokuRyo } from "@/components/tools/impl/RinyushokuRyo";
import { RINYUSHOKU_DISCLAIMER, RINYUSHOKU_PREMATURE_DISCLAIMER } from "@/components/tools/impl/RinyushokuRyo.calc";
import { ShinchoYosoku } from "@/components/tools/impl/ShinchoYosoku";
import { Hoikuryo } from "@/components/tools/impl/Hoikuryo";
import { SankyuIkukyuMoney } from "@/components/tools/impl/SankyuIkukyuMoney";
import { JitanKyuyo } from "@/components/tools/impl/JitanKyuyo";
import { FukushokuTedori } from "@/components/tools/impl/FukushokuTedori";
import { FukkiBiKeisan } from "@/components/tools/impl/FukkiBiKeisan";
import { SentakuHyoji } from "@/components/tools/impl/SentakuHyoji";
import { ReitoHozon } from "@/components/tools/impl/ReitoHozon";
import { REITO_HOZON_DISCLAIMERS } from "@/components/tools/impl/ReitoHozon.calc";
import { TsukuriokiHimochiIchiran } from "@/components/tools/impl/TsukuriokiHimochiIchiran";
import {
  TSUKURIOKI_DISCLAIMERS,
  TSUKURIOKI_GRANULARITY_LIMITATION,
} from "@/components/tools/impl/TsukuriokiHimochiIchiran.calc";
import { SuihanMizu } from "@/components/tools/impl/SuihanMizu";
import { KondateTeian } from "@/components/tools/impl/KondateTeian";
import { KONDATE_DISCLAIMER, kondateData } from "@/lib/tools/impl/kondate-teian";
import { KaimonoListJidouSeisei } from "@/components/tools/impl/KaimonoListJidouSeisei";
import { KaigoJikofutan } from "@/components/tools/impl/KaigoJikofutan";
import { KaigoShisetsuHiyouHayami } from "@/components/tools/impl/KaigoShisetsuHiyouHayami";
import { kaigoShisetsuHiyouSoubaDataset } from "@/components/tools/impl/KaigoShisetsuHiyouHayami.calc";
import { YoujiMushoukaChecker } from "@/components/tools/impl/YoujiMushoukaChecker";
import { YOUJI_MUSHOUKA_DISCLAIMER } from "@/components/tools/impl/YoujiMushoukaChecker.calc";
import { NinshinKenshinSchedule } from "@/components/tools/impl/NinshinKenshinSchedule";
import { JoseiKenshinSchedule } from "@/components/tools/impl/JoseiKenshinSchedule";
import {
  COMPREHENSIVE_SCREENING_NOTE,
  UNDER_TREATMENT_EXCLUSION_NOTE,
} from "@/components/tools/impl/JoseiKenshinSchedule.calc";
import { ShussanJunbiChecklist } from "@/components/tools/impl/ShussanJunbiChecklist";
import { YoukaigoNinteiDandoriNavi } from "@/components/tools/impl/YoukaigoNinteiDandoriNavi";
import { KaigoShigotoRyouritsuChecker } from "@/components/tools/impl/KaigoShigotoRyouritsuChecker";
import {
  kaigoShigotoRyouritsuDataset,
  JIKANGAI_MONTHLY_LIMIT,
  JIKANGAI_YEARLY_LIMIT,
  KAIGO_KYUGYO_MAX_DAYS,
  KAIGO_KYUGYO_MAX_COUNT,
  KAIGO_KYUKA_DAYS_PER_YEAR,
  KAIGO_KYUKA_DAYS_PER_YEAR_MULTIPLE,
  TANSHUKU_PERIOD_YEARS,
  TANSHUKU_MIN_COUNT,
  JOHO_TEIKYO_AGE,
  KOBETSU_SHUCHI_TEXT,
  JOHO_TEIKYO_40_TEXT,
  TELEWORK_TEXT,
} from "@/components/tools/impl/KaigoShigotoRyouritsuChecker.calc";
import { GakudouKabeDandoriCheck } from "@/components/tools/impl/GakudouKabeDandoriCheck";
import {
  GRADE_RANGE_LABEL as GAKUDOU_GRADE_RANGE_LABEL,
  SUPPORT_UNIT_MAX_CHILDREN as GAKUDOU_SUPPORT_UNIT_MAX_CHILDREN,
  OPENING_HOURS_STANDARD as GAKUDOU_OPENING_HOURS_STANDARD,
  WAITING_CHILDREN_TOTAL as GAKUDOU_WAITING_CHILDREN_TOTAL,
  WAITING_CHILDREN_BY_GRADE as GAKUDOU_WAITING_CHILDREN_BY_GRADE,
  WAITING_CHILDREN_PEAK_GRADE as GAKUDOU_WAITING_CHILDREN_PEAK_GRADE,
  WAITING_CHILDREN_OCT_PROVISIONAL as GAKUDOU_WAITING_CHILDREN_OCT_PROVISIONAL,
  gakudouHoikuDataset,
} from "@/components/tools/impl/GakudouKabeDandoriCheck.calc";
import { SangoTetsuzukiChecklist } from "@/components/tools/impl/SangoTetsuzukiChecklist";
import { ShokuhiMeyasu } from "@/components/tools/impl/ShokuhiMeyasu";
import { YosanHaibunKeisan } from "@/components/tools/impl/YosanHaibunKeisan";
import { RecipeNinzuuKansan } from "@/components/tools/impl/RecipeNinzuuKansan";
import { HoikuenOmukaeGyakusan } from "@/components/tools/impl/HoikuenOmukaeGyakusan";
import { HOIKUEN_OMUKAE_DISCLAIMER } from "@/components/tools/impl/HoikuenOmukaeGyakusan.calc";
import { Shou1KabeKinmuSimulation } from "@/components/tools/impl/Shou1KabeKinmuSimulation";
import {
  gakudouHoikuDataset as shou1KabeGakudouHoikuDataset,
  GRADE_RANGE_LABEL,
  SHOU1_KABE_DISCLAIMER,
  SUPPORT_UNIT_MAX_CHILDREN,
  WAITING_CHILDREN_TOTAL,
} from "@/components/tools/impl/Shou1KabeKinmuSimulation.calc";
import { RenjiWattKansan } from "@/components/tools/impl/RenjiWattKansan";
import { RENJI_KANZAN_SOURCE } from "@/components/tools/impl/RenjiWattKansan.calc";
import { NamonakiKajiChecker } from "@/components/tools/impl/NamonakiKajiChecker";
import { REFERENCE_STAT as NAMONAKI_KAJI_REFERENCE_STAT } from "@/components/tools/impl/NamonakiKajiChecker.calc";
import { PartShiftShunyuuKeisan } from "@/components/tools/impl/PartShiftShunyuuKeisan";
import { partShiftKabeDataset } from "@/components/tools/impl/PartShiftShunyuuKeisan.calc";
import { KaigoServiceGyakuHiki } from "@/components/tools/impl/KaigoServiceGyakuHiki";
import { kaigoHokenDataset as kaigoServiceGyakuHikiDataset } from "@/components/tools/impl/KaigoServiceGyakuHiki.calc";
import { JoseiTekiseiTaijuuShihyou } from "@/components/tools/impl/JoseiTekiseiTaijuuShihyou";
import { TEKISEI_TAIJUU_DISCLAIMER } from "@/components/tools/impl/JoseiTekiseiTaijuuShihyou.calc";
import { NinshinTaijuZokaChecker } from "@/components/tools/impl/NinshinTaijuZokaChecker";
import {
  GAIN_GUIDANCE_FOOTNOTE as NINSHIN_TAIJU_GAIN_GUIDANCE_FOOTNOTE,
  PREGNANCY_GAIN_CAUTION as NINSHIN_TAIJU_PREGNANCY_GAIN_CAUTION,
  APPLICABILITY_NOTE as NINSHIN_TAIJU_APPLICABILITY_NOTE,
} from "@/components/tools/impl/NinshinTaijuZokaChecker.calc";
import { PmsYosokuCalendar } from "@/components/tools/impl/PmsYosokuCalendar";
import {
  PMS_DEFINITION_TEXT,
  PMS_PREVALENCE_FROM_PERCENT,
  PMS_PREVALENCE_TO_PERCENT,
  PMS_DISCLAIMER,
} from "@/components/tools/impl/PmsYosokuCalendar.calc";
import { AkachanSuiminGyakusan } from "@/components/tools/impl/AkachanSuiminGyakusan";
import { AKACHAN_SUIMIN_DISCLAIMER } from "@/components/tools/impl/AkachanSuiminGyakusan.calc";
import { SeidoNotice } from "@/components/tools/SeidoNotice";

import { fuyoKabeDataset } from "@/lib/tools/impl/fuyo-kabe";
import { municipalities, toSeidoDataset } from "@/lib/tools/impl/hoikuryo";
import { juuminzeiDataset } from "@/lib/tools/impl/hoikuryo-shotokuwari";
import { kyoukaikenpoDataset, koyouHokenDataset } from "@/lib/tools/impl/shakai-hoken";
import { ikukyuKyufuDataset, salaryAtWageDailyMax } from "@/lib/tools/impl/sankyu-ikukyu-money";
import {
  ikukyuEnchoDataset,
  POSTNATAL_LEAVE_DAYS as FUKKIBI_POSTNATAL_LEAVE_DAYS,
  RATE_SWITCH_DAYS as FUKKIBI_RATE_SWITCH_DAYS,
  RATE_FIRST as FUKKIBI_RATE_FIRST,
  RATE_AFTER as FUKKIBI_RATE_AFTER,
  LEAVE_EXTENSION_1_MONTHS,
  LEAVE_EXTENSION_2_MONTHS,
} from "@/components/tools/impl/FukkiBiKeisan.calc";
import {
  SUPPORT_LIMIT as JITAN_SUPPORT_LIMIT,
  MINIMUM_AMOUNT as JITAN_MINIMUM_AMOUNT,
  EXAMPLE_CAP as JITAN_EXAMPLE_CAP,
  benefitRule1 as jitanBenefitRule1,
} from "@/lib/tools/impl/jitan-kyuyo";
import { kaigoHokenDataset } from "@/lib/tools/impl/kaigo-jikofutan";
import { kaigoNinteiDataset } from "@/components/tools/impl/YoukaigoNinteiDandoriNavi.calc";
import {
  shusshoTodokeDataset,
  jidoTeateDataset as sangoJidoTeateDataset,
  ikukyuKyufuDataset as sangoIkukyuKyufuDataset,
  SHUSSHO_DOMESTIC_DAYS,
  SHUSSHO_ABROAD_MONTHS,
  JIDO_TEATE_EXCEPTION_DAYS,
  ICHIJIKIN_CLAIM_YEARS,
} from "@/components/tools/impl/SangoTetsuzukiChecklist.calc";
import { todayJst } from "@/lib/tools/seido";

/**
 * ツール実装のマッピング。G2（Q3-01〜20）で実装が増えるたびにここへ1行追加し、
 * registry.json の status を "live" に変える。
 */
/** 献立自動提案の件数は data/kondate から数える（数値を文章に直書きしない） */
const kondateCounts = {
  main: kondateData.recipes.filter((r) => r.course === "main").length,
  side: kondateData.recipes.filter((r) => r.course === "side").length,
  soup: kondateData.recipes.filter((r) => r.course === "soup").length,
};
const kondateRecipeCount = kondateData.recipes.length;

/**
 * ★8/1改定に追随させるための導出値★ 育休給付・時短給付の金額は毎年8月1日に改定される。
 * 散文に金額を直書きせず、data/seido 由来の値から組み立てる（tests のハードコード禁止検査の対象）。
 */
const yen = (n: number) => n.toLocaleString("ja-JP");
/** 賃金日額が上限に到達する月給（万円・概数）。「月給が約◯万円を超えると頭打ち」の表示用 */
const sankyuCapSalaryMan = Math.round(salaryAtWageDailyMax() / 10_000);
/** 時短給付の頭打ち例: データの構造化ノード exampleCap から導出 */
const jitanEx = JITAN_EXAMPLE_CAP;
const jitanExNinety = Math.floor(jitanEx.wageAtStart * 0.9);
const jitanExRule1 = jitanBenefitRule1(jitanEx.wageInMonth);

const implementations: Record<string, { ui: ReactNode; formula: ReactNode }> = {
  "chomiryo-kanzan": {
    ui: <ChomiryoKanzan />,
    formula: (
      <>
        <p>大さじ1杯は15ml、小さじ1杯は5mlです（計量スプーンの規格）。</p>
        <p>
          グラムへの換算は「その調味料の大さじ1杯あたりのグラム数（例:
          しょうゆ18g、砂糖9g）」を使い、ml × (大さじ1のg ÷ 15)
          で計算しています。調味料ごとに比重が違うため、同じ大さじ1でもグラムは変わります。
        </p>
        <p>
          値は一般的な調理用計量表に基づく参考値です。製品や計り方（すりきり）で多少前後します。
        </p>
      </>
    ),
  },
  "ajitsuke-ougonhi": {
    ui: <AjitsukeOugonhi />,
    formula: (
      <>
        <p>
          料理ごとに定められた調味料の配合比率（例: 煮物はだし:しょうゆ:みりん=8:1:1）をもとに、基準となる調味料の量（だし・しょうゆなど）に応じて他の調味料の量を計算しています。基準量は「人数 ×
          1人あたりの目安量」で自動計算するか、直接ml指定で上書きできます。単位は大さじ1杯=15ml・小さじ1杯=5mlで換算しています。
        </p>
        <p>
          <strong>万能だれ（照り焼き用）・煮魚・煮物・めんつゆ・万能合わせだれ</strong>
          の5品目は、農林水産省「伝統調味料は『黄金比』で手間いらず」（Let&apos;s！和ごはんプロジェクト）に掲載された比率をそのまま使用しています。
        </p>
        <p>
          <strong>すき焼きの割り下・天つゆ・酢の物（三杯酢）</strong>
          の3品目は、同記事に比率の記載がなく、許可している官公庁ドメイン内にも比率を裏付ける一次情報が見つからなかったため、複数の一般的なレシピで比較的よく紹介される比率を「一般的な目安（出典なし）」として採用しています。画面には常に注意書きを表示し、公的機関の見解であるかのような断定表示はしていません。
        </p>
        <p>
          味付けの好みには個人差・地域差・家庭差があります。ここに示す分量はあくまで目安とし、実際に作るときは味を見ながら調整してください。
        </p>
      </>
    ),
  },
  "jido-teate": {
    ui: <JidoTeate />,
    formula: (
      <>
        <p>
          支給対象は0歳から、18歳に達する日以後の最初の3月31日まで（いわゆる「高校生年代まで」。実際に高校に在学しているかは問いません）です。2024年10月の制度拡充により所得制限は撤廃されているため、世帯所得による判定は行いません。
        </p>
        <p>
          月額は年齢区分と「第何子か」で決まります。0〜2歳は第1子・第2子が月15,000円、第3子以降は月30,000円。3歳〜高校生年代は第1子・第2子が月10,000円、第3子以降は月30,000円です（いずれも
          こども家庭庁「児童手当制度のご案内」に基づく2026年度時点の値）。
        </p>
        <p>
          「第3子以降」を数える範囲は、実際に手当を受け取れる範囲（18歳年度末まで）より広く設定されています。年齢が上の子から順に数えるとき、22歳に達する日以後の最初の3月31日までの兄姉を数に含めます。つまり大学生年代の兄姉自身は手当を受け取りませんが、下の子を「第3子」に押し上げる効果を持ちます。ただし18歳年度末を超えた兄姉（19〜22歳年度末）を数に含めるには、親などがその子を経済的に養っている（監護相当・生計費の負担をしている）ことが要件になるため、本ツールでは該当する年齢の子についてのみ、その確認を追加で行います。
        </p>
        <p>
          世帯合計月額は各子の月額の合計、年額は月額×12、1回あたりの支給額は月額×2です。支給は偶数月（2・4・6・8・10・12月）の年6回で、各支給月にそれぞれ前月分までの2か月分をまとめて支給します。
        </p>
        <p>
          {JIDO_TEATE_DISCLAIMER}
        </p>
      </>
    ),
  },
  getsurei: {
    ui: <Getsurei />,
    formula: (
      <>
        <p>
          生後日数は「基準日−生年月日」の単純な暦日差、生後週数はそれを7で割った商とあまりです。
        </p>
        <p>
          月齢（◯か月）は「生まれた日と同じ日（応当日）を迎えるたびに1か月」と数える暦月ベースの方式です。応当日が存在しない月（例:
          1/31生まれの2月）はその月の末日を応当日とみなします（月末クランプ）。うるう年の2/29生まれは、非うるう年では2/28を応当日として扱います。
        </p>
        <p>
          出産予定日を入力すると、生年月日の代わりに出産予定日を起点にして同じ数え方を適用した「修正月齢」を計算します。基準日が予定日にまだ達していない場合は「予定日まであと◯日」と表示します。修正月齢は早産で生まれたお子さまの発達を考える際の目安の一つで、実際の発達評価は乳幼児健診等で医療者にご確認ください。
        </p>
        <p>
          この計算はグレゴリオ暦の一般的な暦法規則（うるう年判定・大の月/小の月）のみに基づき、制度改定の概念はありません。
        </p>
      </>
    ),
  },
  "jintsuu-kankaku-counter": {
    ui: <JintsuuKankakuCounter />,
    formula: (
      <>
        <p>
          「持続時間」は1回の陣痛の「開始〜終了」の経過時間、「間隔」は「前回の陣痛の開始〜今回の陣痛の開始」までの経過時間です。どちらも記録した時刻（エポックミリ秒）の単純な差分を秒単位に丸めて計算します。時計のズレ等で差分がマイナスになった場合は不正な値として「—」表示にとどめ、平均計算からも除外します。
        </p>
        <p>
          「平均間隔」「平均持続時間」は、直近5回分の有効な値だけを対象にした単純平均です。日をまたぐ記録でも、時刻はすべて絶対時刻（エポックミリ秒）で保持しているため、日付境界の特別な処理は行わずそのまま正しく計算されます。
        </p>
        <p>
          記録はすべてこの端末のlocalStorageに保存され、サーバーへの送信は一切行いません。タブの再読み込みやアプリの再起動をしても記録は消えず、オフライン環境でも問題なく記録・計算できます。
        </p>
        <p>
          一般的な連絡目安（初産婦は10分間隔、経産婦は10〜15分間隔、破水時は間隔を問わずすぐ連絡）は国立成育医療研究センター産科の案内による一施設の運用例であり、本ツールはこれを踏まえた記録・計算のみを行います。医学的な判断や診断は行わないため、実際の連絡タイミングは必ずご自身の受診先の指示に従ってください。
        </p>
      </>
    ),
  },
  "shussan-yoteibi": {
    ui: <ShussanYoteibi />,
    formula: (
      <>
        <p>
          出産予定日は「最終月経開始日 + 280日（40週0日）」で算出します（ネーゲレ概算法）。平均月経周期が28日と異なる場合は、その差分日数（周期日数−28日）を加減して補正します。
        </p>
        <p>
          妊娠週数は「基準日（今日）− 最終月経開始日」の経過日数を7で割った商を週、余りを日として表示します（例: 経過90日 → 12週6日）。妊娠月数は「1ヶ月＝4週」の慣用区分（1〜10ヶ月、40週以降は月数表示なし）、妊娠期は日本産科婦人科学会の用語定義（初期＝〜13週6日／中期＝14週0日〜27週6日／後期＝28週0日〜）に基づきます。
        </p>
        <p>
          このツールが行うのは最終月経開始日を起点とした日付の加減算のみです。超音波検査や医師の診察に基づく妊娠週数の確定・修正、出産の可否や健康状態に関する判断は一切行いません。実際の週数・予定日は必ず担当医にご確認ください。
        </p>
      </>
    ),
  },
  "seiri-shuki": {
    ui: <SeiriShuki />,
    formula: (
      <>
        <p>
          次回の月経開始予定日は「最終月経開始日 ＋ 平均月経周期日数」で計算します。暦日数をそのまま加算するため、月末・年またぎ・うるう年もそのまま自動的に処理されます。
        </p>
        <p>
          排卵予測日は、黄体期（排卵から次回月経開始までの期間）が個人差の小さい約14日でほぼ一定であるという一般的な知見に基づき、「次回の月経開始予定日 − 14日」で逆算する簡易予測です。妊娠しやすい期間の目安は、精子の生存期間（3〜5日程度）と排卵後の卵子の生存期間（約24時間）を考慮し、排卵予測日の5日前〜1日後としています。
        </p>
        <p>
          このツールが行うのは入力された周期日数に基づく単純な日付演算のみで、実際の排卵・妊娠の有無を検査・診断するものではありません。黄体期の長さには個人差（一般に10〜16日程度）があり、周期が不規則な場合はこの予測のずれが大きくなります。基礎体温の記録や排卵日検査薬の利用、婦人科への相談で確認することをおすすめします。避妊の目的でこの予測のみに頼ることはお控えください。
        </p>
      </>
    ),
  },
  inunohi: {
    ui: <Inunohi />,
    formula: (
      <>
        <p>
          十二支は暦日に対して連続的に循環割り当てられる伝統的な体系で、「戌の日」は12日に1度巡ってきます（干支＝十干十二支は60日周期ですが、十二支のみを見ると12日周期になります）。実在が確認できる戌の日（2026年1月12日）を基準点にして、そこから対象の日までの日数差を12で割った余りが0のとき「戌の日」と判定しています。
        </p>
        <p>
          妊娠5ヶ月に入る日は、最終月経開始日（出産予定日から入力した場合は出産予定日−280日で逆算）に112日（16週0日）を足して求めます。その日以降で最初に巡ってくる戌の日を「妊娠5ヶ月最初の戌の日」として表示し、そこから12日おきの戌の日もあわせて一覧にしています。
        </p>
        <p>
          年をまたぐ場合やうるう年の2月をまたぐ場合も、日付は暦日数の実加算で計算しているため追加の補正は不要です。
        </p>
      </>
    ),
  },
  "fuyo-kabe": {
    ui: <FuyoKabe />,
    formula: (
      <>
        <p>
          <strong>所得税（自分にかかる分）</strong>
          ：給与収入から給与所得控除を引いて「給与所得」を出し、そこから基礎控除を引いた残りに課税されます。
          2026年（令和8年）分は、給与所得控除の最低保障額が74万円、基礎控除が最大104万円のため、
          年収178万円までは課税所得が0円になります。これが「課税最低限178万円」です。
        </p>
        <p>
          <strong>扶養控除・配偶者控除（扶養する人にかかる分）</strong>
          ：あなたの合計所得金額が62万円以下（給与収入だけなら136万円以下）であることが要件です。
          これを超えると、配偶者なら配偶者特別控除、19歳以上23歳未満で親の扶養なら特定親族特別控除に切り替わり、
          控除額は段階的に減っていきます。急に手取りが逆転する「崖」にはなりません。
        </p>
        <p>
          <strong>社会保険（106万円の壁）</strong>
          ：法令上は「年収106万円」という基準はなく、週の所定労働時間20時間以上・所定内賃金の月額8.8万円以上・
          2か月超の雇用見込み・学生でない・勤務先の被保険者数51人以上、のすべてを満たすかで判定します。
          月額賃金には賞与・残業代・通勤手当・精皆勤手当・家族手当を含めません。
          この賃金要件（月8.8万円）は2026年10月に撤廃される予定です。
        </p>
        <p>
          <strong>扶養から外れる年収（130万円の壁）</strong>
          ：健康保険の被扶養者でいられるのは年間収入130万円「未満」までです（19歳以上23歳未満は150万円未満、
          60歳以上・障害のある方は180万円未満）。同居している場合は、扶養する方の年収の2分の1未満であることも必要です。
          税が1〜12月の確定額で判断するのに対し、社会保険は「これから1年間の見込み額」で判断する点が違います。
        </p>
        <p>
          <strong>手取りの概算について</strong>
          ：厚生年金9.15%・健康保険4.95%（全国平均）・子ども・子育て支援金0.115%・雇用保険0.5%を
          年収に乗じた概算です。実際は標準報酬月額をもとに計算され、健康保険料率は都道府県ごとに異なります。
        </p>
        <SeidoNotice datasets={[fuyoKabeDataset]} today={todayJst()} />
      </>
    ),
  },
  yobousesshu: {
    ui: <Yobousesshu />,
    formula: (
      <>
        <p>
          生年月日から、予防接種法に基づく定期接種（A類疾病）の各ワクチンについて「生後◯ヶ月／◯歳に達した日（誕生日相当日）」を基準に、対象開始日・対象終了日を計算し、今日の日付と比較して「対象期間前」「対象期間内」「対象期間の標準的な対象期間を過ぎています」のいずれかを判定しています。多くのワクチンは対象年齢の下限に達した日から対象期間内、上限の年齢に達した日以後は対象期間を終えたものとして表示します。
        </p>
        <p>
          麻しん風しん混合（MR）第2期は「小学校就学前1年間（年長にあたる年度）」が対象のため、年齢ではなく4月1日を基準にした年度（学齢）で判定しています。HPVは「11歳に達した日」から「16歳に達する日以後の最初の3月31日」までを対象期間として扱っています。
        </p>
        <p>
          各回の目安接種時期は、標準的な接種間隔（例: B型肝炎は1回目から約1ヶ月後に2回目）をもとに機械計算した参考値で、「年月頃」という幅を持たせた表示にしています。実際の接種間隔は使用するワクチンの種類・体調・自治体運用により前後します。
        </p>
        <p>
          <strong>
            本ツールが行うのは、これらの制度上の標準スケジュールの日付計算のみです。お子さまが実際に接種を受けるべきかどうか、当日の体調で接種できるかどうかといった医学的な判断は一切行っていません。
          </strong>
          過去に実際に接種したワクチンの記録・管理も行いません（すべてのワクチンについて、生年月日から見た制度上の標準スケジュール上の位置を一律に計算して表示するのみです）。実際のスケジュールは母子健康手帳・予診票・かかりつけ医・お住まいの自治体の案内を優先してください。
        </p>
      </>
    ),
  },
  "hokatsu-schedule": {
    ui: <HokatsuSchedule />,
    formula: (
      <>
        <p>
          「入園希望年月（E）」を起点に、月単位のオフセットで各マイルストーンの目安日を逆算しています。例えば4月一斉入園モデルでは、情報収集開始はE−12ヶ月、保育園見学はE−10ヶ月〜E−7ヶ月、一次選考結果通知はE−3ヶ月を上限としてE−6ヶ月（一次締切）＋2ヶ月、というように、入園希望月から遡って各段取りの時期を計算します。
        </p>
        <p>
          一次申込み締切は自治体ごとに大きく異なるため、お住まいの自治体の公表締切日を入力した場合はその日付を「正」として採用し、以降の申込書類準備・一次選考結果通知の時期をその締切基準で再計算します。未入力の場合は、人口規模の大きい自治体が例年公表しているスケジュール傾向（一次申込み＝10月下旬相当、一次結果通知＝12月下旬相当など）から作成した全国目安値を使用します。
        </p>
        <p>
          実行日（今日）より前の時期になったマイルストーンは削除せず「既に目安時期を過ぎています」というラベルを付けて表示し続けます。間に合わなかった項目を可視化するためです。また、入園希望月までの残り期間が3ヶ月未満の場合は、標準的な申込み時期を過ぎている可能性が高いため、自治体の保育課へ直接確認するよう促す警告を表示します。
        </p>
        <p>
          法定の全国統一スケジュールは存在しません（児童福祉法上、保育の実施主体は市区町村であり、申込み手続きは自治体ごとに個別に定められています）。本ツールが示す日付はすべて全国の傾向から作成した目安であり、入園の可否・選考結果の判定は行いません。締切日・必要書類・選考基準は必ずお住まいの市区町村の保育担当窓口・公式サイトでご確認ください。
        </p>
      </>
    ),
  },
  "junyu-milk-ryo": {
    ui: <JunyuMilkRyo />,
    formula: (
      <>
        <p>
          生後0〜1か月（新生児期）は体重に基づく計算式を使います。「体重(kg) ×
          150ml」を1日量の目安とし、1日8回程度に分けるので「1日量 ÷ 8」が1回量の目安です。実際は体重1kgあたり120〜160ml/日で紹介されることが多いため、その幅（体重×120〜体重×160）もあわせて表示します。
        </p>
        <p>
          生後1〜11か月は、月齢帯ごとの参照表（1回量目安レンジ・回数目安）から値を取得します。1日量目安レンジは「1回量の下限×回数の下限」〜「1回量の上限×回数の上限」の概算です。生後6か月以降は離乳食が進むにつれてミルク・母乳の量の個人差がさらに大きくなるため、1日の合計量は算出せず、1回量目安と回数目安のみを表示します。
        </p>
        <p>
          栄養方法が「母乳のみ」の場合は、ml換算の目標値をあえて表示しません。母乳は哺乳量を目分量で正確に測定できないためです。代わりに「欲しがるサインに応じて授乳（1日8回程度が目安）」という考え方と回数目安を表示します。「混合」の場合は算出したml目安を「ミルクを足す場合の合計目安」として表示し、母乳を飲んだ分はその中から差し引いて調整する、という考え方を注記します。
        </p>
        <p>
          生後12か月以降は離乳食が中心になる時期のため、本ツールの対象外として案内のみ表示します（離乳食の量・固さ早見 #19 をご案内）。
        </p>
        <p>
          <strong>個人差についての注意</strong>
          ：ここに示す数値はあくまで一般的な目安です。赤ちゃんの体格・体質・活動量・気候などにより必要な量は大きく異なります。断定的な指示ではなく、赤ちゃんの機嫌・体重の増え方・おしっこやうんちの様子を見ながら調整する目安としてご利用ください。低出生体重児や医療的なフォローが必要なお子さま、体重の増え方が気になる場合は、数値によらず医師・助産師・保健師の指示を優先してください。
        </p>
      </>
    ),
  },
  "rinyushoku-ryo": {
    ui: <RinyushokuRyo />,
    formula: (
      <>
        <p>
          月齢（生後◯ヶ月）は、生年月日から暦月で切り捨てて数えます（例:
          生後6ヶ月20日でも「6ヶ月」のまま。7ヶ月になった時点で次の段階に切り替わります）。この月齢を、厚生労働省「授乳・離乳の支援ガイド（2019年改定版）」が示す5つの区分（生後5〜6ヶ月＝離乳初期／7〜8ヶ月＝離乳中期／9〜11ヶ月＝離乳後期／12〜18ヶ月＝離乳完了期）のいずれに当てはまるか判定し、該当区分の食事回数・食品群別の1回あたりの目安量・固さの目安を絞り込んで表示しています。5ヶ月未満は開始前、19ヶ月以降は本ツールのデータ範囲外（幼児食への移行期）として、量・固さの表は表示しません。
        </p>
        <p>
          出産予定日を入力した場合は、生年月日との差（在胎40週の時点との差）を早産週数とみなし、約4.345週を1ヶ月として月数に換算したうえで実齢から差し引いた「修正月齢」でも同じ区分判定を行い、実齢とあわせて表示します。修正月齢はあくまで参考値です。
        </p>
        <p>
          表示している食品群別の目安量は「魚・肉・豆腐・卵・乳製品のいずれか1種類程度を組み合わせる」考え方の量であり、すべてを毎食同時に与える量ではありません。
        </p>
        <p>{RINYUSHOKU_DISCLAIMER}</p>
        <p>{RINYUSHOKU_PREMATURE_DISCLAIMER}</p>
      </>
    ),
  },
  "shincho-yosoku": {
    ui: <ShinchoYosoku />,
    formula: (
      <>
        <p>
          両親身長法（Mid-Parental Height法の通称）と呼ばれる簡易式を使います。男児は「（父親の身長＋母親の身長＋13）÷
          2」、女児は「（父親の身長＋母親の身長−13）÷ 2」で計算します（結果は四捨五入せず小数第1位まで表示）。
        </p>
        <p>
          この式は法令・公的制度に基づく制度データではなく、小児科領域で用いられる統計的な経験式です。日本人小児の目標身長（Target
          Height）とターゲットレンジを再検討した文献（Ogata T, Tanaka T, Kagami M.
          &quot;Target Height and Target Range for Japanese Children:
          Revisited.&quot; Clinical Pediatric Endocrinology 2007;16(4):85-87）では、同じ式とあわせて、目安の幅（ターゲットレンジ）が男児は±9cm、女児は±8cmと示されています。本ツールの参考レンジはこの幅に基づきます。ただし「必ずこの範囲に収まる」という保証ではありません。
        </p>
        <p>
          この結果はあくまで統計的な目安であり、実際の成人身長は栄養・生活習慣・個人差などにより大きく変わります。医学的な低身長・成長障害の診断や判定は一切行いません。成長について心配な場合は、乳幼児健診や小児科医にご相談ください。
        </p>
      </>
    ),
  },
  hoikuryo: {
    ui: <Hoikuryo />,
    formula: (
      <>
        <p>
          <strong>保育料は自治体ごとに違います。</strong>
          認可保育所の保育料（利用者負担額）は、お住まいの市区町村が独自の階層表で決めています。
          全国共通の計算式はありません。このツールは、各自治体が公表している金額表そのものを収録し、
          あなたが選んだ条件に当たる行を引いて表示しています。数値の推測はしていません。
        </p>
        <p>
          <strong>金額が決まる順番</strong>
          ：①その月に全世帯無償化が始まっていないか →
          ②3歳以上児クラスか（幼児教育・保育の無償化により、対応12自治体すべてで0円）→
          ③世帯の課税状況（生活保護／住民税非課税／均等割のみ課税／所得割が課税）で階層を決める →
          ④所得割が課税されている世帯だけ、市町村民税所得割額で階層を細かく分ける →
          ⑤その階層の「年齢区分 × 保育必要量」の金額を読む、の順です。
        </p>
        <p>
          <strong>課税状況を所得割額より先に聞く理由</strong>
          ：生活保護世帯・住民税非課税世帯・均等割のみ課税世帯は、いずれも
          <strong>市町村民税所得割額が0円</strong>
          です。つまり所得割額だけでは3つを見分けられません。しかも、この3つは金額が違います。
          横浜市では非課税世帯が0円、均等割のみ課税世帯は6,700円（0〜2歳児クラス・保育標準時間）です。
          札幌市はさらに独自で、均等割のみ課税の世帯はB階層ではなくC1階層（11,000円）に当たると
          パンフレットに明記されています。このツールは金額ではなく、あなたが選んだ課税状況で階層を決めています。
        </p>
        <p>
          <strong>所得割額は課税明細書の数字そのままではありません</strong>
          ：階層を引くのに使う所得割額は、自治体ごとに前処理が違います。大阪市は「税額控除前所得割額 ×
          6／8」、名古屋市は「税源移譲前の税率で算定した額」、横浜市は「調整控除額と所得割の調整措置の額だけを引いた額」、
          川崎市は3つの控除を引いたうえで6／8を掛け、しかも定額減税だけは適用後の額を使います。
          住宅ローン控除やふるさと納税（寄附金税額控除）は、多くの自治体で「無かったもの」として扱われます。
          このツールは換算を代行しません。換算の端数処理が公表されておらず、数円の違いで階層が変わるためです。
          上級者モードでは、その自治体の前処理の説明を入力欄と同じ画面に表示しています。
        </p>
        <p>
          <strong>4〜8月分と9月以降で使う年度が違います</strong>
          ：多くの自治体で、4〜8月分は前年度の課税額、9月〜翌3月分はその年度の課税額を使います。
          9月に保育料が変わるのはこのためです。区切りの表記は自治体により異なるため、
          このツールは各自治体の原文をそのまま表示しています。
        </p>
        <p>
          <strong>年収から所得割額を推計するときの社会保険料</strong>
          ：源泉徴収票の「社会保険料等の金額」を入力しない場合は、協会けんぽの保険料額表から概算します。
          年収を12で割った額を報酬月額とみなして標準報酬月額の等級表に当てはめ、
          お住まいの都道府県の健康保険料率と厚生年金保険料率（18.3%）をかけて、労使折半した額です。
          保育料の階層は令和8年度の課税額＝令和7年分の所得で決まるため、料率も令和7年度のものを使っています
          （令和8年4月に始まった子ども・子育て支援金は令和7年分には含まれません）。
          勤務先が健康保険組合の場合は料率が異なります。実額を入力すると精度が上がります。
        </p>
        <p>
          <strong>自動計算していないもの</strong>
          ：第2子以降の軽減、ひとり親世帯・在宅障害者等の軽減の金額は計算していません。
          きょうだいの数え方（年齢の上限があるか、就学前の子だけを数えるか）も、減額の方式
          （半額なのか、専用の金額列があるのか、0円なのか）も自治体ごとに違い、名古屋市のように
          階層によって数え方が切り替わる自治体もあるためです。該当する制度の原文をお見せしています。
          給食費・延長保育料・教材費・私立園の上乗せ徴収も含みません。
        </p>
        <p>
          <strong>対応していない自治体について</strong>
          ：現在の対応は{municipalities.length}自治体です。それ以外の自治体では金額を表示せず、
          お手元の課税明細書からご自身で階層表を読むための手順をご案内しています。
          推測した金額や「一般的な相場」はお見せしません。
        </p>
        {/* 8a（年収→所得割額の推計）が根拠にしているデータも併せて出す。
            推計は既定モードであり、住民税・給与所得控除・協会けんぽ・雇用保険の各データに依存する。 */}
        <SeidoNotice
          datasets={[
            ...municipalities.map(toSeidoDataset),
            juuminzeiDataset,
            kyoukaikenpoDataset,
            koyouHokenDataset,
          ]}
          today={todayJst()}
        />
      </>
    ),
  },
  "sankyu-ikukyu-money": {
    ui: <SankyuIkukyuMoney />,
    formula: (
      <>
        <p>
          <strong>出産手当金</strong>
          ：健康保険の被保険者ご本人が、出産のために仕事を休んで給与を受けられなかった期間に支給されます。
          支給開始日以前の直近12か月の標準報酬月額を平均し、それを30で割った「標準報酬日額」の
          3分の2が支給日額です。法令が「3分の2」と定めているため、小数に丸めた近似の率ではなく
          2÷3の分数で計算しています。端数の扱いも健康保険法第99条第2項のとおり、標準報酬日額は
          5円未満を切り捨て・5円以上10円未満を10円に切り上げ、3分の2にした後の額は50銭未満を切り捨て・
          50銭以上1円未満を1円に切り上げています。国民健康保険の方、ご家族の被扶養者の方は対象外です。
        </p>
        <p>
          <strong>産前・産後の期間の数え方</strong>
          ：産前は「出産の日（出産の日が出産の予定日より後であるときは、出産の予定日）以前42日」、
          多胎の場合は98日です。産後は出産の日の翌日から56日で、多胎でも変わりません。
          ここが誤解の多いところですが、<strong>出産が予定日より遅れた場合、遅れた日数も産前の支給対象に含まれます</strong>。
          起算点が予定日のままになるためです。逆に出産が早まった場合、産前の期間は短くなります。
        </p>
        <p>
          <strong>出産育児一時金</strong>
          ：産科医療補償制度に加入している医療機関での在胎週数22週以降の出産は1児につき50万円、
          それ以外は48.8万円です。多胎の場合はお子さんの人数ぶん支給されます。妊娠85日（4か月）以降であれば、
          死産・流産・人工妊娠中絶も対象です。なお「50万円＝48.8万円＋1.2万円」の1.2万円は法令が直接定めた額ではありません。
          健康保険法施行令第36条は加算を「3万円を超えない範囲内で保険者が定める金額」と規定しており、
          実際に1.2万円なのは産科医療補償制度の掛金が1万2千円だからです。
        </p>
        <p>
          <strong>育児休業給付金</strong>
          ：休業開始時賃金日額（直近6か月に支払われた賃金の総額 ÷ 180。賞与・臨時の賃金は含みません）に、
          支給日数と給付率を掛けて計算します。給付率は通算180日目までが67%、181日目以降が50%です。
          賃金日額には上限額と下限額があり、これらは
          <strong>毎年8月1日に改定されます</strong>。
          <strong>お母さんの賃金日額は「産前休業開始日の前6か月」で計算します</strong>
          。育休が始まる前は産休中で賃金がないため、「育休開始前6か月」で数えると賃金のない月が入り、
          給付額を大きく見誤ることになるからです。
        </p>
        <p>
          <strong>支給単位期間は暦月ではありません</strong>
          ：育児休業を開始した日から起算した1か月ごとの期間（休業開始日の応当日から、翌月の応当日の前日まで）です。
          1月15日に育休を始めたなら、最初の支給単位期間は1月15日から2月14日までになります。
          この期間中に就業して賃金が支払われると、賃金が「賃金日額×支給日数」の13%（181日目以降は30%）を超えた時点から
          給付が減り始め、80%以上になると支給されません。
        </p>
        <p>
          <strong>出生後休業支援給付金（2025年4月創設）</strong>
          ：育児休業給付金に13%を上乗せする、別の給付です。ご本人の出生後休業が通算14日以上あり、
          かつ配偶者もお子さんの出生日から8週間を経過する日の翌日までに通算14日以上休業していることが要件ですが、
          <strong>配偶者要件には7つの例外</strong>
          （配偶者がいない／お子さんと法律上の親子関係がない／配偶者から暴力を受け別居中／配偶者が無業者／
          配偶者が自営業者やフリーランスなど雇用される労働者でない／配偶者が産後休業中／その他の理由で育休を取得できない）があり、
          いずれかに当てはまれば配偶者が育休を取らなくても対象になります。判定はお子さんの出生日の翌日時点で行います。
          お母さんの場合は、ご自身の産後休業がご本人の14日以上の要件を満たす形になります。
          この給付は育児休業給付金が減額されても減額されませんが、賃金が80%以上で育児休業給付金が支給されない場合は、
          連動して支給されません。
        </p>
        <p>
          <strong>「手取り10割」と言われるしくみ</strong>
          ：67%の育児休業給付金と13%の出生後休業支援給付金を足すと80%になり、社会保険料が免除され、
          給与の支払いがなければ雇用保険料の負担もなく、給付そのものが非課税であるため、
          手取りでみると10割に近くなる、という説明です。ただし
          <strong>これは最大28日間だけの話で、育児休業給付金の給付率が80%に引き上げられたわけではありません</strong>。
          29日目以降は67%に戻ります。また賃金日額には上限額があるため、月給がおよそ{sankyuCapSalaryMan}万円を超える方は
          給付が頭打ちになり、手取り10割には届きません。厚生労働省自身も「相当」と留保している概算です。
          なお給付が非課税であることは、翌年の住民税や保育料の算定基礎に入らないという副次的な効果もあります。
        </p>
        <p>
          <strong>社会保険料の免除</strong>
          ：産前産後休業は、休業を開始した日の属する月から、休業が終了する日の翌日が属する月の前月まで免除されます
          （産休に14日ルールはありません）。育児休業は、開始月と終了日の翌日が属する月が異なる場合に開始月から
          終了日の翌日が属する月の前月まで（実質的に「その月の末日時点で育休中」であればその月が免除）、
          同じ月の中で終わる場合でも14日以上取得していればその月が免除されます。賞与にかかる保険料は、
          賞与を支払った月の末日を含む連続した1か月を超える育休の場合に限り免除されます。
          免除される保険料の額は標準報酬月額と保険料率で決まり、料率は都道府県や健康保険組合ごとに異なるため、
          このツールは推測せず、給与明細の金額を入力していただく方式にしています。
          <strong>雇用保険の育児休業給付が原則1歳（最長2歳）までなのに対し、社会保険料の免除は3歳未満まで</strong>
          が対象です。混同しやすいので、期間はそれぞれ別に確認してください。
        </p>
        <p>
          育児時短就業給付金（復職後に時短勤務をする場合の給付）はこのツールの範囲外です。
          復職後の保育料は、育休中の給付が非課税で算定基礎に入らないため下がることがあります。
        </p>
        <SeidoNotice datasets={[ikukyuKyufuDataset]} today={todayJst()} />
      </>
    ),
  },
  "fukki-bi-keisan": {
    ui: <FukkiBiKeisan />,
    formula: (
      <>
        <p>
          <strong>産後休業終了日の目安</strong>
          ：出産日から{FUKKIBI_POSTNATAL_LEAVE_DAYS}日後です。健康保険法が定める出産手当金の産後の支給期間（多胎でも変わりません）と同じ日数を使っています。
          出産日が確定していない場合は、出産予定日で試算します。
        </p>
        <p>
          <strong>育休の各期限</strong>
          ：育休の原則終了日は「子が1歳に達する日」、延長した場合は「1歳6か月に達する日」「2歳に達する日」です。
          「◯歳に達する日」は誕生日そのものではなく、
          <strong>誕生日の前日</strong>
          を指します（年齢計算ニ関スル法律・民法143条の一般原則）。1歳6か月は12か月＋6か月、2歳は
          育児・介護休業法が定める育休の上限年齢からの計算です。復帰日はそれぞれの期限の翌日になります。
        </p>
        <p>
          <strong>育児休業給付金の給付率</strong>
          ：休業開始から通算{FUKKIBI_RATE_SWITCH_DAYS}日目までは{Math.round(FUKKIBI_RATE_FIRST * 100)}%、
          {FUKKIBI_RATE_SWITCH_DAYS + 1}日目以降は{Math.round(FUKKIBI_RATE_AFTER * 100)}%に下がります。
          育休を長く取るほど、給付率が下がった期間の割合が増えることになります（本ツールでは金額の計算は行いません。
          金額を知りたい場合は「産休育休まるごとお金シミュレーター」をご利用ください）。
        </p>
        <p>
          <strong>育休を延長するための要件</strong>
          ：育休そのものの延長（育児・介護休業法、勤務先への申出）と、育児休業給付金の支給対象期間の延長
          （雇用保険法、ハローワークへの申請）は別々の制度で、要件も異なります。
          いずれも「保育所等に入所できない」等の事由が必要で、単に希望するだけでは延長できません。
          2025年4月からは、育児休業給付金の延長審査に「速やかな職場復帰のための申込みか」という要件が加わり、
          保育所等の利用申込書の写しなどの提出が必須になっています。申込みの時点でコピーを保管しておくことが重要です。
        </p>
        <p>
          <strong>保育園入園の申込み時期</strong>
          ：自治体ごとに申込みの受付時期・審査スケジュールが大きく異なるため、本ツールでは各期限の4か月前〜2か月前を
          「検討を始める一般的な目安」として示すのみで、具体的な自治体名や締切日は案内していません。
          お住まいの自治体の窓口・ウェブサイトで早めにご確認ください。
        </p>
        <p>
          育児休業の延長は
          {LEAVE_EXTENSION_1_MONTHS}
          か月・
          {LEAVE_EXTENSION_2_MONTHS}
          か月（1歳6か月・2歳）の2段階までで、それ以上の延長制度はありません。
        </p>
        <SeidoNotice datasets={[ikukyuKyufuDataset, ikukyuEnchoDataset]} today={todayJst()} />
      </>
    ),
  },
  "jitan-kyuyo": {
    ui: <JitanKyuyo />,
    formula: (
      <>
        <p>
          <strong>育児時短就業給付金とは</strong>
          ：2歳に満たないお子さんを養育するために、1週間当たりの所定労働時間を短縮して働く方に、
          時短後の賃金の10%が支給される制度です（雇用保険法第61条の12、2025年4月1日創設）。
          給付そのものは非課税で、翌年の住民税や保育料の算定基礎にも入りません。
        </p>
        <p>
          <strong>「1日6時間勤務でないと対象外」は誤りです</strong>
          ：短縮後の1週間当たりの所定労働時間に上限・下限はありません。
          育児・介護休業法の所定労働時間の短縮措置（1日6時間）に限らず、2歳未満のお子さんを養育するために
          週の所定労働時間を短縮した場合は育児時短就業として取り扱われます。
          ただし、時短による賃金の減り方が小さい場合は、下記のとおり支給率が調整されます。
        </p>
        <p>
          <strong>支給額の決まり方（3つの区分）</strong>
          ：①支給対象月の賃金額が「育児時短就業を始める前の賃金月額 × 90%」以下のときは、
          支給対象月に支払われた賃金額の10%です。②90%を超えて100%未満のときは、支給率が10%から
          一定の割合で逓減するように調整されます。③①②による支給額と賃金額の合計が支給限度額を超えるときは、
          「支給限度額 − 賃金額」が支給額になります。たとえば時短前の賃金月額{yen(jitanEx.wageAtStart)}円の方が時短後に{yen(jitanEx.wageInMonth)}円になる場合、
          {yen(jitanEx.wageInMonth)}円は90%（{yen(jitanExNinety)}円）以下なので10%の{yen(jitanExRule1)}円……ではなく、合計{yen(jitanEx.wageInMonth + jitanExRule1)}円が支給限度額{yen(JITAN_SUPPORT_LIMIT)}円を超えるため、
          {yen(JITAN_SUPPORT_LIMIT)} − {yen(jitanEx.wageInMonth)} = {yen(jitanEx.benefit)}円が支給額になります。時短後の賃金が支給限度額以上の方には支給されません。
          また算定額が最低限度額（{yen(JITAN_MINIMUM_AMOUNT)}円）以下の場合も支給されません。
        </p>
        <p>
          <strong>区分②の「調整後の支給率」の算式</strong>
          ：雇用保険法施行規則第101条の47に基づき、賃金率（支給対象月に支払われた賃金額 ÷
          育児時短就業開始時賃金月額 × 100）を小数第2位まで求め、「支給率（%）＝ 9,000 ÷ 賃金率 −
          90」で計算します（支給率も小数第2位まで。支給額は円未満切捨て）。この式は「賃金の減少額のおよそ90%を補う」ことと同じ意味で、
          賃金率90%でちょうど10%（区分①と連続）、100%で0%になります。区分②の端数処理は区分①と異なり率を先に丸めるため、
          実際の支給額と1円単位で異なる場合があります。
        </p>
        <p>
          <strong>各月の支給要件</strong>
          ：支給されるのは、①初日から末日まで続けて被保険者である月、②1週間当たりの所定労働時間を短縮して就業した期間がある月、
          ③初日から末日まで続けて育児休業給付又は介護休業給付を受給していない月、④高年齢雇用継続給付の受給対象となっていない月、
          のすべてに当てはまる月です。③については「月の一部だけ育休給付を受けた月」の扱いが原文から一意に読み取れないため、
          本ツールは金額を出さず、ハローワークへのご確認をご案内しています。制度そのものの要件としては、
          育児休業給付の対象となる育児休業から引き続き（育児休業終了日との間が14日以内を含む）時短を始めたこと、
          または開始日前2年間に賃金支払基礎日数が11日以上ある完全月が12か月あることが必要です。
        </p>
        <p>
          <strong>★社会保険料は、時短にしてもすぐには下がりません★</strong>
          ：健康保険・厚生年金の保険料は標準報酬月額をもとに決まるため、賃金が下がったその月から自動的に下がるわけではありません。
          このツールは「時短にした直後（社会保険料は前の給料のまま）」と「社会保険料が下がったあと」の2つを並べて表示します。
          ただし、標準報酬月額がいつ・どのような条件で改定されるか、また時短で標準報酬月額が下がっても将来の年金額が
          下がらないようにする申出の制度については、本ツールは判定・計算していません。時期・条件は勤務先にご確認ください。
        </p>
        <p>
          <strong>手取りの概算について</strong>
          ：厚生年金9.15%・健康保険4.95%（全国平均）・子ども・子育て支援金0.115%を標準報酬月額に、
          雇用保険0.5%を実際に支払われる賃金に乗じた概算です。
          <strong>2026年4月から子ども・子育て支援金が新設され、控除が増えています</strong>
          。健康保険と子ども・子育て支援金の本人負担は労使折半として概算しています。
          標準報酬月額の等級表を用いていないため報酬月額をそのまま使った概算であり、実際の保険料とは差が出ます。
          健康保険料率は都道府県ごとに異なりますが、本ツールは全国平均で概算しています。
          所得税・住民税は計算していません（表示している手取りは税を引く前の金額です）。保育料も含んでいません。
        </p>
        <p>
          <strong>時短勤務中の社会保険料は免除されません。</strong>
          保険料が免除されるのは産前産後休業・育児休業等の期間です。育休中は0円だった保険料が、
          復職して時短で働き始めると賃金が下がっても前の水準のまま引かれる、という落差が起きるのはこのためです。
          なお、育児休業給付金の67%と出生後休業支援給付金の13%を足した「80%（手取り10割相当）」は
          <strong>育児休業中の最大28日間の話であり、育児時短就業給付とは別の制度です</strong>。
        </p>
        <SeidoNotice datasets={[ikukyuKyufuDataset, fuyoKabeDataset]} today={todayJst()} />
      </>
    ),
  },
  "fukushoku-tedori": {
    ui: <FukushokuTedori />,
    formula: (
      <>
        <p>
          <strong>このツールが1画面にまとめるもの</strong>
          ：復職して時短で働くと、①賃金そのものが減る ②育児時短就業給付金が乗る（非課税）
          ③社会保険料は時短にしてもすぐには下がらない ④保育料が引かれる、の4つが同時に動きます。
          単発の給料計算では「毎月いくら手元に残るのか」が出ないため、この4つを1つの計算に載せています。
          ①〜③は「時短勤務の給料・給付シミュレーター」と同じ計算をそのまま使い、そこから④の保育料を差し引きます。
        </p>
        <p>
          <strong>育児時短就業給付金（②）の算定</strong>
          ：2歳に満たないお子さんを養育するために週の所定労働時間を短縮して働く方に、
          時短後の賃金の10%が支給される制度です（雇用保険法第61条の12、2025年4月1日創設）。
          時短前の賃金月額の90%を超えて100%未満の範囲では、支給率が10%から一定の割合で逓減します
          （雇用保険法施行規則第101条の47）。支給限度額・最低限度額による頭打ち・不支給の判定も行います。
          詳しい算定の内訳と各月の支給要件は「時短勤務の給料・給付シミュレーター」と共通です。
        </p>
        <p>
          <strong>社会保険料の「時間差」（③）</strong>
          ：健康保険・厚生年金の保険料は標準報酬月額をもとに決まるため、時短にした直後の数か月は
          前の給料のままの保険料が引かれます。本ツールは「時短にした直後（社会保険料は前の給料のまま）」と
          「社会保険料が下がったあと」の2つを並べて表示します。いつ下がるか（随時改定の時期）は
          制度データに未収録のため断定していません。厚生年金9.15%・健康保険4.95%（全国平均）・
          子ども・子育て支援金（2026年4月新設）の本人負担・雇用保険料を概算し、標準報酬月額の等級表は
          用いていない概算です。所得税・住民税は計算していません（表示は税引前です）。
        </p>
        <p>
          <strong>保育料の「時間差」（④）</strong>
          ：認可保育園などの保育料は<strong>前年（＝育休前のフル収入）の課税額</strong>をもとに決まるため、
          復職直後は収入が下がっていても保育料が高いままになりがちです。社会保険料の時間差（③）と保育料の時間差（④）が
          重なるのが復職直後です。保育料そのものは自治体ごとの階層表で決まり全国共通の式がないため、
          本ツールでは推測せず、あなたが入力した実額（保育料計算ツールで求めた額）をそのまま差し引いています。
        </p>
        <p>
          <strong>翌年度に保育料が下がる可能性</strong>
          ：育児休業給付金・育児時短就業給付金は非課税で、翌年の住民税・保育料の算定基礎にも入りません。
          そのため時短で収入が下がっていれば、翌年度の保育料の見直し（多くの自治体で9月に切り替わります）で
          保育料が下がる場合があります。切替の時期・金額は自治体ごとに異なるため、本ツールでは翌年度の保育料は
          自動計算せず、案内のみとしています。
        </p>
        <SeidoNotice datasets={[ikukyuKyufuDataset, fuyoKabeDataset]} today={todayJst()} />
      </>
    ),
  },
  "sentaku-hyoji": {
    ui: <SentakuHyoji />,
    formula: (
      <>
        <p>
          衣類タグの洗濯表示は、家庭用品品質表示法に基づく繊維製品品質表示規程が引用する「JIS L
          0001」に沿ったもので、令和6年8月20日に改正されました（国際規格ISO
          3758との整合のための改正）。本ツールは、この改正後の記号に対応しています。
        </p>
        <p>
          記号は「洗濯・漂白・乾燥・アイロン仕上げ・商業クリーニング」の5種類の基本記号（桶／三角形／正方形／アイロン形／円）に、付加記号を組み合わせて意味を表します。付加記号は、数字（洗濯液の温度の上限）、下線（下線のない同じ記号より弱い処理。二本線は非常に弱い処理）、点（乾燥・アイロン仕上げの温度の上限。点が増えるほど高温）、重ね書きの「×」（禁止）です。例えば「洗濯桶に『40』、下に線1本」は、液温40℃を上限に洗濯機の弱水流で洗えることを示します。
        </p>
        <p>
          検索は固定データ表の記号名・キーワード・正式な意味を対象にした文字列一致で行っており、計算は行っていません（記号1つずつの意味とお手入れ方法を調べるための一覧・検索です）。カメラで記号を撮影して自動判定する機能は本ツールの対象外です。
        </p>
        <p>
          本ツールは、消費者庁の解説ページ「各記号の詳細」の表に掲載された記号を、同ページの記号番号（190・111・511など）ごとに収録しています。同ページには記号の総数の記載がないため、本ツールでも総数は示していません。
        </p>
        <p>
          お手持ちの衣類のタグが本ツールの記載と違う場合があります。令和6年8月19日以前に表示された衣類には改正前の記号が付いていることがあり、見た目が同じでも意味が異なる記号があります（例えばアイロンの点3つは、改正前は200℃、改正後は210℃が上限です）。さらに平成28年11月30日以前の衣類には、体系の異なる旧JIS（JIS L 0217）の表示が付いていることがあります。
        </p>
        <p>
          記号の意味は一般的な目安です。実際の取り扱いは衣類ごとのタグ表示を優先してください。ドライクリーニング・ウエットクリーニング専用の表示や手洗い指定がある衣類は、家庭で洗うと型崩れ・縮み・色落ちのリスクが高いため、不安な場合は専門のクリーニング店にご相談ください。
        </p>
      </>
    ),
  },
  "reito-hozon": {
    ui: <ReitoHozon />,
    formula: (
      <>
        <p>
          計算式はありません。食材名の部分一致検索（ひらがな⇄カタカナの表記ゆれを吸収）またはカテゴリ絞り込みで、あらかじめ収録した食材ごとの固定データ（保存期間目安・下処理のコツ・解凍のコツ）を検索して表示しているだけです。検索結果が1件に絞られた時点で詳細を表示し、複数件ヒットした場合は候補一覧から選んでいただきます。
        </p>
        <p>
          保存期間目安は、家庭用冷凍庫（-18℃以下）を目安に、食材ごとに定めた「生」「加熱後」「下処理後」いずれかの状態で保存した場合の週数を、4週間を1ヶ月単位として読みやすく丸めた表現（例:
          4週間→「約1ヶ月」）です。データ本体は週単位で保持しており、表示のときだけ丸めています。
        </p>
        <p>
          この目安は消費者庁・農林水産省の食品保存・食品ロス削減に関する一般案内をもとにした、品質が保てる期間の参考値であり、安全性を保証する期限ではありません。{REITO_HOZON_DISCLAIMERS.quality}
        </p>
        <p>{REITO_HOZON_DISCLAIMERS.abnormality}</p>
        <p>{REITO_HOZON_DISCLAIMERS.noRefreeze}卵は殻付きのままでは冷凍できません（破裂のおそれがあるため、必ず割りほぐしてから冷凍します）。</p>
        <p>
          現在は代表的な26食材のサンプル収録です。未登録の食材は「まだ登録がありません」と表示し、今後の追加をお待ちいただく形にしています。生米の保存やお米の炊飯量の目安など、本ツールの対象外の情報は扱いません。
        </p>
      </>
    ),
  },
  "tsukurioki-himochi-ichiran": {
    ui: <TsukuriokiHimochiIchiran />,
    formula: (
      <>
        <p>
          計算式はありません。料理名の部分一致検索（ひらがな⇄カタカナの表記ゆれを吸収）またはカテゴリ選択で、あらかじめ収録した5カテゴリ（生野菜サラダ・浅漬け／加熱調理した一般的なおかず／塩分・糖分・酢を多く使ったもの／カレー・シチュー・煮込み料理／汁物・スープ・みそ汁）の固定データ（冷蔵日数・冷凍週数の目安）を検索して表示しているだけです。
        </p>
        <p>
          <strong>出典調査の結果（正直な開示）</strong>
          ：消費者庁・農林水産省・厚生労働省のサイトを調査しましたが、「きんぴらごぼうは冷蔵3日」のような
          <strong>料理単位の具体的な保存日数を明記した一次情報は見つかりませんでした</strong>
          。公的機関が明記しているのは、①調理後はあら熱を早く取り小分けにして冷蔵・冷凍し、なるべく早く食べきる（厚生労働省・農林水産省）、②カレー・煮込み料理はウエルシュ菌（12〜50℃で増殖）対策として「できるだけその日のうちに食べきる」（農林水産省）、③食べる際は温かい料理65℃以上・みそ汁やスープは沸騰するまで加熱（厚生労働省）、という3点の定性的な原則のみです。
        </p>
        <p>
          そのため本ツールの冷蔵日数・冷凍週数は、上記の原則と一般的な食品衛生の考え方（加熱の有無・塩分/糖分/酢の濃さで傷みやすさの傾向が変わる）を踏まえた<strong>カテゴリ単位の一般的な目安</strong>であり、公的機関が個別の料理に対して保証した数値ではありません。{TSUKURIOKI_GRANULARITY_LIMITATION}
        </p>
        <p>{TSUKURIOKI_DISCLAIMERS.generalPrinciple}</p>
        <p>{TSUKURIOKI_DISCLAIMERS.reheat}</p>
        <p>{TSUKURIOKI_DISCLAIMERS.notSafetyGuarantee}</p>
        <p>
          現在は5カテゴリの分類です。カレー・シチュー等の冷凍週数は、#37冷凍保存期間検索（<code>data/tables/reito-hozon.json</code>）のカレー・シチュー項目と同じ目安（約2〜4週間）を使用しています。
        </p>
      </>
    ),
  },
  "suihan-mizu": {
    ui: <SuihanMizu />,
    formula: (
      <>
        <p>
          「合」は日本の伝統的な体積単位で、1合＝180ml、精白米1合はおよそ150gが目安です。「米の重量(g)」や「計量カップ(ml)」で入力した場合は、この2つの基準値を使って合数（g÷150、または ml÷180）に換算してから、以下の計算を行っています。
        </p>
        <p>
          白米の水加減は「米の重量×1.2」（重量ベース目安）と「合数×200ml」（合数簡易法目安）の2通りの経験則を併記しています。前者は1合＝180ml換算、後者は1合＝200ml換算で、約10%の差がありますが、どちらも実務でよく使われる目安であり、どちらか一方が誤りというわけではありません。
        </p>
        <p>
          無洗米はぬかを洗い流す工程がない分、通常の白米より水がやや多めに必要とされるため、白米の合数簡易法（合数×200ml）に1合あたり大さじ1〜2杯（15〜30ml）を加算した範囲で表示しています。玄米は表皮が硬く吸水に時間がかかるため、体積ベースで米の1.5倍の水（浸水30分〜一晩推奨）、もち米は炊飯器で炊く場合の目安として米とほぼ同量（体積の1.0倍）の水としています。
        </p>
        <p>
          家庭用炊飯器は5合炊き・1升(10合)炊きが一般的なため、1升を超える量を指定した場合は分けて炊くことを案内しています。逆に0.3合以下のごく少量では計量誤差が大きくなりやすいため、キッチンスケールでの計量をおすすめする注記を出しています。
        </p>
        <p>
          ここに示す数値はあくまで一般的な計量の目安です。米の産地・精米からの経過日数・お好みの硬さによって最適な水加減は変わります。お使いの炊飯器の内釜に目盛り線がある場合は、そちらに従うのが最も正確です。
        </p>
      </>
    ),
  },
  "kondate-teian": {
    ui: <KondateTeian />,
    formula: (
      <>
        <p>
          計算式はありません。あらかじめ収録した{" "}
          <strong>レシピ{kondateRecipeCount}品（主菜{kondateCounts.main}・副菜{kondateCounts.side}・汁物{kondateCounts.soup}）</strong>
          から、条件に合うものを抽選しているだけです。レシピと食材のデータはすべて自作で、
          一般的な家庭料理の名称・主材料・調理法だけを持っています。分量や手順文は持っていません。
          抽選はすべてお使いのブラウザの中で行われ、入力した条件はどこにも送信されません。
        </p>
        <p>
          <strong>条件は2種類に分けています。</strong>
          「使わない食材」「1日の合計調理時間の上限」「ジャンル」「汁物の要否」は
          <strong>絶対条件</strong>で、1つでも満たせないレシピは候補から取り除きます。満たす組合せが
          作れないときは、中途半端な献立を出さずに「作れません」とお伝えし、
          どの条件をどう変えると候補が何品になるかを具体的な数字で示します。
          一方「前日と作り方が重ならない」「主材料の種類が続かない」「同じ日にコンロが重ならない」
          「食材を使い回せる」は<strong>優先条件</strong>で、満たせなくても献立は出します
          （満たせなかった場合はその旨を表示します）。
        </p>
        <p>
          <strong>同じ URL なら、いつ開いても同じ献立が出ます。</strong>
          抽選にはシード（URL の <code>s</code>）から作る擬似乱数を使っており、
          時刻や端末には一切依存しません。候補はレシピの並び順ではなく
          <strong>ID の順に並べ替えてから</strong>抽選するため、レシピを追加してもデータの並びが変わるだけでは
          献立は変わりません。逆に、レシピそのものを増やしたり抽選の重みを変えたりすると献立は変わるため、
          そのときは URL の <code>v</code> が合わなくなり「再現できません」と表示します
          （黙って別の献立に差し替えることはしません）。「1日だけ引き直す」「1品だけ引き直す」を押しても、
          他の日・他の品は1品も動きません。
        </p>
        <p>
          <strong>表示している時間について</strong>
          ：主菜・副菜・汁物の目安時間を<strong>そのまま足した数字</strong>です。実際には並行して作るので
          これより短くなりますが、「並行できる時間」を推定すると根拠のない数字になるため、
          あえて単純な合計のままにし、「順番に作った場合の目安」と表示しています。
          人数は表示のためだけに使っており、抽選には影響しません（レシピは2人分が基準です）。
        </p>
        <p>
          <strong>このツールが判断していないこと</strong>
          ：{KONDATE_DISCLAIMER.nutrition}
          {KONDATE_DISCLAIMER.pregnancy}
        </p>
        <p>
          <strong>「使わない食材」について</strong>
          ：{KONDATE_DISCLAIMER.allergy}
        </p>
        <p>{KONDATE_DISCLAIMER.data}</p>
      </>
    ),
  },
  "kaimono-list-jidou-seisei": {
    ui: <KaimonoListJidouSeisei />,
    formula: (
      <>
        <p>
          計算式はありません。献立自動提案（Q3-16）と同じレシピ・食材データ（
          <strong>レシピ{kondateRecipeCount}品</strong>）から、選んだレシピの
          <code>ingredients</code>（食材id・役割）を集計し、同じ食材id・同じ役割の組み合わせが
          何品のレシピで使われるかを数えているだけです。集計はすべてお使いのブラウザの中で行われ、
          選んだレシピはどこにも送信されません。
        </p>
        <p>
          <strong>分量（g・大さじ等の数量）は表示しません。</strong>
          もとになっているレシピデータは「一般的な家庭料理の名称・主材料・調理法」だけを持ち、
          分量や手順文は持っていません（献立自動提案と同じ設計）。存在しない分量を仮定して合算すると、
          誤った買い物量を案内してしまう恐れがあるため、あえて「いくつのレシピで使うか（使用回数）」を
          表示するにとどめています。
        </p>
        <p>
          <strong>同じ食材でも、役割が違えば別の行に分けています。</strong>
          例えば玉ねぎは、あるレシピでは主材料として、別のレシピでは付け合わせとして使われることが
          あります。実際に必要な量の感覚が異なるため、食材id と役割（主材料／副材料／薬味・付け合わせ／
          調味料）の組み合わせを1行として扱い、無理に1つの数量へまとめることはしていません。
        </p>
        <p>
          <strong>常備していることが多い食材について</strong>
          ：塩・しょうゆなど、多くの家庭で常備されがちな食材には「常備していることが多い食材です」と
          添えていますが、これは「買わなくてよい」という保証ではありません。リストからは外さず、
          あくまで参考情報として表示しています。
        </p>
        <p>
          並び順は常温→冷蔵→冷凍の保管場所別にしています。買い物の際に見つけやすいよう、
          毎回同じ順序になるようにしています。
        </p>
      </>
    ),
  },
  "kaigo-jikofutan": {
    ui: <KaigoJikofutan />,
    formula: (
      <>
        <p>
          <strong>利用者負担の割合（1割・2割・3割）</strong>
          ：まず年齢区分で分かれます。40〜64歳の方（第2号被保険者）は、
          <strong>所得にかかわらず一律1割</strong>です。65歳以上の方（第1号被保険者）は、
          世帯内の65歳以上の方の所得により毎年判定されます。ここが最も誤解の多いところですが、
          <strong>2割・3割になるには2つの要件の「両方」を満たす必要があります（AND条件）</strong>
          。2割は「本人の合計所得金額160万円以上」<strong>かつ</strong>
          「世帯の65歳以上の方の年金収入＋その他の合計所得金額が280万円以上（単身）／346万円以上（夫婦等）」、
          3割は「合計所得金額220万円以上」<strong>かつ</strong>
          「同340万円以上（単身）／463万円以上（夫婦等）」です。合計所得金額が基準を超えていても、
          年金収入＋その他の合計所得金額が基準に届かなければ1割のままです。実際、2割負担の方は
          利用者の約4.3%、3割負担の方は約3.9%で、9割以上の方は1割負担です（令和7年3月現在）。
          最終的な割合は、市区町村が交付する「介護保険負担割合証」で確定します。
        </p>
        <p>
          <strong>区分支給限度基準額は「単位数」で決まります</strong>
          ：要介護度ごとに、1か月に介護保険を使えるサービスの上限が単位数で定められています
          （要介護3なら27,048単位）。この範囲内なら自己負担は負担割合ぶん（1割なら27,048円）ですが、
          <strong>限度額を超えて使った分は全額（10割）が自己負担になります</strong>
          。超過分に負担割合は掛かりません。なお、この超過分は高額介護サービス費の対象にもなりません。
        </p>
        <p>
          <strong>1単位の単価について</strong>
          ：本ツールは<strong>1単位＝10円（その他地域）で計算しています</strong>
          。単価は「級地（地域区分）× サービスの種類」の組合せで決まり、上乗せの割合はサービスの
          人件費割合区分（70%／55%／45%）により異なります。居宅療養管理指導・福祉用具貸与などは
          全級地で10円です。<strong>「1級地は一律11.40円」は誤りです</strong>
          。級地ごとに示される単価は上限値にすぎません。本ツールは市町村別の級地一覧と、
          人件費割合区分ごとの単価表を収録していないため、1〜7級地を選んだ場合も確定額は表示せず、
          10円で計算した額と「その級地の単価の上限値」を併記しています。実際の額はケアマネジャーにご確認ください。
        </p>
        <p>
          <strong>高額介護サービス費</strong>
          ：1か月に支払った利用者負担の合計が上限額を超えたとき、超えた分が払い戻されます。
          上限額は所得区分ごとに決まり、課税世帯は課税所得により44,400円／93,000円／140,100円（いずれも世帯）、
          市町村民税世帯非課税は24,600円（世帯）、非課税かつ年金収入等が80万円以下の方は世帯24,600円・個人15,000円、
          生活保護を受けている方は15,000円（個人）です。
          <strong>非課税世帯・生活保護の方は課税所得の金額では判定しません</strong>
          （課税所得は0円でも、上限額は44,400円ではなく24,600円です）。判定に使う所得は
          「サービスを受けた月の属する年の前年（その月が1月から7月までの場合には前々年）」のもので、
          該当するかどうかはサービス利用があった月ごとに、それぞれの月の初日の状態で判断されます。
          また、世帯主の方で同一世帯に合計所得金額38万円以下の19歳未満の方がいる場合、
          16歳未満は1人あたり33万円、16歳以上19歳未満は1人あたり12万円を課税所得から控除して判定します。
          <strong>
            福祉用具購入費・住宅改修費・施設の食費と居住費・区分支給限度基準額を超えた自己負担分は
            高額介護サービス費の対象外
          </strong>
          のため、本ツールもこれらを上限額の計算に含めていません。
        </p>
        <p>
          <strong>施設の食費・居住費（特定入所者介護サービス費＝補足給付）</strong>
          ：低所得の方には食費・居住費の負担限度額が設けられています。世帯に課税者がいる方（第4段階）は
          対象外で、基準費用額を全額負担します。段階は「年金収入金額＋合計所得金額」で決まりますが、
          この年金収入金額には<strong>非課税年金（遺族年金・障害年金）も含みます</strong>
          。また「世帯」には世帯を分離している配偶者も含みます。税制上の世帯・年金収入とは定義が違います。
          段階ごとに預貯金等の額の要件もあり、これを超えると対象外になります。
        </p>
        <p>
          <strong>★2026年8月1日から食費・居住費の負担限度額が変わります★</strong>
          ：令和8年厚生労働省告示第88号（令和8年3月13日公布済み）により、食費の基準費用額が
          1日1,445円から1,545円に上がります。負担限度額は、食費が第3段階①は+30円/日、第3段階②は+60円/日、
          居住費は第3段階②のみ+100円/日の引上げです。
          <strong>第1段階・第2段階は据置で、負担は増えません</strong>
          （改正＝全員が値上げ、ではありません）。また居住費の引上げには例外があり、
          <strong>多床室のうち室料を徴収しない老健・医療院等は第3段階②も据置</strong>です。
          本ツールは<strong>「いつのサービス分か」（試算の基準日）で新旧を切り替えています</strong>
          。7月31日と8月1日で金額が変わります。
        </p>
        <p>
          <strong>年金収入等が80万円台前半の方へ（2026年8月に段階の境界が変わります）</strong>
          ：補足給付の第2段階と第3段階①の境界は、老齢基礎年金（満額）の額に連動して改定されます。
          2026年7月分までは80.9万円、8月分からは82.65万円です（介護保険法施行規則第83条の5。
          「80.9万円」と「82.65万円」はどちらも正しく、適用される時点が違うだけです）。
          本ツールは<strong>試算の基準日がどちらの期間かで境界を自動的に切り替えます</strong>。
          この帯の方は7月分までは第3段階①、8月分からは第2段階になります。
        </p>
        <p>
          <strong>要介護度について（状態像は書きません）</strong>
          ：要介護度は「要介護認定等基準時間」で定義されます（要介護3なら70分以上90分未満）。
          これは
          <strong>介護の必要性を量る「ものさし」であり、実際に家庭で行われる介護時間とは異なります</strong>
          。厚生労働省は「要介護認定は、介護サービスの必要度を判断するものです。従って、その方の
          病気の重さと要介護度の高さとが必ずしも一致しない場合があります」と明示しており、
          <strong>要介護度ごとの「状態像」を定義した公式の規定はありません</strong>
          。そのため本ツールは基準時間のみを表示し、状態像による説明は行いません。
          なお<strong>要支援2と要介護1は同じ32分以上50分未満</strong>で、
          振り分けは①認知症高齢者の日常生活自立度②状態の安定性、の審査判定によります。
          要介護度の推定も行いません。認定は、市区町村の認定調査員による調査と主治医意見書に基づく
          コンピュータ判定（一次判定）、介護認定審査会による審査判定（二次判定）を経て市区町村が行います。
        </p>
        <p>
          <strong>本ツールが扱っていないもの</strong>
          ：個別のサービスの単位数（本ツールは限度額の単位数のみを収録しています）、事業所ごとの加算、
          市町村別の級地、福祉用具購入費・住宅改修費、介護保険料（払い込む側の制度で別物です）。
          また<strong>高額医療・高額介護合算療養費は扱っていません</strong>
          。70歳以上の現役並み所得区分などの現行限度額を一次資料で確認できていないためです。
          該当する可能性のある方は市区町村にご確認ください。
        </p>
        <p>
          <strong>知っておくとよい2つの動き</strong>
          ：①令和8年度の介護報酬改定（+2.03%）でサービスの単位数が上がる一方、
          区分支給限度基準額の単位数は据え置かれています（最終改正は令和元年10月）。
          そのため、限度額の範囲内で使えるサービス量は実質的に減っています。
          ②2027年度から2割負担の対象が広がる可能性があります（検討中で、具体的な数値は決まっていません）。
          2026年度は現行の基準で計算しています。
        </p>
        <SeidoNotice datasets={[kaigoHokenDataset]} today={todayJst()} />
      </>
    ),
  },
  "youji-mushouka-checker": {
    ui: <YoujiMushoukaChecker />,
    formula: (
      <>
        <p>
          3〜5歳児クラスは全世帯が無償化の対象です。0〜2歳児クラスは住民税非課税世帯のみが対象で、課税世帯は原則対象外です（自治体独自の減免制度がある場合があります）。この年齢区分の境界は「4月1日時点の満年齢（クラス年齢）」で判定します。
        </p>
        <p>
          認可保育所・認定こども園・幼稚園（新制度）は、入園にあたって既に受けている保育の必要性の認定（2号・3号認定）または教育標準時間認定（1号認定）に無償化の適用が含まれるため、追加の手続きは不要です。一方、幼稚園（未移行・預かり保育含む）・認可外保育施設等・企業主導型保育等は、無償化を受けるために市区町村へ別途「施設等利用給付認定」を申請する必要があるため、本ツールではこれらを「条件付き対象」として表示します。
        </p>
        <p>
          月額上限が定められているのは認可外保育施設等のみで、3〜5歳児クラスは37,000円、0〜2歳児クラス（住民税非課税世帯）は42,000円です（こども家庭庁「幼児教育・保育の無償化」に基づく2026年度時点の値）。幼稚園（未移行）・企業主導型保育等にも上限が定められている場合がありますが、本ツールが参照する制度データには数値の収録がないため、上限額は「データなし・要確認」として断定表示していません。
        </p>
        <p>
          幼稚園（新制度・未移行いずれも）は満3歳以上のお子さまが対象のため、0〜2歳児クラスでの幼稚園利用という組み合わせは対象外として扱います。
        </p>
        <p>{YOUJI_MUSHOUKA_DISCLAIMER}</p>
      </>
    ),
  },
  "ninshin-kenshin-schedule": {
    ui: <NinshinKenshinSchedule />,
    formula: (
      <>
        <p>
          <strong>受診間隔の考え方</strong>
          ：厚生労働省が示す標準的な妊婦健診の例（1回目を妊娠8週頃とした場合）に基づき、妊娠23週までは4週間に1回、妊娠24週から35週までは2週間に1回、妊娠36週から出産までは1週間に1回という間隔で、出産予定日から逆算して各回の目安日・妊娠週数を計算しています。標準的な入力では合計14回が生成され、これは厚生労働省の例示・母子保健法第13条第2項に基づく「望ましい基準」（平成27年3月31日厚生労働省告示第226号）が示す回数と一致します。
        </p>
        <p>
          最終月経開始日（LMP）のみを入力した場合は、LMP+280日（40週0日）を出産予定日の目安として計算します。出産予定日とLMPの両方を入力し食い違いがある場合は、医師の診察・超音波検査で確定していることが多い出産予定日を優先し、食い違いの日数は注意表示のみ行います。
        </p>
        <p>
          <strong>公費助成との関係</strong>
          ：各回が「公費助成の目安回数（データ由来。現時点で14回）」以内かどうかを判定して表示します。こども家庭庁調査（令和6年4月1日現在）では、全ての市区町村（1,741）が14回以上を公費助成していますが、
          <strong>助成の金額・対象となる検査項目・受診券の方式は市区町村ごとに異なります</strong>
          。金額を断定せず、目安回数内であることのみを示しています。
        </p>
        <p>
          あわせて、産後の産婦健康診査（産後2週間・産後1か月が目安）の参考日も、出産予定日を起点に計算して表示します。国庫補助の対象は2回分ですが、令和6年度時点で全1,741市区町村中1,445市区町村の実施にとどまり、全国一律に受けられる制度ではありません。
        </p>
        <p>
          <strong>
            本ツールが行うのは、これらの制度上の標準スケジュールの日付計算のみです。
          </strong>
          実際に何回・いつ受診するかは妊娠経過・体調・医療機関の方針によって異なり、医学的な受診指示・診断は一切行っていません。必ず担当医の指示、お住まいの市区町村の母子保健担当窓口の案内を優先してください。
        </p>
      </>
    ),
  },
  "youkaigo-nintei-dandori-navi": {
    ui: <YoukaigoNinteiDandoriNavi />,
    formula: (
      <>
        <p>
          <strong>原則の処理期間（30日）</strong>
          ：介護保険法<strong>第27条第11項</strong>
          は、要介護認定の申請に対する処分（認定または非該当の通知）を
          <strong>申請のあった日から30日以内</strong>
          に行うのが原則であると定めています。ただし、認定調査や主治医意見書の準備に時間を要する等の
          特別な理由があるときは、市区町村がその30日以内に「あとどれくらいかかりそうか（処理見込期間）」
          と理由を書面で通知したうえで延期することが同項ただし書で認められています。この延期は制度上
          想定された正規の手続であり、必ずしも異常事態ではありません。同第12項は、30日を超えても
          処分・延期通知がない場合等に、被保険者側から市区町村が却下したものとみなすことができる旨も
          定めています。
        </p>
        <p>
          <strong>「30日以内」は保証ではありません</strong>
          ：厚生労働省の集計（介護保険総合データベース、令和5年度4月〜令和6年3月申請分、保険者数1,559）
          によると、<strong>全国平均の認定審査期間は39.8日</strong>
          で、申請から30日以内に認定された割合は平均<strong>25.1%</strong>にとどまります。
          法律上の原則である30日を、実際には多くの申請で超えているのが全国的な実態です。
          本ツールはこの実態を隠さず表示します。
        </p>
        <p>
          <strong>手続の流れ</strong>
          ：①申請（第27条第1項。申請書に被保険者証を添付）②認定調査（第2項。市区町村職員等による面接調査）
          ③主治医意見書（第3項。主治の医師に心身の状況等の意見を求める）④一次判定（第4項。コンピュータ判定）
          ⑤介護認定審査会による審査判定＝二次判定（第4項・第5項）⑥認定結果の通知（第7項・第9項）という順序です。
          認定調査と主治医意見書は、多くの場合ほぼ同時に依頼され並行して進みます。
        </p>
        <p>
          <strong>目安のタイムライン</strong>
          ：厚生労働省は、認定審査期間の平均が30日以内に収まっている保険者（全体の約4.2%にあたる66保険者）
          の実績（認定調査所要期間6.6日・主治医意見書所要期間12.7日・審査会等事務処理期間12.3日）を踏まえ、
          令和7年2月20日時点の「対応（案）」として、認定調査は依頼から<strong>7日以内</strong>、
          主治医意見書は依頼から<strong>13日以内</strong>、介護認定審査会は調査票・意見書が揃ってから
          <strong>12日以内</strong>という目安を示しました。本ツールはこの目安（認定調査と主治医意見書は並行、
          遅い方に審査会の日数を足す＝13日＋12日＝申請から通算25日ごろ）を参考のタイムラインとして表示しますが、
          <strong>法的拘束力のある確定基準ではなく</strong>、地域や時期によって大きく変動します。
        </p>
        <p>
          <strong>認定後について</strong>
          ：認定される要介護度は「介護の必要性を量るものさし（要介護認定等基準時間）」で決まり、
          状態像による公式な定義は存在しません。認定後は、要介護の方はケアマネジャーにケアプランの作成を、
          要支援の方は地域包括支援センターに相談するのが一般的な流れです。ケアプラン作成・サービス利用開始に
          ついては、標準処理期間のような一次データがないため、本ツールは日数の目安を示さず、手続の順序のみを
          案内しています。
        </p>
        <SeidoNotice datasets={[kaigoNinteiDataset, kaigoHokenDataset]} today={todayJst()} />
      </>
    ),
  },
  "kaigo-shisetsu-hiyou-hayami": {
    ui: <KaigoShisetsuHiyouHayami />,
    formula: (
      <>
        <p>
          <strong>介護保険で入所できる施設は3種類だけ</strong>
          ：介護保険法上の「施設サービス」（同法第8条第26項）は、介護老人福祉施設（特別養護老人ホーム・特養）・
          介護老人保健施設（老健）・介護医療院の3つのみです。有料老人ホーム・サービス付き高齢者向け住宅は
          「特定施設入居者生活介護」という別の枠組み（居宅サービス）に分類され、建物は民間、介護サービス部分だけが
          介護保険の対象になります。この違いにより、食費・居住費の公的な負担軽減（特定入所者介護サービス費＝
          補足給付）を受けられるかどうかが変わります。
        </p>
        <p>
          <strong>特養の入所要件</strong>
          ：介護保険法施行規則第17条の9により、原則として要介護3・4・5の方が対象です。ただし同施行規則第17条の10は、
          要介護1・2の方でも「居宅において日常生活を営むことが困難なことについてやむを得ない事由がある」場合の
          特例入所を認めています（認知症で常時見守りが必要な場合、家族による虐待が疑われる場合などが典型例）。
          「要介護3未満は特養に入れない」と一律には言えません。
        </p>
        <p>
          <strong>食費・居住費の計算</strong>
          ：食費・居住費にはいずれも「基準費用額」（施設が受け取れる標準的な額）が定められており、
          低所得の方（世帯全員が市町村民税非課税等）は市区町村に申請して「負担限度額認定」を受けると、
          所得段階（第1〜第3段階②）に応じたより低い「負担限度額」が適用されます。認定を受けていない方
          （市町村民税課税世帯を含む＝第4段階）は基準費用額を全額負担します。本ツールは、選んだ施設タイプ・
          部屋タイプ・所得段階の組み合わせで「食費（1日）＋居住費（1日）」を求め、30日をかけた1か月の目安を
          表示しています。
        </p>
        <p>
          <strong>老健・介護医療院は特養と部屋タイプの基準費用額が違う</strong>
          ：同じ「従来型個室」でも、特養は1,231円/日、老健・医療院は1,728円/日（〜2026年7月31日時点）と、
          老健・医療院のほうが高く設定されています。また老健・医療院の多床室は、令和6年8月から「室料を徴収する場合
          （697円/日）」「徴収しない場合（437円/日）」に分かれています。
        </p>
        <p>
          <strong>2026年8月1日の改正に自動対応</strong>
          ：食費の基準費用額（1日100円引上げ）・食費と居住費の一部負担限度額は2026年8月1日に改定されます。
          本ツールは基準日（今日）がこの日を過ぎているかどうかで、参照する負担限度額表を自動的に切り替えます。
        </p>
        <p>
          <strong>このツールが計算しないもの</strong>
          ：施設サービス費の自己負担（1〜3割）・高額介護サービス費・日常生活費（理美容代等）・各種加算は、
          要介護度・利用単位数・所得区分など追加の情報が必要なため、本ツールでは計算していません
          （「介護保険 自己負担シミュレーター」をご利用ください）。有料老人ホーム・サービス付き高齢者向け住宅
          （特定施設入居者生活介護）の費用は、公的な統計・相場データが存在しないため金額を表示せず、
          個々の施設の費用は厚生労働省の「介護サービス情報公表システム」で確認できる旨のみを案内しています。
        </p>
        <p>
          <strong>★紹介送客なし★</strong>
          ：本ツールは特定の施設名・事業者名・比較サイトへのリンクを一切扱いません（
          <a
            href="/policy"
            className="underline decoration-line underline-offset-4 hover:text-ink"
          >
            紹介ポリシー
          </a>
          ）。
        </p>
        <SeidoNotice datasets={[kaigoShisetsuHiyouSoubaDataset, kaigoHokenDataset]} today={todayJst()} />
      </>
    ),
  },
  "kaigo-shigoto-ryouritsu-checker": {
    ui: <KaigoShigotoRyouritsuChecker />,
    formula: (
      <>
        <p>
          育児・介護休業法は、要介護状態（負傷・疾病・障害により2週間以上常時介護が必要な状態）にある「対象家族」（配偶者・父母・子・配偶者の父母・祖父母・兄弟姉妹・孫）を介護する労働者のために、6つの両立支援制度を定めています。①<strong>介護休業</strong>
          （対象家族1人につき通算{KAIGO_KYUGYO_MAX_DAYS}日、{KAIGO_KYUGYO_MAX_COUNT}
          回まで分割可）②<strong>介護休暇</strong>
          （1年度に{KAIGO_KYUKA_DAYS_PER_YEAR}日、対象家族が2人以上なら{KAIGO_KYUKA_DAYS_PER_YEAR_MULTIPLE}
          日、時間単位取得も可）③<strong>所定外労働の制限</strong>
          （残業そのものの免除）④<strong>時間外労働の制限</strong>
          （1か月{JIKANGAI_MONTHLY_LIMIT}時間・1年{JIKANGAI_YEARLY_LIMIT}
          時間まで）⑤<strong>深夜業の制限</strong>
          （午後10時〜午前5時の労働を免除）⑥<strong>所定労働時間の短縮等の措置</strong>
          （事業主が短時間勤務・フレックス等から選んで講じる義務。利用開始から連続{TANSHUKU_PERIOD_YEARS}
          年以上・{TANSHUKU_MIN_COUNT}回以上利用可能）です。
        </p>
        <p>
          <strong>労使協定による除外と、法律による直接除外の違い</strong>
          ：介護休業・介護休暇（週の所定労働日数が2日以下の場合のみ）・所定外労働の制限・所定労働時間の短縮等の措置は、勤務先が労使協定を結んでいる場合に限り、勤続1年未満や週の所定労働日数が2日以下の方を対象から除外できます。労使協定がなければ対象になるため、本ツールはこれらの条件に該当する場合「条件付き（要確認）」と表示し、断定しません。一方、時間外労働の制限・深夜業の制限は、労使協定の有無にかかわらず法律が直接、勤続1年未満の方を除外の対象と定めています。深夜業の制限にはさらに、深夜に代わって対象家族を介護できる同居の家族がいる場合という独自の除外要件があります。この違いを混同すると、対象になるはずの方に「対象外」と案内してしまう恐れがあるため、本ツールは両者を明確に区別して表示します。
        </p>
        <p>
          <strong>★2025年（令和7年）4月の改正で追加された会社の義務★</strong>
          ：{KOBETSU_SHUCHI_TEXT}
          。また、{JOHO_TEIKYO_40_TEXT}
          （対象年齢は{JOHO_TEIKYO_AGE}歳）。これらは労働者が請求するものではなく、事業主が果たすべき義務です。{TELEWORK_TEXT}
          （★義務ではなく努力義務であり、労働者に請求権はありません★）。
        </p>
        <p>
          本ツールの判定は、対象家族の範囲・要介護状態の見込み・雇用形態という簡単な入力に基づく大まかなチェックです。労使協定の有無など、ご本人の入力だけでは分からない条件があるため、「条件付き（要確認）」と表示された場合は、必ず勤務先の人事担当・就業規則でご確認ください。
        </p>
        <SeidoNotice datasets={[kaigoShigotoRyouritsuDataset]} today={todayJst()} />
      </>
    ),
  },
  "namonaki-kaji-checker": {
    ui: <NamonakiKajiChecker />,
    formula: (
      <>
        <p>
          計算式はありません。あらかじめ用意した「名もなき家事」の項目リスト（家事全般・子育て・介護・その他の4カテゴリ、合計30項目）について、項目ごとに「自分がやっている／パートナーがやっている／ふたりでやっている／やっていない・対象外」のいずれかを選んでいただき、その回答をその場で数えているだけです。項目リストは自前で作成したもので、制度・自治体データには依存していません。
        </p>
        <p>
          画面上部の「自分◯% ・ パートナー◯%」は、「自分」と「パートナー」の回答だけを比べた比率です（「ふたり」「やっていない・対象外」は分母に含めません）。内訳の割合（%）はすべて、回答済みの項目数を分母にして計算しています。未回答の項目が多くても、その分だけ割合が薄まって見えることはありません。
        </p>
        <p>
          参考情報として、{NAMONAKI_KAJI_REFERENCE_STAT.sourceOrg}の{NAMONAKI_KAJI_REFERENCE_STAT.chousaMeisho}のデータ（10歳以上人口全体で1日あたりの家事関連時間は男性{NAMONAKI_KAJI_REFERENCE_STAT.zenkokuDanseiFun}分・女性{NAMONAKI_KAJI_REFERENCE_STAT.zenkokuJoseiFun}分〈2021年〉）を画面内に併記しています。これは社会全体の傾向を示す公的統計の紹介であり、本ツールのチェック結果（個々の家庭の回答）とは独立した情報です。
        </p>
        <p>
          このツールは診断ではありません。数字の偏りが「どちらが悪い」という判定にはならず、あくまで名前のついていない家事に気づくためのきっかけとして作っています。送信・保存は一切行わないため、チェックした内容はページを離れると残りません。
        </p>
      </>
    ),
  },
  "shokuhi-meyasu": {
    ui: <ShokuhiMeyasu />,
    formula: (
      <>
        <p>
          <strong>出典と集計区分</strong>
          ：総務省統計局「家計調査（家計収支編）」2025年（令和7年）平均（2026年2月6日公表）の、
          世帯人員別の実額をそのまま使用しています。単身世帯（1人）は同調査の単身世帯集計、
          2人〜5人・6人以上（二人以上の世帯）は「第３－１表 世帯人員別１世帯当たり１か月間の収入と支出」の実額です。
          「6人以上」区分は総務省統計局の集計上の最大区分で、実際の平均世帯人員は6.3人です。
          7人・10人など6人を超える人数を入力しても、按分・推計はせず同じ「6人以上」区分の実額をそのまま表示します。
        </p>
        <p>
          <strong>表示する金額</strong>
          ：「食料」（食費全体の目安）に加えて、その内訳のうち統計上区分されている「外食」「調理食品（惣菜・弁当などの中食）」を表示し、
          残り（食材の購入・飲料・酒類などを含む）は「その他」としてまとめて計算しています（食料－外食－調理食品）。
          世帯構成（単身/夫婦のみ/夫婦+子どもなど）による違いは、同調査が世帯人員数のみで区分しているため取得できず、
          推測値を作らずに世帯人員数のみを入力項目としています。
        </p>
        <p>
          参考として、単身世帯の消費支出は173,042円、食料は44,659円。二人以上の世帯（世帯人員を問わない単純平均、平均世帯人員2.87人）の消費支出は314,001円、食料は89,754円です。
        </p>
        <p>
          <strong>
            表示される金額はあくまで全国平均の統計値であり、個々の家庭にとっての「正しい」食費や目標額を示すものではありません。
          </strong>
          地域・家族の年齢構成・自炊の頻度・物価の変動などによって、実際の食費は大きく異なります。次回の「◯◯年平均」の公表時期に合わせてデータを更新します。
        </p>
      </>
    ),
  },
  "yosan-haibun-keisan": {
    ui: <YosanHaibunKeisan />,
    formula: (
      <>
        <p>
          <strong>出典と集計区分</strong>
          ：総務省統計局「家計調査（家計収支編）」2025年（令和7年）平均（2026年2月6日公表）の、
          世帯人員別・費目別（10大費目）の実額をもとにした構成比を使用しています。世帯人員区分は「食費の目安計算」（食料の目安）と同じ区分（単身世帯・2人〜5人・6人以上（二人以上の世帯））で、
          「6人以上」区分は総務省統計局の集計上の最大区分（実際の平均世帯人員は6.3人）です。7人・10人など6人を超える人数を入力しても、按分・推計はせず同じ「6人以上」区分の構成比をそのまま使います。
        </p>
        <p>
          <strong>計算方法</strong>
          ：各費目（食料・住居・光熱水道・家具家事用品・被服及び履物・保健医療・交通通信・教育・教養娯楽・その他の消費支出）の実額を、その世帯人員区分の消費支出合計で割った割合（構成比）を求め、入力していただいた手取り月収にその構成比をそのまま掛けて目安金額を計算しています。費目ごとに個別に四捨五入しているため、10費目の合計額は入力した手取り月収と数円程度ずれることがあります。
        </p>
        <p>
          <strong>「消費支出」と「手取り収入」は別の概念です</strong>
          ：家計調査の「消費支出」は、実際に使われた生活費の平均額であり、貯蓄に回した分は含まれていません。本ツールはこの消費支出の費目別構成比を、入力された手取り月収にそのまま当てはめて按分する簡易な計算方法を採っており、構成比のもとになった世帯の実際の貯蓄率や可処分所得の水準とは無関係に計算しています。
        </p>
        <p>
          <strong>
            表示される金額はあくまで全国平均の統計上の構成比を機械的に当てはめた目安であり、あなたの家庭が従うべき配分を示すものではありません。
          </strong>
          地域・住居費（持家か賃貸か）・家族の年齢構成・生活スタイルなどによって、実際に望ましい配分は大きく異なります。次回の「◯◯年平均」の公表時期に合わせてデータを更新します。
        </p>
      </>
    ),
  },
  "shussan-junbi-checklist": {
    ui: <ShussanJunbiChecklist />,
    formula: (
      <>
        <p>
          <strong>時期区分の考え方</strong>
          ：出産予定日から28日前（4週間前）を「臨月開始日」として計算します。妊娠10か月（臨月）は妊娠36週0日〜39週6日を指す慣用区分で、出産予定日（40週0日）の28日前にあたるためです。今日の日付が臨月開始日より前なら「安定期」、臨月開始日から出産予定日までの間なら「臨月」、出産予定日の翌日以降なら「産後」と判定します。
        </p>
        <p>
          出産予定日そのものの40週（280日）という考え方は、出産予定日・妊娠週数計算ツールと同じ日数定数を使っています。本ツールが行うのは、この日数定数をもとにした出産予定日と今日の日付の単純な引き算のみです。
        </p>
        <p>
          <strong>チェックリストの内容について</strong>
          ：「今すぐ確認したいこと」「臨月までに準備したいこと」「入院バッグに入れるもの」「産後に向けて準備したいこと」の4つの区分は、一般的に広く知られている出産準備の目安をまとめた自前のリストです。総務省統計局の調査のような公的な統計データや、法令で定められた基準に基づくものではありません。今の時期に近い区分には目印を付けて表示しますが、他の区分も参考として常に表示し続けます。
        </p>
        <p>
          必要なものは体調・地域・産院の方針・きょうだいの有無などによって大きく異なります。断定的な指示ではなく、母子健康手帳や産院からの案内と合わせて確認するための目安としてご利用ください。実際の出産日は予定日どおりとは限らないため、出産予定日を過ぎた場合の表示（産後の準備リスト）もあくまで参考です。
        </p>
      </>
    ),
  },
  "sango-tetsuzuki-checklist": {
    ui: <SangoTetsuzukiChecklist />,
    formula: (
      <>
        <p>
          <strong>起算日ルール（本ツールの核）</strong>
          ：出生届だけは<strong>出生日当日を1日目</strong>として数えます（戸籍法第43条第1項「届出期間は、届出事件発生の日からこれを起算する」。民法第140条の初日不算入の原則の例外）。
          国内は<strong>{SHUSSHO_DOMESTIC_DAYS}日以内</strong>（出生日が4月1日なら4月14日が期限）、国外は
          <strong>{SHUSSHO_ABROAD_MONTHS}か月以内</strong>です。児童手当（15日特例）と出産育児一時金の請求は、
          特段の初日算入規定がないため民法の原則どおり<strong>出生日（出産日）の翌日を1日目</strong>として数えます。
        </p>
        <p>
          <strong>月・年単位の期限（出生届の国外3か月・出産育児一時金の2年）</strong>
          ：民法第143条の一般原則（暦に従って計算し、起算日に応当する日の前日に満了する。ただし最後の月に応当する日がないときはその月の末日に満了する）を適用しています。
          例えば11月30日生まれの国外出生では、2月に30日が存在しないため、その年の2月末日（28日または29日）が期限になります。
        </p>
        <p>
          <strong>児童手当（15日特例）</strong>
          ：出生日の翌日から<strong>{JIDO_TEATE_EXCEPTION_DAYS}日以内</strong>
          に認定請求をすれば、出生月の翌月分から支給されます。この期限を過ぎると、原則どおり「申請した月の翌月分から」の支給になり、さかのぼって支給されません。
        </p>
        <p>
          <strong>出産育児一時金の請求</strong>
          ：出産日の翌日から<strong>{ICHIJIKIN_CLAIM_YEARS}年以内</strong>
          です。直接支払制度・受取代理制度を利用した場合は、多くのケースで自分で請求する必要はありません。
        </p>
        <p>
          <strong>国外出生の注意</strong>
          ：出生届とともに国籍留保届をしないと、日本国籍を失う場合があります（法務省の公式案内）。
          出生届自体は期限を過ぎても市区町村長が必ず受理し、届出をあきらめる必要はありませんが、国籍留保届は期限厳守が特に重要です。
        </p>
        <p>
          本ツールが扱うのは、依存する3つの制度データから機械的に導出できる期限のみです。健康保険の加入手続きなど、法定の届出期限日数が一次資料から明確に読み取れない手続には踏み込んでいません。
        </p>
        <SeidoNotice
          datasets={[shusshoTodokeDataset, sangoJidoTeateDataset, sangoIkukyuKyufuDataset]}
          today={todayJst()}
        />
      </>
    ),
  },
  "recipe-ninzuu-kansan": {
    ui: <RecipeNinzuuKansan />,
    formula: (
      <>
        <p>
          <strong>計算式</strong>
          ：倍率 ＝ 目標の人数 ÷ 元の人数。この倍率を、入力したすべての材料の分量に同じように掛けるだけの単純な比例計算です。材料ごとに違う倍率を使うことはありません。
        </p>
        <p>
          <strong>丸め処理</strong>
          ：計算結果をそのまま表示すると「3.333333…g」のような読みにくい数字になるため、単位の種類によって次のように丸めています。個・本・枚など個数で数える単位は整数（1刻み）、大さじ・小さじ・カップは0.5刻み、g・mlなどそれ以外の単位は小数第1位までに丸めます。丸めた結果が0になってしまう場合は、表示上「消えてしまう材料」が出ないよう、それぞれの丸め幅の最小値（個数系なら1）まで引き上げて表示します。
        </p>
        <p>
          本ツールは金額・制度・医療のいずれにも関わらない、分量の比例計算のみを行う生活の目安ツールです。公的機関の統計・制度データへの依存はありません。
        </p>
        <p>
          <strong>
            調味料や香辛料、加熱時間・加熱方法は人数分そのまま倍にすると味や仕上がりが変わることがあります。
          </strong>
          特に大人数の調理では、塩分などを人数分そのまま倍にすると味が濃くなりすぎることが知られています。本ツールは分量の比例計算のみを行い、加熱時間や調理方法の調整は行わないため、実際に作る際は味見をしながら調整してください。
        </p>
      </>
    ),
  },
  "hoikuen-omukae-gyakusan": {
    ui: <HoikuenOmukaeGyakusan />,
    formula: (
      <>
        <p>
          <strong>退勤限界時刻</strong>
          ：「お迎え締切時刻 − 職場から保育園までの移動時間 − 退勤後の準備時間（バッファ）」で計算します。この時刻より後に退勤すると、お迎え締切に間に合わない可能性がある、という目安です。
        </p>
        <p>
          <strong>実労働可能時間</strong>
          ：出勤時刻（勤務開始時刻）を入力した場合のみ、「退勤限界時刻 − 出勤時刻」で計算します。
        </p>
        <p>
          <strong>朝、保育園を出発する目安時刻（参考）</strong>
          ：出勤時刻を入力した場合、「出勤時刻 − 保育園から職場までの移動時間」で計算し、参考情報として表示します。この値がマイナスになる場合（出勤時刻までに間に合わない場合）は、退勤限界時刻・実労働可能時間の結果はそのまま表示しつつ、この項目のみ「算出できません」と表示します。
        </p>
        <p>
          このツールは制度・統計データに一切依存せず、入力された時刻の加減算のみを行います。日をまたぐ計算（夜勤等）は対象外で、退勤限界時刻が0:00より前になる場合や、実労働可能時間が負になる場合はエラーとして表示します。
        </p>
        <p>{HOIKUEN_OMUKAE_DISCLAIMER}</p>
      </>
    ),
  },
  "shou1-kabe-kinmu-simulation": {
    ui: <Shou1KabeKinmuSimulation />,
    formula: (
      <>
        <p>
          <strong>子どもが一人になる時間</strong>
          ：「子どもが学童から自宅に着く時刻（学童の閉所時刻＋学童から自宅までの移動時間）」と「親が自宅に着く時刻（退勤時刻＋退勤後の準備時間＋職場から自宅までの移動時間）」を計算し、後者から前者を引いた時間です。親の帰宅が子どもの帰宅と同時かそれより早ければ0分になります。
        </p>
        <p>
          <strong>子どもを一人にしないための退勤限界時刻（参考）</strong>
          ：「学童の閉所時刻＋学童から自宅までの移動時間 − 退勤後の準備時間 − 職場から自宅までの移動時間」で計算します。この時刻より後に退勤すると、子どもの帰宅と入れ違いになり一人になる時間が生じる、という目安です。移動時間・準備時間が長すぎて0時より前になる場合は「算出できません」と表示しますが、その場合も「子どもが一人になる時間」の計算自体は止めません。
        </p>
        <p>
          <strong>実労働可能時間（参考）</strong>
          ：出勤時刻を入力した場合のみ、「退勤限界時刻 − 出勤時刻」で計算します。退勤限界時刻が算出できない場合や、出勤時刻が退勤限界時刻より後になる場合はこの項目のみ表示しません。
        </p>
        <p>
          <strong>★学童の開所・閉所時刻は入力していただく必要があります★</strong>
          ：学童保育（放課後児童健全育成事業）の開所時間について、国の基準（放課後児童健全育成事業の設備及び運営に関する基準・第18条）は「休業日は1日8時間以上、平日は1日3時間以上を原則として当該事業所ごとに定める」という時間数の下限を示すのみで、具体的な開所・閉所の時刻は定めていません。しかもこの基準自体が令和2年4月1日以降、市町村が条例を定める際に参考にすべき「参酌基準」であり、全国一律に適用される確定した時刻は存在しません。そのため本ツールは、閉所時刻の全国一律値を用意せず、ご自身が利用する学童の閉所時刻を入力していただく設計にしています。退勤が学童の閉所時刻より遅い場合も、それ自体をエラーにはせず、実際に生じる一人時間をそのまま計算して表示します（これが「小1の壁」として可視化したい本来のケースです）。
        </p>
        <p>
          参考情報として、制度上の対象学年（{GRADE_RANGE_LABEL}）、支援の単位（クラスに相当）の定員（おおむね{SUPPORT_UNIT_MAX_CHILDREN}人）、待機児童数（全国合計{WAITING_CHILDREN_TOTAL.toLocaleString("ja-JP")}人、学年別。令和7年5月1日現在で最多は小学4年生の5,589人）を、判定結果とは独立した情報として画面内に表示します。
        </p>
        <p>{SHOU1_KABE_DISCLAIMER}</p>
        <SeidoNotice datasets={[shou1KabeGakudouHoikuDataset]} today={todayJst()} />
      </>
    ),
  },
  "renji-watt-kansan": {
    ui: <RenjiWattKansan />,
    formula: (
      <>
        <p>
          <strong>基本式</strong>：電子レンジは、電力（ワット数）と加熱時間の積（＝投入するエネルギーの量）がほぼ一定になるという考え方に基づき、
          <code>変更後の加熱時間 = 元の加熱時間 × 元のワット数 ÷ 変更後のワット数</code>
          で目安の時間を計算します。たとえば500Wで120秒（2分）加熱するレシピを600Wで作る場合、120×500÷600＝100秒（1分40秒）が目安です。
        </p>
        <p>
          <strong>出典と、出典の限界（正直な開示）</strong>
          ：この基本式自体は特定の官公庁が公式に算出・公表したものではなく、電力とエネルギーに関する一般的な物理原理に基づく目安です。
          換算表の実例値は{RENJI_KANZAN_SOURCE.org}（{RENJI_KANZAN_SOURCE.sourceUrl}）のPDF「レンジ出力換算表」を参照していますが、
          同PDF内には出典として宝島社のムック本「デリッシュキッチン 驚きの電子レンジおかず」が明記されており、
          上尾市自身が独自に算出・保証した一次情報ではなく市販書籍からの転載です。
          消費者庁・国民生活センター・厚生労働省・農林水産省を横断的に調査しましたが、これらの府省庁・独立行政法人のサイト上に
          「500W/600Wの換算表」そのものを掲載した一次情報ページは見つかりませんでした。
          ただし同PDFの数値は基本式で算出した理論値と10秒単位でおおむね一致することを確認できたため、目安値として採用しています
          （最終確認日: {RENJI_KANZAN_SOURCE.lastVerified}）。
        </p>
        <p>
          <strong>換算はあくまで目安です。</strong>
          機種や食品の量・形、庫内構造（フラット式／ターンテーブル式）によって実際に必要な時間は変わります。
          加熱不足は食中毒のリスクに、加熱しすぎは発火や容器破損のリスクにつながるため、
          初回は換算値より短めに設定し、様子を見ながら少しずつ追加で加熱することをおすすめします。
        </p>
      </>
    ),
  },
  "gakudou-kabe-dandori-check": {
    ui: <GakudouKabeDandoriCheck />,
    formula: (
      <>
        <p>
          <strong>時期区分の考え方</strong>
          ：入学（予定）年度と今日の日付から4月始まりの年度差（学年オフセット）を計算します。年度差が0〜5なら入学済み（小学
          1〜6年生）、負の値なら就学前です。就学前の場合はさらに、入学前年の9月1日を境に「入学前年の秋頃」、翌1月1日を境に「入学直前」と細分し、それより前は「入学まで時間があります（情報収集期）」として扱います。年度差が6以上（入学から7年以上経過）は、本ツールが対象とする学年（小学生）を超えているものとして扱います。
        </p>
        <p>
          <strong>チェックリストの内容について</strong>
          ：「入学前年の秋頃までに」「入学直前（年明け〜3月）に」「入学後に」の3つの区分は、一般的に広く知られている学童保育利用の段取りをまとめた自前のリストです。総務省統計局の調査のような公的な統計データや、法令で定められた基準に基づくものではありません。今の時期に近い区分には目印を付けて表示しますが、他の区分も参考として常に表示し続けます。
        </p>
        <p>
          <strong>★開所時間・締切日について（データの限界）★</strong>
          ：学童保育（放課後児童健全育成事業）の基準は、令和2年4月1日の第9次地方分権一括法により、職員配置を含む全ての項目が市町村が条例を定めるに当たっての「参酌すべき基準」となっており、国が直接強制する全国一律の最低基準ではありません。開所時間は国の基準で休業日
          {GAKUDOU_OPENING_HOURS_STANDARD.schoolHolidayMinHours}
          時間以上・平日{GAKUDOU_OPENING_HOURS_STANDARD.schoolDayMinHours}
          時間以上・年間{GAKUDOU_OPENING_HOURS_STANDARD.minDaysPerYear}
          日以上を原則としていますが、具体的な開所・閉所の時刻は「当該事業所ごとに定める」とされ、申込締切日にいたってはそもそも国の基準に規定がありません。そのため本ツールは、具体的な時刻・締切日を一切生成せず、「入学前年の秋頃」「入学直前」「入学後」という粒度の粗い時期区分のみを示します。
        </p>
        <p>
          対象学年は{GAKUDOU_GRADE_RANGE_LABEL}
          で、1つの「支援の単位」の定員はおおむね{GAKUDOU_SUPPORT_UNIT_MAX_CHILDREN}
          人が国の参酌基準です。令和7年5月1日現在、学童保育を利用できなかった児童（待機児童）は全国で
          {GAKUDOU_WAITING_CHILDREN_TOTAL.toLocaleString("ja-JP")}
          人、学年別では小学{GAKUDOU_WAITING_CHILDREN_PEAK_GRADE}年生が
          {GAKUDOU_WAITING_CHILDREN_BY_GRADE[GAKUDOU_WAITING_CHILDREN_PEAK_GRADE].toLocaleString(
            "ja-JP",
          )}
          人と最多です（低学年優先の選考による「小4の壁」）。ただし同年10月1日時点の速報値では
          {GAKUDOU_WAITING_CHILDREN_OCT_PROVISIONAL.toLocaleString("ja-JP")}
          人まで減少しており、年度途中に空きが出る実態もあわせて示しています（速報値であり確定値ではありません）。
        </p>
        <SeidoNotice datasets={[gakudouHoikuDataset]} today={todayJst()} />
      </>
    ),
  },
  "josei-kenshin-schedule": {
    ui: <JoseiKenshinSchedule />,
    formula: (
      <>
        <p>
          生年月日から満年齢（誕生日を迎えた日から加齢する日常的な数え方）を計算し、子宮頸がん検診（20歳以上）・乳がん検診（40歳以上）・胃がん検診（50歳以上）・肺がん検診（40歳以上）・大腸がん検診（40歳以上）・特定健康診査（40〜74歳）・後期高齢者健診（原則75歳以上）の7つについて、年齢がしきい値に達しているかを判定します。達していれば「対象」、上限（特定健診の74歳）を超えていれば「対象外」、達していなければ「あと◯年で対象」と表示します。対象年齢のしきい値はすべて厚生労働省の指針・法令が定める数値で、コードに数値を直書きせず、指針の原文（例:「50歳以上」）から抽出しています。
        </p>
        <p>
          <strong>子宮頸がん検診は受診間隔が2通りあります。</strong>
          子宮頸部の細胞診（20歳以上が対象）は2年に1回、HPV検査単独法（30歳以上が対象）は5年に1回です。どちらの方式を採用するかは市区町村ごとに異なり、HPV検査単独法は陽性の場合にトリアージ検査、トリアージ検査が陰性でも翌年度に追跡検査が必要になることがあります。「子宮頸がん検診は2年に1回」と一律には書かず、両方の間隔を併記しています。
        </p>
        <p>
          胃がん検診は原則「50歳以上・2年に1回」ですが、胃部エックス線検査（バリウム）に限り、当分の間「40歳以上・年1回」も指針上認められています。本ツールの対象判定は原則（50歳以上）を基準にしており、この例外は注記のみで表示します。肺がん検診の検診項目は「質問（問診）」と「胸部エックス線検査」です。令和7年12月24日の指針改正で、それまで含まれていた喀痰細胞診が検診項目から削除されています。
        </p>
        <p>
          特定健康診査は40〜74歳が対象で、75歳になると対象から外れ、後期高齢者健診に切り替わります。特定健診の実施主体は加入する医療保険者、後期高齢者健診の実施主体は後期高齢者医療広域連合で、がん検診の実施主体（市区町村）とは異なります。本ツールは誕生日基準の満年齢で判定する簡易実装のため、特定健診が本来使う「当該年度において40〜74歳に達する加入者」という年度単位の年齢とは、誕生日の前後で数か月ずれることがあります。
        </p>
        <p>{UNDER_TREATMENT_EXCLUSION_NOTE}</p>
        <p>{COMPREHENSIVE_SCREENING_NOTE}</p>
        <p>
          <strong>
            本ツールが行うのは、指針・法令が定める対象年齢のしきい値と満年齢を比較する年齢判定のみです。
          </strong>
          実際に受けられる検診の種類・自己負担額・案内方法はお住まいの市区町村・加入する医療保険者によって異なり、受診の要否や結果の判断といった医学的な判断は一切行いません。必ずお住まいの市区町村・医療保険者の案内を優先してください。
        </p>
      </>
    ),
  },
  "part-shift-shunyuu-keisan": {
    ui: <PartShiftShunyuuKeisan />,
    formula: (
      <>
        <p>
          <strong>月収・年収の換算</strong>
          ：時給・週の勤務日数・1日の勤務時間から「時給×1日の勤務時間×週の勤務日数×52週」で年収を換算します
          （1か月あたりの週数は4〜5週で変動するため、年52週で年収を出してから12で割ることで、月による凸凹を均した平均月収を出しています）。
          シフト表から分かる月収を直接入力することもできます（この場合は月収×12で年収を換算します）。
        </p>
        <p>
          <strong>壁の判定はすべて既存の「扶養の壁シミュレーター2026」に委譲</strong>
          ：103/106/130/150万円等の壁の金額・税額計算・社会保険の加入判定は、本ツールでは一切再計算せず、
          Q3-18で検収済みの計算ロジック（<code>evaluateWalls</code>・<code>judgeShaho</code>・
          <code>judgeDependent</code>）をそのまま呼び出しています。本ツールが担当するのは、
          シフトの入力から年収見込みを換算する部分のみです。
        </p>
        <p>
          <strong>通勤手当の扱い（シフト制特有の注意点）</strong>
          ：106万円の壁（勤務先の社会保険に入るかどうか）は、通勤手当・賞与・残業代を含まない
          「所定内賃金」で判定されます。一方、130万円の壁（扶養から外れるかどうか）は、通勤手当・賞与を含む
          全ての収入で判定されます。本ツールは、通勤手当を任意入力とし、106万円の壁の判定には含めず、
          130万円等の壁の判定にのみ含めることで、この違いを反映しています。
        </p>
        <p>
          <strong>月々の実務目安</strong>
          ：年収130万円という基準を12で割った「月額108,333円」を、シフト制の月々の収入管理の目安として表示します。
          暦年の合計ではなく、認定時点から将来1年間の見込み収入で判定されるため、月々の水準を保つ管理が実務上の基本です。
        </p>
        <SeidoNotice datasets={[partShiftKabeDataset, fuyoKabeDataset]} today={todayJst()} />
      </>
    ),
  },
  "kaigo-service-gyaku-hiki": {
    ui: <KaigoServiceGyakuHiki />,
    formula: (
      <>
        <p>
          <strong>逆引きの仕組み</strong>
          ：あらかじめ用意した10種類の「困りごと」と17種類の介護保険サービスの対応表から、選んだ困りごとに該当するサービスを集めて表示しているだけです。複数の困りごとに共通するサービスは1件にまとめて表示します（例:
          「日中一人が心配」と「相談したい」はどちらも居宅介護支援に該当するため、重複せず1件で表示されます）。
        </p>
        <p>
          <strong>サービス名・分類の出典について（正直な開示）</strong>
          ：<code>data/seido/kaigo-hoken.json</code> を精査した結果、このファイルは利用者負担割合・区分支給限度基準額・高額介護サービス費・補足給付など
          <strong>費用計算のためのデータ</strong>
          で構成されており、訪問介護・通所介護・短期入所生活介護といった
          <strong>サービス種類の名称・分類を一覧化したカタログは含まれていません</strong>
          。そのため本ツールが表示するサービス名・概要・分類は、
          <strong>介護保険法第8条・第8条の2・第45条が定める類型に基づく一般的な整理</strong>
          であり、e-Gov法令検索の法令APIで条文（第8条第2項〜第13項・第24項・第26項〜第29項）を機械照合しています。住宅改修（第45条）は条項の存在は確認できましたが、支給限度額などの具体的な金額は本ツールの制作時点で条文全文を照合できなかったため、金額を書かず「限度額がある」という説明にとどめています。
        </p>
        <p>
          <strong>kaigo-hoken.jsonから実際に引用している部分</strong>
          ：要介護度の区分（非該当・要支援1・2・要介護1〜5）と、区分支給限度基準額（1か月に利用できる金額の上限。要介護度別の単位数・円換算）の2点のみです。これらは逆引き結果（サービス名の一覧）とは独立した参考情報として画面下部に表示しています。
        </p>
        <p>
          <strong>断定しないこと</strong>
          ：「このサービスを使えば必ず解決する」という保証ではなく、あくまで一般的な対応の目安です。実際にどのサービスをどれだけ使えるかは要介護度・お住まいの地域・事業所の空き状況などで変わるため、実際の利用にあたっては担当のケアマネジャーやお住まいの市区町村・地域包括支援センターへの相談が必要です。訪問介護・通所介護は、要支援1・2の方については市町村の地域支援事業（介護予防・日常生活支援総合事業）として提供され内容が市町村ごとに異なる場合があるため、この点も断定的に判定していません。
        </p>
        <SeidoNotice datasets={[kaigoServiceGyakuHikiDataset]} today={todayJst()} />
      </>
    ),
  },
  "josei-tekisei-taijuu-shihyou": {
    ui: <JoseiTekiseiTaijuuShihyou />,
    formula: (
      <>
        <p>
          <strong>BMI（体格指数）の計算式</strong>
          ：BMI = 体重(kg) ÷ 身長(m)の2乗（身長はcmではなくmで計算します）。厚生労働省
          e-ヘルスネットが紹介する、国際的に用いられている指数です。
        </p>
        <p>
          <strong>肥満度分類（低体重〜肥満4度）</strong>
          ：日本肥満学会が定める分類です。18.5未満は「低体重（やせ）」、18.5以上25.0未満は「普通体重」、
          25.0以上30.0未満は「肥満（1度）」、30.0以上35.0未満は「肥満（2度）」、35.0以上40.0未満は「肥満（3度）」、
          40.0以上は「肥満（4度）」です（境界値ちょうどは上位側の区分に含まれます）。日本の基準はWHOの基準（30以上を
          Obese）とは異なります。
        </p>
        <p>
          <strong>標準体重の計算基準（BMI22）</strong>
          ：標準体重(kg) = 身長(m)の2乗 × 22。日本肥満学会がもっとも疾病の少ないBMIとして標準体重の計算に用いる基準値であり、
          個人の「理想体重」として提示するものではありません。
        </p>
        <p>
          <strong>目標とするBMIの範囲（年齢を入力した場合のみ）</strong>
          ：厚生労働省「日本人の食事摂取基準（2025年版）」表1（18歳以上が対象）に基づき、18〜49歳は18.5〜24.9、
          50〜64歳は20.0〜24.9、65〜74歳・75歳以上は21.5〜24.9と年齢によって範囲が変わります。この範囲は
          「エネルギー収支バランスの維持を示す指標」として設定されたものであり、肥満・やせの医学的な「判定」基準
          ではありません。18歳未満はこの表の対象外のため判定しません。
        </p>
        <p>
          <strong>妊娠中の体重増加指導の目安について</strong>
          ：現在の肥満度分類に対応する、こども家庭庁「妊娠前からはじめる妊産婦のための食生活指針 解説要領」表8の
          目安（日本肥満学会の肥満度分類に準じた4区分）を参考情報として1行のみ表示します。医師が指導を行うときの
          目安であり個人差を考慮した指導が必要なため、妊娠週数や目標体重の専用計算は行いません（妊娠中の体重増加を
          詳しく調べたい場合は別のツールをご利用ください）。
        </p>
        <p>{TEKISEI_TAIJUU_DISCLAIMER}</p>
      </>
    ),
  },
  "ninshin-taiju-zoka-checker": {
    ui: <NinshinTaijuZokaChecker />,
    formula: (
      <>
        <p>
          <strong>妊娠前BMIの計算式</strong>
          ：妊娠前BMI = 妊娠前の体重(kg) ÷ 妊娠前の身長(m)の2乗（身長はcmではなくmで計算します）。こども家庭庁
          「妊娠前からはじめる妊産婦のための食生活指針 解説要領」表8が妊娠前の体格の区分に用いる式です。
        </p>
        <p>
          <strong>体重増加指導の目安（表8・4区分）</strong>
          ：妊娠前BMIが18.5未満（低体重）は12〜15kg、18.5以上25.0未満（普通体重）は10〜13kg、
          25.0以上30.0未満（肥満1度）は7〜10kgが目安です（境界値ちょうどは上位側の区分に含まれます）。
          普通体重の中でも低体重に近いBMIの方は、目安の上限側（13kg）を参考にするとされています。
        </p>
        <p>
          <strong>肥満（2度以上・BMI30.0以上）は個別対応です</strong>
          ：こども家庭庁の資料では、この区分の体重増加量は数値のレンジではなく「個別対応」（上限5kgまでが目安）
          とされています。本ツールはこの区分について自動計算した目安・比較結果を一切表示せず、現在の増加量の実測値
          （現在の体重−妊娠前の体重）のみを提示したうえで、担当の産科医への相談を案内します。
        </p>
        <p>
          <strong>現在の増加量との比較</strong>
          ：現在の増加量(kg) = 現在の体重(kg) − 妊娠前の体重(kg)を、上記の目安レンジと比較し、「目安の範囲より少ない／範囲内／範囲より多い」の3値のいずれかを表示します。数値の大小を伝えるのみで、「食べ過ぎです」「もっと増やしてください」といった指導・断定は行いません。
        </p>
        <p>{NINSHIN_TAIJU_PREGNANCY_GAIN_CAUTION}</p>
        <p>{NINSHIN_TAIJU_GAIN_GUIDANCE_FOOTNOTE}</p>
        <p>
          {NINSHIN_TAIJU_APPLICABILITY_NOTE}
          （多胎（双子など）の場合の目安値は本ツールでは扱っていません。）
        </p>
      </>
    ),
  },
  "pms-yosoku-calendar": {
    ui: <PmsYosokuCalendar />,
    formula: (
      <>
        <p>
          <strong>次回月経開始予定日・黄体期の起点</strong>
          ：生理周期・排卵日予測（Q3-03）と同じ計算関数（calcSeiriShuki）をそのまま呼び出し、独自の周期計算は行いません。次回の月経開始予定日から黄体期の標準日数（約14日）を遡って黄体期の開始（排卵予測日）とし、月経開始前日までを黄体期の終了としています。
        </p>
        <p>
          <strong>PMS症状が出やすいとされる時期の目安</strong>
          ：{PMS_DEFINITION_TEXT}（日本産婦人科学会の定義）。この定義に基づき、黄体期間のうち後半（月経開始の10日前〜3日前）を「PMS症状が出やすいとされる時期の目安」として表示します。
        </p>
        <p>
          <strong>PMSの有病率</strong>
          ：PMSは月経がある女性の{PMS_PREVALENCE_FROM_PERCENT}〜{PMS_PREVALENCE_TO_PERCENT}
          %に起こるとされています（厚生労働省事業「女性の健康推進室 ヘルスケアラボ」出典）。症状の出方には個人差があり、この目安がすべての人に当てはまるわけではありません。
        </p>
        <p>
          <strong>医療判断は行いません</strong>
          ：本ツールが行うのは黄体期・PMSの定義に基づく日付計算のみで、症状の有無・重さの診断は一切行いません。記録機能もなく、入力値・結果は保存されずその場での計算のみです。{PMS_DISCLAIMER}
        </p>
      </>
    ),
  },
  "akachan-suimin-gyakusan": {
    ui: <AkachanSuiminGyakusan />,
    formula: (
      <>
        <p>
          <strong>赤ちゃん・お子さまの推定睡眠時間（参考）</strong>
          ：就寝予定時刻から起床予定時刻までの時間です。起床予定時刻の「時:分」が就寝予定時刻の「時:分」以下の場合は、日をまたぐ（翌日の起床）とみなして24時間を加算します。1〜2歳（11〜14時間）・3〜5歳（10〜13時間）・小学生（9〜12時間）・中学高校生（8〜10時間）の4区分は、厚生労働省「健康づくりのための睡眠ガイド2023」が米国睡眠医学会の推奨として紹介している値と比較し、目安より短め・範囲内・長めのいずれかを参考表示します。1歳未満は、同ガイドに時間数の記載がないため比較を行いません。
        </p>
        <p>
          <strong>保護者の就寝時刻の目安</strong>
          ：「赤ちゃん・お子さまの起床予定時刻 − 保護者自身の必要睡眠時間 − 寝かしつけ・夜泣き対応等にかかる時間」で計算します。保護者は赤ちゃん・お子さまの起床予定時刻に合わせて自身も起床する、という前提の逆算です。必要睡眠時間の初期値6時間は、同ガイドの成人の目安「6時間以上を目安として必要な睡眠時間を確保する」に基づく初期値で、編集できます。
        </p>
        <p>
          必要睡眠時間と寝かしつけ・夜泣き対応の時間の合計が、赤ちゃん・お子さまの就寝〜起床の時間枠を超える場合は、計算結果をそのまま表示したうえで、時間枠が窮屈である可能性がある旨を注意書きとして表示します（エラーにはしません）。
        </p>
        <p>{AKACHAN_SUIMIN_DISCLAIMER}</p>
      </>
    ),
  },
};

export function generateStaticParams() {
  return getLiveTools().map((t) => ({ slug: t.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = getLiveTools().find(t => t.slug === slug);
  if (!tool) return {};
  return { 
    title: tool.title, 
    description: tool.description,
    robots: { index: false, follow: false }
  };
}

export default async function ToolStandalonePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = getLiveTools().find(t => t.slug === slug);
  const impl = tool && implementations[tool.slug];
  if (!tool || tool.status !== "live" || !impl) notFound();

  return (
    <article>
      <h1 className="text-xl font-bold sm:text-2xl">{tool.title}</h1>
      <p className="mt-2 text-ink-muted">{tool.description}</p>

      <div className="mt-6">{impl.ui}</div>

      <SectionHeading id="formula">根拠・計算式</SectionHeading>
      <div className="space-y-3 text-sm sm:text-base">{impl.formula}</div>

      <SourceList
        sources={tool.sources}
        basisYear={tool.basisYear}
        updated={tool.updated}
      />
    </article>
  );
}
