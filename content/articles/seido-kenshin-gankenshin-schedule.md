---
{
  "id": "seido-kenshin-gankenshin-schedule",
  "title": "健診・がん検診は何歳から何年ごとに受ける？",
  "type": "seido-kaisetsu",
  "category": "健康・美容",
  "tool_ref": null,
  "persona": "ペルソナ3: 山本遥（29歳・独身・総合職）",
  "solves": [
    "がん検診を何歳から受ければいいか分からない",
    "子宮頸がん検診の対象年齢や受診間隔を知りたい",
    "会社の健診と自治体のがん検診の違いが分からない",
    "特定健診と後期高齢者健診の違いが分からない"
  ],
  "revision_year": 2026,
  "sources": [
    {
      "url": "https://www.mhlw.go.jp/content/10900000/001642974.pdf",
      "title": "がん予防重点健康教育及びがん検診実施のための指針（令和7年12月24日一部改正）",
      "org": "厚生労働省",
      "accessed": "2026-07-17"
    },
    {
      "url": "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000059490.html",
      "title": "がん検診",
      "org": "厚生労働省",
      "accessed": "2026-07-17"
    },
    {
      "url": "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000161103.html",
      "title": "特定健診・特定保健指導について",
      "org": "厚生労働省",
      "accessed": "2026-07-17"
    },
    {
      "url": "https://laws.e-gov.go.jp/law/414AC0000000103",
      "title": "健康増進法（平成十四年法律第百三号）",
      "org": "e-Gov法令検索（デジタル庁）",
      "accessed": "2026-07-17"
    },
    {
      "url": "https://laws.e-gov.go.jp/law/357AC0000000080",
      "title": "高齢者の医療の確保に関する法律（昭和五十七年法律第八十号）",
      "org": "e-Gov法令検索（デジタル庁）",
      "accessed": "2026-07-17"
    }
  ],
  "facts": [
    {
      "key": "cervical.age_cytology",
      "value": 20,
      "unit": "歳",
      "seido_ref": "kenshin-gankenshin-schedule.json#data.cancerScreenings.cervical.targetAgeCytology",
      "status": "stub",
      "stub_reason": "元データでは対象年齢が「20歳以上の女性」のように文字列で保持されており、数値単体のフィールドがないため自動数値照合の対象外。値は一次情報（がん検診指針）の年齢基準をそのまま転記している。"
    },
    {
      "key": "cervical.age_hpv",
      "value": 30,
      "unit": "歳",
      "seido_ref": "kenshin-gankenshin-schedule.json#data.cancerScreenings.cervical.targetAgeHpv",
      "status": "stub",
      "stub_reason": "元データでは対象年齢が「30歳以上の女性」のように文字列で保持されており、数値単体のフィールドがないため自動数値照合の対象外。値は一次情報（がん検診指針）の年齢基準をそのまま転記している。"
    },
    {
      "key": "gan_kenshin.age_40",
      "value": 40,
      "unit": "歳",
      "seido_ref": "kenshin-gankenshin-schedule.json#data.cancerScreenings.lung.targetAge",
      "status": "stub",
      "stub_reason": "元データでは対象年齢が「40歳以上」のように文字列で保持されており、数値単体のフィールドがないため自動数値照合の対象外。肺・大腸・乳・総合がん検診・特定健診にも共通する年齢で、値は一次情報の年齢基準をそのまま転記している。"
    },
    {
      "key": "stomach.age_50",
      "value": 50,
      "unit": "歳",
      "seido_ref": "kenshin-gankenshin-schedule.json#data.cancerScreenings.stomach.targetAge",
      "status": "stub",
      "stub_reason": "元データでは対象年齢が「50歳以上」のように文字列で保持されており、数値単体のフィールドがないため自動数値照合の対象外。値は一次情報（がん検診指針）の年齢基準をそのまま転記している。"
    },
    {
      "key": "elderly.age_65_disability",
      "value": 65,
      "unit": "歳",
      "seido_ref": "kenshin-gankenshin-schedule.json#data.elderlyHealthCheckup.targetPersons",
      "status": "stub",
      "stub_reason": "元データでは対象者が「原則75歳以上、一定の障害がある場合は65歳以上」のように文字列で保持されており、数値単体のフィールドがないため自動数値照合の対象外。値は一次情報（高齢者医療確保法）の年齢基準をそのまま転記している。"
    },
    {
      "key": "specific_checkup.age_74",
      "value": 74,
      "unit": "歳",
      "seido_ref": "kenshin-gankenshin-schedule.json#data.specificHealthCheckup.targetAge",
      "status": "stub",
      "stub_reason": "元データでは対象年齢が「40歳〜74歳」のように文字列で保持されており、数値単体のフィールドがないため自動数値照合の対象外。値は一次情報の年齢基準をそのまま転記している。"
    },
    {
      "key": "elderly.age_75",
      "value": 75,
      "unit": "歳",
      "seido_ref": "kenshin-gankenshin-schedule.json#data.elderlyHealthCheckup.targetPersons",
      "status": "stub",
      "stub_reason": "元データでは対象者が「原則75歳以上、一定の障害がある場合は65歳以上」のように文字列で保持されており、数値単体のフィールドがないため自動数値照合の対象外。値は一次情報（高齢者医療確保法）の年齢基準をそのまま転記している。"
    },
    {
      "key": "stomach.interval_years",
      "value": 2,
      "unit": "年",
      "seido_ref": "kenshin-gankenshin-schedule.json#data.cancerScreenings.stomach.intervalYears",
      "status": "verified"
    },
    {
      "key": "cervical.interval_cytology_years",
      "value": 2,
      "unit": "年",
      "seido_ref": "kenshin-gankenshin-schedule.json#data.cancerScreenings.cervical.intervalCytologyYears",
      "status": "verified"
    },
    {
      "key": "cervical.interval_hpv_years",
      "value": 5,
      "unit": "年",
      "seido_ref": "kenshin-gankenshin-schedule.json#data.cancerScreenings.cervical.intervalHpvYears",
      "status": "verified"
    },
    {
      "key": "lung.interval_years",
      "value": 1,
      "unit": "年",
      "seido_ref": "kenshin-gankenshin-schedule.json#data.cancerScreenings.lung.intervalYears",
      "status": "verified"
    },
    {
      "key": "breast.interval_years",
      "value": 2,
      "unit": "年",
      "seido_ref": "kenshin-gankenshin-schedule.json#data.cancerScreenings.breast.intervalYears",
      "status": "verified"
    },
    {
      "key": "colorectal.interval_years",
      "value": 1,
      "unit": "年",
      "seido_ref": "kenshin-gankenshin-schedule.json#data.cancerScreenings.colorectal.intervalYears",
      "status": "verified"
    }
  ],
  "last_updated": "2026-07-17",
  "next_check_due": "2027-04-01",
  "summary": "対策型がん検診は胃・子宮頸・肺・乳・大腸の5種類で、がんの種類ごとに対象年齢と受診間隔が異なります。特定健診は40歳から74歳まで毎年、75歳以降は後期高齢者健診に切り替わります。"
}
---

# 健診・がん検診は何歳から何年ごとに受ける？

## 結論

対策型のがん検診は、がんの種類によって対象年齢と受診間隔が異なります。子宮頸がん検診は20歳から、乳がん・肺がん・大腸がんは40歳から、胃がん検診は原則50歳から対象になります。受診間隔も、がんの種類によって1年から5年までさまざまです。特定健診（40歳〜74歳、毎年）や75歳以降の後期高齢者健診とは対象・実施主体が異なるため、あわせて確認しておくと安心です。

## 対象と金額（対象年齢と受診間隔）

厚生労働省の指針に基づき、市区町村が実施する対策型がん検診の対象年齢・受診間隔は次のとおりです。

- 胃がん検診: 50歳から、2年ごと（胃部エックス線検査に限り、当分の間は40歳から毎年受けても差し支えありません）
- 子宮頸がん検診（細胞診）: 20歳の女性から、2年ごと
- 子宮頸がん検診（HPV検査単独法）: 30歳の女性から、5年ごと（細胞診とHPV検査単独法のどちらを実施するかは市区町村が選択するため、受診間隔が2年か5年かは自治体によって異なります）
- 肺がん検診: 40歳から、毎年（検診項目は問診と胸部エックス線検査で、以前の指針にあった喀痰細胞診は現在は含まれません）
- 乳がん検診: 40歳の女性から、2年ごと
- 大腸がん検診: 40歳から、毎年
- 総合がん検診（40歳と50歳が対象）を受けた年度は、他のがん検診を重ねて受ける必要がありません

会社の健康保険や国民健康保険に加入している人は、40歳から74歳まで特定健診を毎年受けられます。75歳以降は後期高齢者医療広域連合が実施する後期高齢者健診に切り替わり、一定の障害がある場合は65歳から対象になることもあります。後期高齢者健診の受診間隔は全国一律には定められていません。

がん検診・特定健診とも自己負担額は市区町村や医療保険者が個別に定めており、全国共通の金額はありません。届く案内やお住まいの窓口でご確認ください。

## 出典・根拠

- 厚生労働省「がん予防重点健康教育及びがん検診実施のための指針」
- 厚生労働省「がん検診」
- 厚生労働省「特定健診・特定保健指導について」
- 健康増進法（e-Gov法令検索）
- 高齢者の医療の確保に関する法律（e-Gov法令検索）

---
最終更新日: 2026-07-17 ／ 準拠年度: 2026年度 ／ 出典: 上記「出典・根拠」参照

※本記事は一次情報をもとにした情報整理です。個別の状況については自治体・専門機関に確認してください。
