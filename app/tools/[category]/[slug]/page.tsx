import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getLiveTools, getTool } from "@/app/lib/tools/registry";
import { ToolShell } from "@/components/tools/ToolShell";
import { ChomiryoKanzan } from "@/components/tools/impl/ChomiryoKanzan";
import { FuyoKabe } from "@/components/tools/impl/FuyoKabe";
import { Hoikuryo } from "@/components/tools/impl/Hoikuryo";
import { SeidoNotice } from "@/components/tools/SeidoNotice";
import { fuyoKabeDataset } from "@/lib/tools/impl/fuyo-kabe";
import { municipalities, toSeidoDataset } from "@/lib/tools/impl/hoikuryo";
import { todayJst } from "@/lib/tools/seido";

/**
 * ツール実装のマッピング。G2（Q3-01〜20）で実装が増えるたびにここへ1行追加し、
 * registry.json の status を "live" に変える。
 */
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
        <SeidoNotice datasets={municipalities.map(toSeidoDataset)} today={todayJst()} />
      </>
    ),
  },
};

export function generateStaticParams() {
  return getLiveTools().map((t) => ({ category: t.category, slug: t.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}): Promise<Metadata> {
  const { category, slug } = await params;
  const tool = getTool(category, slug);
  if (!tool) return {};
  return { title: tool.title, description: tool.description };
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const tool = getTool(category, slug);
  const impl = tool && implementations[tool.slug];
  if (!tool || tool.status !== "live" || !impl) notFound();

  return (
    <ToolShell meta={tool} formula={impl.formula}>
      {impl.ui}
    </ToolShell>
  );
}
