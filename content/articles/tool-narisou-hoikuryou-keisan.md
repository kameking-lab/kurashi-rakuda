---
{
  "id": "tool-narisou-hoikuryou-keisan",
  "title": "保育料はどう決まる？世帯年収別の計算のしくみ",
  "summary": "認可保育所の保育料は世帯の市町村民税所得割額をもとに、自治体ごとの金額表にあてはめて決まる。3〜5歳児クラスは無償化で0円になり、金額差が出るのは主に0〜2歳児クラス。",
  "type": "tool-narisou",
  "category": "子育て",
  "tool_ref": "hoikuryo",
  "persona": "ペルソナ2: 田中絵里（36歳・ワーママ・時短勤務）",
  "revision_year": 2026,
  "sources": [
    { "url": "https://www.city.osaka.lg.jp/kodomo/page/0000501253.html", "title": "令和8年度 保育施設等の保育料のお知らせ", "org": "大阪市こども青少年局", "accessed": "2026-07-17" },
    { "url": "https://www.city.yokohama.lg.jp/kosodate-kyoiku/hoiku-yoji/shisetsu/riyou/riyouryo/riyouryosantei/default20190319.html", "title": "利用料（保育料）および副食費の免除対象の決定方法", "org": "横浜市こども青少年局", "accessed": "2026-07-17" },
    { "url": "https://www.cfa.go.jp/policies/kokoseido/mushouka", "title": "幼児教育・保育の無償化", "org": "こども家庭庁", "accessed": "2026-07-17" }
  ],
  "facts": [
    { "key": "mushouka.age_3", "value": 3, "unit": "歳", "seido_ref": "youji-kyouiku-mushouka.json#data.targetAges.freeForAllFrom.value", "status": "verified" },
    { "key": "mushouka.age_5", "value": 5, "unit": "歳", "seido_ref": "youji-kyouiku-mushouka.json#data.targetAges.freeForAllTo.value", "status": "verified" },
    { "key": "mushouka.age_0", "value": 0, "unit": "歳", "seido_ref": "youji-kyouiku-mushouka.json#data.targetAges.nonTaxableFrom.value", "status": "verified" },
    { "key": "mushouka.age_2", "value": 2, "unit": "歳", "seido_ref": "youji-kyouiku-mushouka.json#data.targetAges.nonTaxableTo.value", "status": "verified" },
    { "key": "hoikuryo.osaka_tier4_under3", "value": 10100, "unit": "円", "seido_ref": "hoikuryo/osaka-osaka.json#tiers.3.fees.under3.standard", "status": "verified" },
    { "key": "hoikuryo.yokohama_tierD2_under3", "value": 10000, "unit": "円", "seido_ref": "hoikuryo/kanagawa-yokohama.json#tiers.4.fees.under3.standard", "status": "verified" },
    { "key": "hoikuryo.osaka_age3plus_free", "value": 0, "unit": "円", "seido_ref": "hoikuryo/osaka-osaka.json#tiers.0.fees.age3plus.standard", "status": "verified" }
  ],
  "last_updated": "2026-07-17",
  "next_check_due": "2026-10-01"
}
---

# 保育料はどう決まる？世帯年収別の計算のしくみ

## この記事はどのツールと対応している？

この記事は「保育料いくら？計算ツール」と対応しています。お住まいの自治体（対応12自治体）と世帯の課税状況・市町村民税所得割額・お子さんの年齢などを選ぶと、自治体が公表している階層表そのものから該当する月額を表示します（推測した目安金額は表示しません）。

## 計算の考え方

認可保育所の保育料は、世帯の「年収」そのものではなく、世帯の市町村民税所得割額をもとに決まります。おおまかな流れは次のとおりです。

1. 保護者等の市町村民税所得割額を世帯で合算する
2. 合算額がどの「階層」（区分）にあたるかを、自治体が定めた金額表にあてはめる
3. 子どもの年齢区分（0〜2歳児クラスか、3〜5歳児クラスか）ごとに、その階層に対応する月額を確認する

3歳から5歳児クラスは幼児教育・保育の無償化により、原則としてすべての世帯で保育料が0円になります。実際に金額差が出るのは主に0歳から2歳児クラスです。

ここが重要なポイントですが、階層の区分方法・金額そのものは自治体ごとに独自に定められており、全国共通の金額表は存在しません。たとえば市町村民税所得割額がおおむね同じくらいの世帯でも、大阪市では月10,100円、横浜市では月10,000円というように、自治体によって金額が異なります。同じ所得の世帯でも、住んでいる自治体が変われば保育料も変わるということです。

さらに、第2子・第3子以降の軽減や、自治体独自の無償化施策（対象年齢や所得の条件は自治体ごとに差が大きい）もあるため、正確な金額は必ずお住まいの自治体の最新の金額表で確認する必要があります。

## 結果の読み方

計算ツールの結果は、入力した市町村民税所得割額を、選択した自治体の金額表にあてはめた月額の目安です。実際の決定額は、次のような理由でツールの試算と異なる場合があります。

- 市町村民税の課税年度の切り替え時期（多くの自治体で9月に切り替わる）
- ひとり親世帯・障がい児のいる世帯向けの軽減措置
- きょうだいの人数・年齢のカウント方法（自治体ごとに独自ルールがある）
- 認定こども園・地域型保育事業など施設種別による金額表の違い

最終的な保育料は、自治体からの決定通知書の内容が優先されます。

## よくある疑問

- **年収がわかれば保育料が計算できる？** 保育料は年収そのものではなく市町村民税所得割額をもとに決まるため、年収が同じでも控除の状況によって所得割額が変わり、保育料も変わることがあります。
- **引っ越すと保育料は変わる？** 自治体ごとに金額表が異なるため、同じ所得割額でも転居先の自治体によって保育料が変わることがあります。

## 出典・根拠

- 大阪市こども青少年局「令和8年度 保育施設等の保育料のお知らせ」
- 横浜市こども青少年局「利用料（保育料）および副食費の免除対象の決定方法」
- こども家庭庁「幼児教育・保育の無償化」

---

最終更新日: 2026-07-17 ／ 準拠年度: 2026年度 ／ 出典: 上記「出典・根拠」参照

※本記事は一次情報をもとにした情報整理です。個別の状況については必ず最新の公式情報・窓口でご確認ください。
