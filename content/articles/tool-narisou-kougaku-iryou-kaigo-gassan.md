---
{
  "id": "tool-narisou-kougaku-iryou-kaigo-gassan",
  "title": "医療費と介護費を合算するといくら戻る？ チェック結果の読み方",
  "summary": "高額医療・高額介護合算療養費チェックが、年間の医療・介護の自己負担から支給見込額を求める考え方を解説します。世帯の範囲、計算順序、少額不支給にも触れます。",
  "type": "tool-narisou",
  "category": "介護",
  "tool_ref": "kougaku-iryou-kaigo-gassan",
  "persona": "ペルソナ5: 高橋京子（52歳・パート・親の介護が視野）",
  "solves": ["医療費と介護費を合わせると払い戻しがあるか知りたい", "年間限度額が分からない", "世帯として合算できる範囲が分からない", "医療と介護への按分結果を読みたい"],
  "revision_year": 2026,
  "sources": [
    { "url": "https://laws.e-gov.go.jp/law/419CO0000000318", "title": "高齢者の医療の確保に関する法律施行令", "org": "e-Gov法令検索（デジタル庁）", "accessed": "2026-07-18" },
    { "url": "https://www.kyoukaikenpo.or.jp/benefit/high_cost_medical_expenses/003/index.html", "title": "高額介護合算療養費", "org": "全国健康保険協会", "accessed": "2026-07-18" }
  ],
  "facts": [
    { "key": "gassan.limit_genekinami3", "value": 2120000, "unit": "円", "seido_ref": "kougaku-iryou-kaigo-gassan.json#data.brackets.kourei70plus.tiers[key=genekinami-3].limit", "status": "verified" },
    { "key": "gassan.limit_general", "value": 560000, "unit": "円", "seido_ref": "kougaku-iryou-kaigo-gassan.json#data.brackets.kourei70plus.tiers[key=ippan].limit", "status": "verified" },
    { "key": "gassan.limit_low1", "value": 190000, "unit": "円", "seido_ref": "kougaku-iryou-kaigo-gassan.json#data.brackets.kourei70plus.tiers[key=teishotoku-1].limit", "status": "verified" },
    { "key": "gassan.minimum_payment", "value": 501, "unit": "円", "seido_ref": "kougaku-iryou-kaigo-gassan.json#data.calculationRules.minimumPayment.value", "status": "verified" }
  ],
  "last_updated": "2026-07-18",
  "next_check_due": "2027-04-01",
  "audience": { "universal": false, "lifeStages": ["adult", "senior"], "lifeEvents": ["caregiving"], "childAgeBands": [], "gender": null }
}
---

# 医療費と介護費を合算するといくら戻る？ チェック結果の読み方

## この記事はどのツールと対応している？

本記事は[高額医療・高額介護合算療養費 チェック](/tools/care/kougaku-iryou-kaigo-gassan)に対応しています。1年間の医療保険と介護保険の対象自己負担、保険種別、年齢、所得区分から、基準額を超える支給額と医療・介護それぞれへの按分を試算します。制度全体は[高額医療・高額介護合算制度の解説](/guide/care/seido-kougaku-iryou-kaigo-gassan)も参照してください。

## 計算の考え方

計算期間は8月から翌年7月までです。先に高額療養費と高額介護サービス費を適用し、それらの支給額を除いた医療・介護の自己負担を合算します。合計から所得区分別の年間基準額を差し引いた額が支給見込額です。支給見込額は、医療と介護それぞれの対象自己負担の割合に応じて按分されます。

後期高齢者医療などの高齢者区分では、一般区分の基準額は560,000円、低所得Ⅰは190,000円、現役並みⅢは2,120,000円です。年齢や加入する医療保険によって使う表が異なるため、ツールでは保険種別と年齢を先に選びます。差額が501円未満なら支給されません。

ここで合算する「世帯」は同じ医療保険に加入する人の範囲です。同居の夫婦でも、一方が後期高齢者医療、もう一方が国民健康保険なら同じ計算単位にはできません。また、医療か介護の一方の対象自己負担がない場合もこの制度の対象外です。

## 結果の読み方

「年間基準額」は選択した年齢・保険・所得区分に対応する上限です。「支給見込額」は基準額を超えた合算額で、「医療分」「介護分」はその見込額を各負担の割合で分けたものです。実際には医療保険者と介護保険者がそれぞれ支給します。

入力する額は、高額療養費や高額介護サービス費の適用後である点が重要です。施設の食費・居住費、差額ベッド代など、各制度で対象外の費用は含めません。領収書の総額をそのまま入力すると過大な結果になります。

## よくある疑問

**同じ住所なら家族全員を合算できますか？** できません。同じ医療保険に加入していることが基準です。住民票上の世帯だけでは判断できません。

**毎月の上限と年間の合算はどちらを先に計算しますか？** 月ごとの高額療養費・高額介護サービス費が先で、その支給後に残る自己負担を年間で合算します。

**どこへ申請しますか？** 基準日である7月末時点に加入している医療保険者が原則の窓口です。期間中に保険が変わった場合は、以前の保険者や市区町村から自己負担額証明書を取り寄せることがあります。

## 出典・根拠

- e-Gov法令検索「高齢者の医療の確保に関する法律施行令」
- 全国健康保険協会「高額介護合算療養費」

---

最終更新日: 2026-07-18 ／ 準拠年度: 2026年度 ／ 出典: 上記「出典・根拠」参照

※本記事とツールは一次情報をもとにした目安です。加入履歴を含む支給可否・申請先は医療保険者と市区町村にご確認ください。
