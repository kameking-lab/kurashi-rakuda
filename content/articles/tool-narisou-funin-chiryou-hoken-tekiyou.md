---
{
  "id":"tool-narisou-funin-chiryou-hoken-tekiyou","title":"不妊治療の保険適用・回数早見の使い方｜年齢は治療開始日で確認","summary":"不妊治療の保険適用・回数早見ツールで、43歳未満の年齢要件、40歳を境に変わる回数上限、3割負担の試算を確認する方法を解説します。","type":"tool-narisou","category":"妊娠・出産","tool_ref":"funin-chiryou-hoken-tekiyou","persona":"ペルソナ4: 鈴木奈々（34歳・妊活→プレママ）","solves":["年齢を受診日と治療開始日のどちらで判定するか分からない","胚移植の保険適用回数を確認したい","窓口負担の試算範囲を知りたい"],"revision_year":2026,
  "sources":[{"url":"https://www.mhlw.go.jp/content/000901931.pdf","title":"不妊治療に関する支援について（不妊治療の保険適用）","org":"厚生労働省","accessed":"2026-07-18"},{"url":"https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kodomo/kodomo_kosodate/boshi-hoken/funin-01_00004.html","title":"不妊治療に関する取組","org":"厚生労働省","accessed":"2026-07-18"}],
  "facts":[{"key":"funin.tool.age_limit","value":43,"unit":"歳","seido_ref":"funin-chiryou-hoken-tekiyou.json#data.ageRequirement.upperAgeLimit.value","status":"verified"},{"key":"funin.tool.age_boundary","value":40,"unit":"歳","seido_ref":"funin-chiryou-hoken-tekiyou.json#data.countLimit.ageBoundary.value","status":"verified"},{"key":"funin.tool.under40_limit","value":6,"unit":"回","seido_ref":"funin-chiryou-hoken-tekiyou.json#data.countLimit.under40Limit.value","status":"verified"},{"key":"funin.tool.40to43_limit","value":3,"unit":"回","seido_ref":"funin-chiryou-hoken-tekiyou.json#data.countLimit.age40To43Limit.value","status":"verified"},{"key":"funin.tool.copayment","value":0.3,"unit":"rate","seido_ref":"funin-chiryou-hoken-tekiyou.json#data.costSharing.copaymentRate.value","status":"verified"}],
  "last_updated":"2026-07-18","next_check_due":"2026-09-01","audience":{"universal":false,"lifeStages":["adult"],"lifeEvents":["pregnant"],"childAgeBands":[],"gender":null}
}
---

# 不妊治療の保険適用・回数早見の使い方｜年齢は治療開始日で確認

## この記事はどのツールと対応している？

本記事は[不妊治療 保険適用・回数 早見](/tools/pregnancy/funin-chiryou-hoken-tekiyou)に対応しています。治療開始時の年齢から生殖補助医療の年齢要件と胚移植の回数上限を確認し、任意で保険診療総額から窓口負担の目安を試算します。対象となる治療の範囲は[不妊治療の保険適用制度](/guide/pregnancy/seido-funin-chiryou-hoken-tekiyou)も参照してください。

## 計算の考え方

生殖補助医療は、治療開始日に女性が43歳未満であることが保険適用の年齢要件です。回数上限も治療開始時の年齢で分かれ、40歳未満なら子どもごとに6回、40歳以上43歳未満なら3回です。ツールは入力した治療開始日と生年月日の関係をこの区分に当てはめます。

費用を入力した場合、保険診療部分に自己負担割合0.3rateを掛けて計算します。先進医療など保険外の費用はこの計算の対象ではなく、総額をそのまま入力すると実際の窓口負担とずれるため、見積書の内訳を分けてください。

## 結果の読み方

結果では、年齢要件、今回の治療に適用される回数上限、これまでの胚移植回数を順に確認します。回数は採卵回数ではなく胚移植の回数で数えます。出産後は子どもごとに回数を数え直しますが、次の治療開始時点の年齢区分が改めて適用されます。治療計画の開始日や過去の回数に不明点がある場合は、医療機関が管理する記録で確認してください。高額療養費や先進医療の組み合わせは個別条件があるため、ツールだけで最終的な支払額は確定できません。

## 出典・根拠

- 厚生労働省「不妊治療に関する支援について（不妊治療の保険適用）」
- 厚生労働省「不妊治療に関する取組」

---
最終更新日: 2026-07-18 ／ 準拠年度: 2026年度

※適用可否と回数は治療計画・医療機関の記録に基づいて確認してください。
