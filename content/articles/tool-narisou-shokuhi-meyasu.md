---
{
  "id": "tool-narisou-shokuhi-meyasu",
  "title": "食費の目安はこう決まる — 世帯人員別・食費の目安計算ツールの結果の読み方",
  "summary": "世帯人員数を入力すると、総務省統計局「家計調査」の世帯人員別の実額データに基づいて、1か月あたりの食費（食料）の目安と、外食・調理食品などの内訳を計算する食費の目安計算ツールの考え方を解説する。",
  "type": "tool-narisou",
  "category": "お金",
  "tool_ref": "shokuhi-meyasu",
  "persona": "ペルソナ1: 佐藤美咲（32歳・専業主婦・子ども2人）",
  "solves": [
    "うちの食費が世間と比べて多いのか少ないのか分からない",
    "家族の人数が増えたら食費がどれくらい増えるのか目安が分からない",
    "食費のうち外食や惣菜がどれくらいの割合か知りたい"
  ],
  "revision_year": 2026,
  "sources": [
    { "url": "https://www.stat.go.jp/data/kakei/2.html", "title": "家計調査（家計収支編） 調査結果", "org": "総務省統計局", "accessed": "2026-07-17" },
    { "url": "https://www.stat.go.jp/data/kakei/sokuhou/tsuki/index.html#nen", "title": "家計調査報告 ―月・四半期・年―（2025年（令和7年）平均の項）", "org": "総務省統計局", "accessed": "2026-07-17" },
    { "url": "https://www.stat.go.jp/data/kakei/sokuhou/tsuki/pdf/fies_gaikyo2025.pdf", "title": "家計調査報告（家計収支編）2025年（令和7年）平均結果の概要（PDF）", "org": "総務省統計局", "accessed": "2026-07-17" }
  ],
  "facts": [
    {
      "key": "shokuhi-meyasu.tanshin_setai_ninzuu",
      "value": 1,
      "unit": "人",
      "status": "verified",
      "seido_ref": "shokuhi-meyasu.json#tanshin_setai.setai_ninzuu"
    },
    {
      "key": "shokuhi-meyasu.tanshin_shokuryou",
      "value": 44659,
      "unit": "円",
      "status": "verified",
      "seido_ref": "shokuhi-meyasu.json#tanshin_setai.shokuryou"
    },
    {
      "key": "shokuhi-meyasu.ninin_setai_ninzuu",
      "value": 2,
      "unit": "人",
      "status": "verified",
      "seido_ref": "shokuhi-meyasu.json#futari_ijou_setai.ninin.setai_ninzuu"
    },
    {
      "key": "shokuhi-meyasu.sannin_setai_ninzuu",
      "value": 3,
      "unit": "人",
      "status": "verified",
      "seido_ref": "shokuhi-meyasu.json#futari_ijou_setai.sannin.setai_ninzuu"
    },
    {
      "key": "shokuhi-meyasu.gonin_setai_ninzuu",
      "value": 5,
      "unit": "人",
      "status": "verified",
      "seido_ref": "shokuhi-meyasu.json#futari_ijou_setai.gonin.setai_ninzuu"
    },
    {
      "key": "shokuhi-meyasu.yonin_setai_ninzuu",
      "value": 4,
      "unit": "人",
      "status": "verified",
      "seido_ref": "shokuhi-meyasu.json#futari_ijou_setai.yonin.setai_ninzuu"
    },
    {
      "key": "shokuhi-meyasu.yonin_shokuryou",
      "value": 103384,
      "unit": "円",
      "status": "verified",
      "seido_ref": "shokuhi-meyasu.json#futari_ijou_setai.yonin.shokuryou"
    },
    {
      "key": "shokuhi-meyasu.yonin_gaishoku",
      "value": 20472,
      "unit": "円",
      "status": "verified",
      "seido_ref": "shokuhi-meyasu.json#futari_ijou_setai.yonin.gaishoku"
    },
    {
      "key": "shokuhi-meyasu.yonin_chouri_shokuhin",
      "value": 14133,
      "unit": "円",
      "status": "verified",
      "seido_ref": "shokuhi-meyasu.json#futari_ijou_setai.yonin.chouri_shokuhin"
    },
    {
      "key": "shokuhi-meyasu.rokunin_ijou_label",
      "value": 6,
      "unit": "人",
      "status": "stub",
      "stub_reason": "「6人以上」は総務省統計局の集計区分の呼称（ラベル）であり、data/tables/shokuhi-meyasu.json内に単一の生データノードとして格納された数値ではないため機械照合の対象外。実際の平均世帯人員は下記の shokuhi-meyasu.rokunin_ijou_heikin_ninzuu（6.3人）を参照"
    },
    {
      "key": "shokuhi-meyasu.rokunin_ijou_heikin_ninzuu",
      "value": 6.3,
      "unit": "人",
      "status": "verified",
      "seido_ref": "shokuhi-meyasu.json#futari_ijou_setai.rokunin_ijou.setai_ninzuu"
    }
  ],
  "last_updated": "2026-07-17",
  "next_check_due": "2027-02-15"
}
---

# 食費の目安はこう決まる — 世帯人員別・食費の目安計算ツールの結果の読み方

## この記事はどのツールと対応している？

本記事は「食費の目安計算（家族構成別）」ツール（shokuhi-meyasu）に対応しています。世帯人員数（何人家族か）を入力すると、総務省統計局「家計調査（家計収支編）」の世帯人員別の実額データに基づいて、ひと月あたりの食費（食料）の目安と、そのうち外食・調理食品（惣菜・弁当などの、いわゆる中食）の内訳を表示します。

## 計算の考え方

このツールは、入力された世帯人員数を、総務省統計局が実際に集計している区分（単身世帯・2人・3人・4人・5人・6人以上）のいずれかに当てはめ、その区分の実額をそのまま表示するだけのしくみです。独自の推計や補間は行いません。

区分の当てはめ方は次のとおりです。

- 世帯人員数が1人 → 単身世帯の区分（単身世帯は「二人以上の世帯」とは調査対象・集計方法が異なる、別の統計として公表されています）
- 2人・3人・4人・5人 → それぞれ「二人以上の世帯」のうち、同じ人数の区分
- 6人以上（七人・十人などを入力した場合も含む） → すべて「6人以上」という同じ区分の実額を表示

総務省統計局の統計表は世帯人員を「6人以上」までしか区分していません。そのため、七人・十人といった6人を超える人数を入力しても、按分や推計で新しい金額を作ることはせず、常に同じ「6人以上」区分の実額を表示します。この区分の実際の平均世帯人員は6.3人であり、入力した人数（たとえば七人）そのものの統計ではない点に注意が必要です。この場合はツールの画面にも、6人以上区分の実額をそのまま表示している旨の注記が出ます。

表示される金額は、区分ごとに次の4項目です。

- 消費支出：食費以外も含む生活費全体（参考情報）
- 食料：食費の目安（メインの表示項目）
- 外食：食料のうち、外食にあたる支出
- 調理食品：食料のうち、惣菜や弁当などのいわゆる中食にあたる支出

さらに、食料から外食と調理食品を差し引いた残り（食材の購入費・飲料・酒類などにあたる部分）を「その他」として画面に表示します。これは統計表に直接載っている項目ではなく、食料・外食・調理食品の3項目からその場で計算しているだけの内訳です。

たとえば単身世帯（1人）の区分では、食料は44,659円です。世帯人員が増えるほど食料の額も大きくなり、4人世帯の区分では食料は103,384円、そのうち外食が20,472円、調理食品が14,133円です。

なお、世帯構成（単身・夫婦のみ・夫婦と子どもなど）の違いは入力項目にしていません。総務省統計局の当該統計表は世帯人員数のみで区分されており、同じ人数でも世帯構成による実額の違いまでは、この統計からは分かりません。存在しない粒度のデータを推測で作らないという方針から、本ツールは世帯人員数のみを入力とし、世帯構成別の目安は提供していません。

## 結果の読み方

結果画面には「◯人世帯の食費（食料）の目安・ひと月」として、その区分の食料の額がまず表示されます。あわせて同じ区分の消費支出（生活費全体）の額も参考として示されますが、これは食費以外の支出も含む金額なので、食費だけを見たい場合は「食料」の欄を確認してください。

その下には「外食」「調理食品（惣菜・弁当など）」「その他（食材の購入・飲料・酒類など）」という食費の内訳が並びます。同じ食料の額でも、外食や中食の比率は世帯によって差があります。

入力した人数が6人を超える場合は、その旨の注記が表示されます。総務省統計局の集計自体が「6人以上」までしか区分していないためで、ツールの不具合ではありません。

そして常に、この金額は総務省統計局「家計調査」による世帯人員別の平均値（目安）であり、地域・生活スタイル・自炊の頻度などによって実際の食費は大きく異なる、という注記が表示されます。この金額はあくまで統計上の目安であり、この金額に合わせることを目指す必要はありません。表示された数字より多い・少ないからといって、家計の使い方が正しい・間違っているという意味ではありません。

## よくある疑問

**単身世帯の結果は、2人以上の世帯の結果と単純に比較できますか？** 単身世帯と二人以上の世帯は、総務省統計局が別々に調査・集計している統計です（単身世帯は約750世帯規模、二人以上の世帯は約8,000世帯規模の調査）。本ツールは「1人」の結果として単身世帯の実額をそのまま表示しますが、二人以上の世帯の人数別区分と技術的には同一の連続した系列ではない点は留意してください。

**0や、1.5のような小数を入力するとどうなりますか？** 入力エラーとして扱われ、結果は表示されません。世帯人員数は1人以上の整数で入力してください。

**この金額は今後も同じ水準ですか？** 表示される金額は2025年（令和7年）平均の実額であり、翌年以降の物価変動は反映していません。総務省統計局が次の「◯◯年平均」の結果を公表した際にデータを更新します。

## 出典・根拠

- 総務省統計局「家計調査（家計収支編） 調査結果」
- 総務省統計局「家計調査報告 ―月・四半期・年―」（2025年（令和7年）平均の項）
- 総務省統計局「家計調査報告（家計収支編）2025年（令和7年）平均結果の概要」（PDF）

---

最終更新日: 2026-07-17 ／ 準拠年度: 2026年度 ／ 出典: 上記「出典・根拠」参照

※本記事は一次情報をもとにした情報整理です。個別の状況については必ず最新の公式情報・窓口でご確認ください。表示される金額は総務省統計局「家計調査」による世帯人員別の平均値（目安）であり、個々の家庭の食費が同じ水準になることを意味しません。
