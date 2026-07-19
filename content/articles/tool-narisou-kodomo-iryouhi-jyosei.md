---
{
  "id": "tool-narisou-kodomo-iryouhi-jyosei",
  "title": "子ども医療費助成 自治体早見の見方 — 全国傾向と自分の自治体を切り分ける",
  "summary": "学齢と通院・入院の別から、医療費助成の対象年齢、所得制限、一部自己負担の全国傾向を確認するツールの使い方と、自治体確認が必要な範囲を解説します。",
  "type": "tool-narisou",
  "category": "子育て",
  "tool_ref": "kodomo-iryouhi-jyosei",
  "persona": "ペルソナ1: 佐藤美咲（32歳・専業主婦・子ども2人）",
  "solves": ["子どもの学齢が全国ではどこまで助成対象になっているか知りたい", "通院と入院の傾向を分けて確認したい", "全国傾向と自治体の実際の条件を混同せず読みたい"],
  "revision_year": 2026,
  "sources": [
    { "url": "https://www.cfa.go.jp/policies/boshihoken/kodomoiryouhityousa-r7", "title": "令和7年度こどもに係る医療費の助成についての調査", "org": "こども家庭庁", "accessed": "2026-07-18" },
    { "url": "https://www.cfa.go.jp/assets/contents/node/basic_page/field_ref_resources/6a9b8926-411c-4044-81aa-d8c26b21aaf5/39db7d2e/20251224policies-boshihoken-kodomoiryouhityousa-r7-01.pdf", "title": "同調査 別紙1", "org": "こども家庭庁", "accessed": "2026-07-18" }
  ],
  "facts": [
    { "key": "child_medical.total_municipalities", "value": 1741, "unit": "市区町村", "seido_ref": "kodomo-iryouhi-jyosei.json#data.nationalCoverage.totalMunicipalities.value", "status": "verified" },
    { "key": "child_medical.muni_outpatient_age18", "value": 1576, "unit": "市区町村", "seido_ref": "kodomo-iryouhi-jyosei.json#data.municipalityStatistics.targetAgeOutpatient.age18FiscalYearEnd.value", "status": "verified" },
    { "key": "child_medical.muni_inpatient_age18", "value": 1600, "unit": "市区町村", "seido_ref": "kodomo-iryouhi-jyosei.json#data.municipalityStatistics.targetAgeInpatient.age18FiscalYearEnd.value", "status": "verified" },
    { "key": "child_medical.outpatient_with_limit", "value": 49, "unit": "市区町村", "seido_ref": "kodomo-iryouhi-jyosei.json#data.municipalityStatistics.incomeLimit.outpatientWithLimit.value", "status": "verified" },
    { "key": "child_medical.outpatient_with_copay", "value": 422, "unit": "市区町村", "seido_ref": "kodomo-iryouhi-jyosei.json#data.municipalityStatistics.copayment.outpatientWithCopay.value", "status": "verified" }
  ],
  "last_updated": "2026-07-18",
  "next_check_due": "2026-12-25",
  "audience": { "universal": false, "lifeStages": ["newborn", "infant", "toddler", "schoolAge", "adolescent"], "lifeEvents": ["parenting"], "childAgeBands": ["age0_1", "age1_3", "age3_6", "age6_12", "age12_18"], "gender": null }
}
---

# 子ども医療費助成 自治体早見の見方 — 全国傾向と自分の自治体を切り分ける

## この記事はどのツールと対応している？

本記事は「[子ども医療費助成 自治体早見](/tools/childcare/kodomo-iryouhi-jyosei)」に対応しています。学齢と通院・入院の別を選び、こども家庭庁の全国調査における対象年齢の分布や、所得制限・一部自己負担の傾向を確認するツールです。

個別自治体の受給資格や助成額を判定するものではありません。制度の仕組みは「[子ども医療費助成は自治体でどう違う？](/guide/childcare/seido-kodomo-iryouhi-josei)」、税の医療費控除との関係は「[子ども関連の医療費控除](/guide/money/seido-iryouhi-koujo-kodomo)」も参照してください。

## 計算の考え方

ツールは令和7年度調査の全国1741市区町村の集計を使います。入力した学齢に対し、その年齢区分以上まで通院または入院を助成する自治体が全国でどの程度あるかを示します。自治体名から制度を検索する機能ではなく、全国での位置づけをつかむための早見です。

全国では高校生年代の年度末までを対象とする区分が最多で、通院は1576市区町村、入院は1600市区町村です。ただし「多数派」であることは、利用者の自治体が同じ条件であることを保証しません。

対象年齢だけでなく、所得制限と窓口での一部自己負担も別に見ます。通院で所得制限がある自治体は49市区町村、一部自己負担がある自治体は422市区町村です。対象年齢内でも、所得や受診方法により負担が生じる可能性があります。

## 結果の読み方

結果の割合は「同じ学齢の子どもが全国で助成を受けられる確率」ではありません。調査時点の自治体制度を区分別に集計したものです。転居候補の比較や、自治体へ何を確認すべきか整理する入口として使います。

確認する順番は、対象年齢、所得制限、一部自己負担、利用方法です。利用方法には、医療証を提示して窓口負担を軽減する方式と、いったん支払って後日申請する方式などがあります。全国集計から個別の自己負担額は推定せず、自治体公式ページで確認してください。

通院と入院は必ず切り替えて見ます。両者で対象年齢や負担条件が異なる自治体があるためです。また、保険診療外の費用や食事療養費など、助成対象外の範囲も自治体の案内で確認します。

## よくある疑問

**高校生年代までが多数派なら、全国どこでも無料ですか。** いいえ。対象年齢に含まれても、所得制限や一部自己負担がある場合があります。「無料」と一括りにせず条件を確認します。

**引っ越し前後は何を比べますか。** 通院・入院それぞれの対象年齢、所得制限、自己負担、医療証の申請日と利用開始日を比べます。

**表示された全国値で家計の医療費を計算できますか。** できません。ツールは全国傾向を示し、個別の助成額を算出しません。

## 出典・根拠

- こども家庭庁「令和7年度こどもに係る医療費の助成についての調査」および別紙1

---

最終更新日: 2026-07-18 ／ 準拠年度: 2026年度

※実際の対象条件、助成範囲、申請方法はお住まいの自治体の最新情報で確認してください。
