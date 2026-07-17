---
{
  "id": "seido-kodomo-iryouhi-josei",
  "title": "子ども医療費助成は自治体でどう違う？",
  "summary": "子ども医療費助成は国の制度ではなく、市区町村が実施し都道府県が補助する地方単独事業です。こども家庭庁の全国調査では、通院・入院とも18歳年度末までを対象とする市区町村が最多ですが、対象年齢・所得制限・自己負担の有無は自治体ごとに異なります。",
  "type": "seido-kaisetsu",
  "category": "子育て",
  "tool_ref": null,
  "persona": "ペルソナ1: 佐藤美咲（32歳・専業主婦・子ども2人）",
  "solves": [
    "子ども医療費助成が自治体によってどう違うのか分からない",
    "うちの市が「所得制限あり」「自己負担あり」の少数派なのか不安",
    "引っ越したら子どもの医療費助成がどう変わるのか分からない"
  ],
  "revision_year": 2026,
  "sources": [
    {
      "url": "https://www.cfa.go.jp/policies/boshihoken/kodomoiryouhityousa-r7",
      "title": "令和7年度「こどもに係る医療費の助成についての調査」",
      "org": "こども家庭庁",
      "accessed": "2026-07-17"
    },
    {
      "url": "https://www.cfa.go.jp/assets/contents/node/basic_page/field_ref_resources/6a9b8926-411c-4044-81aa-d8c26b21aaf5/39db7d2e/20251224policies-boshihoken-kodomoiryouhityousa-r7-01.pdf",
      "title": "令和7年度「こどもに係る医療費の助成についての調査」別紙1（こども医療費に対する助成の実施状況・令和7年4月1日現在）",
      "org": "こども家庭庁成育局母子保健課",
      "accessed": "2026-07-17"
    },
    {
      "url": "https://www.mhlw.go.jp/content/12401000/001270728.pdf",
      "title": "こどもにとってより良い医療の在り方（第180回社会保障審議会医療保険部会 資料3）",
      "org": "厚生労働省保険局",
      "accessed": "2026-07-17"
    }
  ],
  "facts": [
    {
      "key": "child_medical.total_municipalities",
      "value": 1741,
      "unit": "市区町村",
      "seido_ref": "kodomo-iryouhi-jyosei.json#data.nationalCoverage.totalMunicipalities.value",
      "status": "verified"
    },
    {
      "key": "child_medical.total_prefectures",
      "value": 47,
      "unit": "都道府県",
      "seido_ref": "kodomo-iryouhi-jyosei.json#data.nationalCoverage.totalPrefectures.value",
      "status": "verified"
    },
    {
      "key": "child_medical.pref_outpatient_preschool_most_common",
      "value": 17,
      "unit": "都道府県",
      "seido_ref": "kodomo-iryouhi-jyosei.json#data.prefectureStatistics.targetAgeOutpatientPreschool.value",
      "status": "verified"
    },
    {
      "key": "child_medical.pref_inpatient_age15_most_common",
      "value": 15,
      "unit": "都道府県",
      "seido_ref": "kodomo-iryouhi-jyosei.json#data.prefectureStatistics.targetAgeInpatientAge15.value",
      "status": "verified"
    },
    {
      "key": "child_medical.muni_outpatient_age18_most_common",
      "value": 1576,
      "unit": "市区町村",
      "seido_ref": "kodomo-iryouhi-jyosei.json#data.municipalityStatistics.targetAgeOutpatient.age18FiscalYearEnd.value",
      "status": "verified"
    },
    {
      "key": "child_medical.muni_inpatient_age18_most_common",
      "value": 1600,
      "unit": "市区町村",
      "seido_ref": "kodomo-iryouhi-jyosei.json#data.municipalityStatistics.targetAgeInpatient.age18FiscalYearEnd.value",
      "status": "verified"
    },
    {
      "key": "child_medical.outpatient_no_income_limit",
      "value": 1692,
      "unit": "市区町村",
      "seido_ref": "kodomo-iryouhi-jyosei.json#data.municipalityStatistics.incomeLimit.outpatientNoLimit.value",
      "status": "verified"
    },
    {
      "key": "child_medical.inpatient_no_income_limit",
      "value": 1693,
      "unit": "市区町村",
      "seido_ref": "kodomo-iryouhi-jyosei.json#data.municipalityStatistics.incomeLimit.inpatientNoLimit.value",
      "status": "verified"
    },
    {
      "key": "child_medical.outpatient_with_income_limit",
      "value": 49,
      "unit": "市区町村",
      "seido_ref": "kodomo-iryouhi-jyosei.json#data.municipalityStatistics.incomeLimit.outpatientWithLimit.value",
      "status": "verified"
    },
    {
      "key": "child_medical.inpatient_with_income_limit",
      "value": 48,
      "unit": "市区町村",
      "seido_ref": "kodomo-iryouhi-jyosei.json#data.municipalityStatistics.incomeLimit.inpatientWithLimit.value",
      "status": "verified"
    },
    {
      "key": "child_medical.outpatient_no_copay",
      "value": 1319,
      "unit": "市区町村",
      "seido_ref": "kodomo-iryouhi-jyosei.json#data.municipalityStatistics.copayment.outpatientNoCopay.value",
      "status": "verified"
    },
    {
      "key": "child_medical.inpatient_no_copay",
      "value": 1410,
      "unit": "市区町村",
      "seido_ref": "kodomo-iryouhi-jyosei.json#data.municipalityStatistics.copayment.inpatientNoCopay.value",
      "status": "verified"
    },
    {
      "key": "child_medical.outpatient_with_copay",
      "value": 422,
      "unit": "市区町村",
      "seido_ref": "kodomo-iryouhi-jyosei.json#data.municipalityStatistics.copayment.outpatientWithCopay.value",
      "status": "verified"
    },
    {
      "key": "child_medical.inpatient_with_copay",
      "value": 331,
      "unit": "市区町村",
      "seido_ref": "kodomo-iryouhi-jyosei.json#data.municipalityStatistics.copayment.inpatientWithCopay.value",
      "status": "verified"
    },
    {
      "key": "child_medical.age15_nendo_matsu",
      "value": 15,
      "unit": "歳",
      "status": "stub",
      "stub_reason": "「15歳年度末」という年齢区分は元データでは項目ラベルの文字列にのみ含まれ、独立した数値ノードとして格納されていないため機械照合の対象外とする。関連ノード: municipalityStatistics.targetAgeOutpatient.age15FiscalYearEnd / targetAgeInpatient.age15FiscalYearEnd / prefectureStatistics.targetAgeInpatientAge15（いずれも該当区分の市区町村数・都道府県数を格納）。"
    },
    {
      "key": "child_medical.age18_nendo_matsu",
      "value": 18,
      "unit": "歳",
      "status": "stub",
      "stub_reason": "「18歳年度末」という年齢区分も同様に項目ラベルの文字列にのみ含まれ、独立した数値ノードとして格納されていない。関連ノード: municipalityStatistics.targetAgeOutpatient.age18FiscalYearEnd / targetAgeInpatient.age18FiscalYearEnd（いずれも該当区分の市区町村数を格納）。"
    }
  ],
  "last_updated": "2026-07-17",
  "next_check_due": "2026-12-25"
}
---

# 子ども医療費助成は自治体でどう違う？

## 結論

子ども医療費助成は、児童手当のような国の法定給付ではありません。実施主体は市区町村で、都道府県がその実施を要綱等に基づいて補助する仕組みです。全国一律の基準は存在しないため、対象年齢・所得制限の有無・窓口での自己負担の有無は、お住まいの市区町村によって異なります。こども家庭庁の全国調査（2025年4月時点）によると、すべての都道府県・市区町村で何らかの助成が実施されていますが、内容は自治体ごとに幅があります。

## 対象と金額

助成は、都道府県の補助基準に市区町村が独自に上乗せする二層構造になっています。

都道府県の補助基準でもっとも多いのは、通院が就学前までとする17都道府県、入院が15歳年度末までとする15都道府県です。一方、市区町村の助成は、通院・入院とも18歳年度末までとする自治体が最多（通院1,576、入院1,600、全国1,741市区町村・47都道府県中、2025年4月時点）で、都道府県の基準より手厚くなっています。

所得制限がない市区町村は通院1,692・入院1,693で大半を占めますが、通院49・入院48の市区町村には今も所得制限があります。窓口負担も同様に、自己負担なしが通院1,319・入院1,410と多数派である一方、自己負担ありも通院422・入院331と一定数あります。負担額（受診ごとの定額や月ごとの上限額など）は自治体ごとに異なり、全国調査では集計されていないため、お住まいの市区町村で確認してください。

## 制度の背景

こども医療費助成の拡充が進んだ背景には、国民健康保険の国庫負担金を減額する調整措置の廃止があります。未就学児分は平成30年度から対象外となり、18歳年度末までのこども分も令和6年度に廃止されました。これにより自治体が助成を拡充しても国からの補助が減らされなくなり、対象年齢の拡大や自己負担の無償化が進んだとみられます。

## よくある疑問

- **どの自治体も高校生まで無料？** いいえ。18歳年度末までを対象とする市区町村が最多ですが、所得制限や自己負担がある自治体も一定数あります。
- **引っ越すと助成内容は変わる？** 変わります。転居先の市区町村の制度が適用されるため、転入時に窓口で確認してください。

## 出典・根拠

- こども家庭庁「令和7年度こどもに係る医療費の助成についての調査」
- こども家庭庁「令和7年度こどもに係る医療費の助成についての調査 別紙1」
- 厚生労働省保険局「こどもにとってより良い医療の在り方」

---

最終更新日: 2026-07-17 ／ 準拠年度: 2026年度 ／ 出典: 上記「出典・根拠」参照

※本記事は一次情報をもとにした情報整理です。個別の状況については自治体・専門機関に確認してください。
