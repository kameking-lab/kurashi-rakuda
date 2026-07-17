---
{
  "id": "tool-narisou-josei-kenshin-schedule",
  "title": "何歳からどの検診が対象？ 健診・がん検診 年齢別スケジュールツールの結果の読み方",
  "summary": "生年月日から満年齢を計算し、子宮頸がん検診・乳がん検診・胃がん検診・肺がん検診・大腸がん検診・特定健診・後期高齢者健診について、現在の年齢で対象になっているかを一覧表示する健診・がん検診 年齢別スケジュールツールの判定ロジックと、結果の読み方を解説する。",
  "type": "tool-narisou",
  "category": "健康・美容",
  "tool_ref": "josei-kenshin-schedule",
  "persona": "ペルソナ5: 高橋京子（52歳・パート・子ども大学生・実母78歳の介護が視野）",
  "solves": [
    "自分がいまどのがん検診・健診の対象年齢か分からない",
    "子宮頸がん検診の受診間隔が2年か5年か分からない",
    "特定健診と後期高齢者健診の切り替わる年齢が分からない",
    "次にどの検診の対象年齢に入るか知りたい",
    "がん検診の対象年齢・受診間隔の一次情報を確認したい"
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
      "key": "josei_kenshin.cervical_age_cytology",
      "value": 20,
      "unit": "歳",
      "seido_ref": "kenshin-gankenshin-schedule.json#data.cancerScreenings.cervical.targetAgeCytology",
      "status": "stub",
      "stub_reason": "元データでは対象年齢が「20歳以上の女性」のように文字列で保持されており、数値単体のフィールドがないため自動数値照合の対象外。値は一次情報（がん検診指針）の年齢基準をそのまま転記している。"
    },
    {
      "key": "josei_kenshin.cervical_age_hpv",
      "value": 30,
      "unit": "歳",
      "seido_ref": "kenshin-gankenshin-schedule.json#data.cancerScreenings.cervical.targetAgeHpv",
      "status": "stub",
      "stub_reason": "元データでは対象年齢が「30歳以上の女性」のように文字列で保持されており、数値単体のフィールドがないため自動数値照合の対象外。値は一次情報（がん検診指針）の年齢基準をそのまま転記している。"
    },
    {
      "key": "josei_kenshin.age_40",
      "value": 40,
      "unit": "歳",
      "seido_ref": "kenshin-gankenshin-schedule.json#data.cancerScreenings.lung.targetAge",
      "status": "stub",
      "stub_reason": "元データでは対象年齢が「40歳以上」のように文字列で保持されており、数値単体のフィールドがないため自動数値照合の対象外。肺・大腸・乳がん検診・特定健診・総合がん検診・胃がん検診の例外（40歳のバリウム検査）にも共通する年齢で、値は一次情報の年齢基準をそのまま転記している。"
    },
    {
      "key": "josei_kenshin.stomach_age_50",
      "value": 50,
      "unit": "歳",
      "seido_ref": "kenshin-gankenshin-schedule.json#data.cancerScreenings.stomach.targetAge",
      "status": "stub",
      "stub_reason": "元データでは対象年齢が「50歳以上」のように文字列で保持されており、数値単体のフィールドがないため自動数値照合の対象外。総合がん検診の対象年齢（40歳及び50歳）にも共通する。値は一次情報の年齢基準をそのまま転記している。"
    },
    {
      "key": "josei_kenshin.specific_checkup_age_74",
      "value": 74,
      "unit": "歳",
      "seido_ref": "kenshin-gankenshin-schedule.json#data.specificHealthCheckup.targetAge",
      "status": "stub",
      "stub_reason": "元データでは対象年齢が「40歳〜74歳」のように文字列で保持されており、数値単体のフィールドがないため自動数値照合の対象外。値は一次情報（特定健診・特定保健指導について）の年齢基準をそのまま転記している。"
    },
    {
      "key": "josei_kenshin.elderly_age_75",
      "value": 75,
      "unit": "歳",
      "seido_ref": "kenshin-gankenshin-schedule.json#data.elderlyHealthCheckup.targetPersons",
      "status": "stub",
      "stub_reason": "元データでは対象者が「原則75歳以上、一定の障害がある場合は65歳以上」のように文字列で保持されており、数値単体のフィールドがないため自動数値照合の対象外。値は一次情報（高齢者医療確保法）の年齢基準をそのまま転記している。"
    },
    {
      "key": "josei_kenshin.stomach_interval_years",
      "value": 2,
      "unit": "年",
      "seido_ref": "kenshin-gankenshin-schedule.json#data.cancerScreenings.stomach.intervalYears",
      "status": "verified"
    },
    {
      "key": "josei_kenshin.cervical_interval_cytology_years",
      "value": 2,
      "unit": "年",
      "seido_ref": "kenshin-gankenshin-schedule.json#data.cancerScreenings.cervical.intervalCytologyYears",
      "status": "verified"
    },
    {
      "key": "josei_kenshin.cervical_interval_hpv_years",
      "value": 5,
      "unit": "年",
      "seido_ref": "kenshin-gankenshin-schedule.json#data.cancerScreenings.cervical.intervalHpvYears",
      "status": "verified"
    },
    {
      "key": "josei_kenshin.lung_interval_years",
      "value": 1,
      "unit": "年",
      "seido_ref": "kenshin-gankenshin-schedule.json#data.cancerScreenings.lung.intervalYears",
      "status": "verified"
    },
    {
      "key": "josei_kenshin.breast_interval_years",
      "value": 2,
      "unit": "年",
      "seido_ref": "kenshin-gankenshin-schedule.json#data.cancerScreenings.breast.intervalYears",
      "status": "verified"
    },
    {
      "key": "josei_kenshin.colorectal_interval_years",
      "value": 1,
      "unit": "年",
      "seido_ref": "kenshin-gankenshin-schedule.json#data.cancerScreenings.colorectal.intervalYears",
      "status": "verified"
    }
  ],
  "last_updated": "2026-07-18",
  "next_check_due": "2027-04-01"
}
---

# 何歳からどの検診が対象？ 健診・がん検診 年齢別スケジュールツールの結果の読み方

## この記事はどのツールと対応している？

本記事は「健診・がん検診 年齢別スケジュール（女性）」ツール（josei-kenshin-schedule）に対応しています。生年月日を入力すると、その場で満年齢を計算し、子宮頸がん検診・乳がん検診・胃がん検診・肺がん検診・大腸がん検診・特定健康診査・後期高齢者健診の7つについて、現在の年齢で「対象」「対象外」「あと◯年で対象」のいずれかを一覧表示します。

このツールが表示するのは、厚生労働省の指針・法令が定める対象年齢のしきい値と満年齢を比較した判定結果であり、医学的な受診指示・診断ではありません。実際に受けられる検診の種類・自己負担額・案内方法は、お住まいの市区町村・加入する医療保険者によって異なります。

## 計算の考え方

**満年齢の数え方**は、生年月日から「誕生日を迎えた日から1つ加齢する」という日常的な数え方で計算します。特定健康診査は本来「年度の中で40歳から74歳に達する加入者」という年度単位の年齢で判定されますが、本ツールは誕生日基準の満年齢で簡易的に判定するため、誕生日の前後では実際の運用と数か月ずれることがあります。

**対象年齢のしきい値**は、検診ごとに異なります。子宮頸がん検診は20歳から、乳がん検診・肺がん検診・大腸がん検診・特定健康診査は40歳から、胃がん検診は原則50歳から対象になり、特定健康診査は74歳まで、75歳になると後期高齢者健診に切り替わります。子宮頸部の細胞診による検診は20歳から、HPV検査単独法は30歳から対象になる点も、市区町村によって採用する方式が分かれるためあわせて確認しておくとよいでしょう。これらのしきい値はすべて厚生労働省の指針・法令の原文（例:「50歳以上」「40歳〜74歳」）から取り出しており、コードに数値を直書きしていません。

**受診間隔**は、子宮頸がん検診なら細胞診で2年ごと、HPV検査単独法で5年ごとです。胃がん検診・乳がん検診も2年ごと、肺がん検診・大腸がん検診は毎年が目安です。特定健診も毎年ですが、後期高齢者健診の頻度は実施主体の広域連合が定めるため、全国一律の決まりはありません。

**対象年齢に届いていない場合**は「あと◯年で対象」と表示します。たとえば胃がん検診なら、50歳になるまでの残り年数が表示され、50歳になった年から対象に変わります。

**特定健診と後期高齢者健診の切り替わり**は、74歳までは特定健診、75歳になると後期高齢者健診という形で表現しています。本ツールの一覧では、特定健診が「対象外」になったのと同時に後期高齢者健診が「対象」に変わるため、切り替わりのタイミングがひと目で分かる構成にしています。

## 結果の読み方

結果画面には、7つの検診それぞれについて「対象年齢」「受診間隔」「現在の判定（対象／対象外／あと◯年で対象）」が並びます。加えて、現在がんや前がん病変で治療中の方はそのがん検診の対象にならない旨、40歳・50歳が対象の総合がん検診を受けた場合は他のがん検診の実施を一部省略できる旨を、年齢の判定結果とは独立して常に表示します。

子宮頸がん検診の欄には、細胞診とHPV検査単独法のどちらを採用しているかで受診間隔が変わること、HPV検査単独法は結果次第で翌年度に追跡検査が必要になることもあわせて注記しています。胃がん検診の欄には、胃部エックス線検査に限り40歳から毎年受けられる例外があることも記載しています。肺がん検診の欄では、現在の検診項目が問診と胸部エックス線検査のみで、以前の指針にあった喀痰細胞診は含まれないことを明記しています。

総合がん検診は40歳と50歳の方が対象で、これを受けた年度は毎年受けるはずの検診、その年度と翌年度は2年ごとの検診を重ねて受ける必要がなくなります。ただし本ツールの一覧そのものには総合がん検診の行を含めていません（「40歳・50歳のみ」というピンポイントの対象年齢が、他の検診の「対象／あと◯年で対象」という連続的な判定と馴染まないため）。参考情報として画面内に常時表示するにとどめています。

がん検診の実施主体は市区町村（努力義務。健康増進法第19条の2）、特定健診の実施主体は加入する医療保険者、後期高齢者健診の実施主体は後期高齢者医療広域連合です。実際に受けられる検診の種類・自己負担額・案内方法は、お住まいの市区町村・医療保険者によって異なるため、届く案内や窓口で確認してください。

## よくある疑問

**子宮頸がん検診は結局何年ごと?** 細胞診なら2年ごと、HPV検査単独法なら5年ごとです。どちらを採用するかは市区町村が選ぶため、実際の受診間隔はお住まいの市区町村の案内で確認してください。

**特定健診と後期高齢者健診はどちらを受ければいい?** 74歳までは特定健診、75歳になったら後期高齢者健診です。本ツールは誕生日基準の満年齢で自動的に切り替えて判定します。

**胃がん検診はバリウムなら40歳から受けられる?** 原則の対象年齢は50歳からですが、胃部エックス線検査（バリウム）に限り、当分の間は40歳から毎年受けても差し支えないとされています。本ツールの判定は原則（50歳から）を基準にしているため、この例外は注記として案内するにとどめています。

**満年齢の判定に誤差はある?** 特定健診は本来「年度内に40歳から74歳に達する」という年度単位の年齢で判定されますが、本ツールは誕生日基準の満年齢を使う簡易実装のため、誕生日の前後で実際の運用と数か月ずれることがあります。

## 出典・根拠

- 厚生労働省「がん予防重点健康教育及びがん検診実施のための指針」
- 厚生労働省「がん検診」
- 厚生労働省「特定健診・特定保健指導について」
- 健康増進法（e-Gov法令検索）
- 高齢者の医療の確保に関する法律（e-Gov法令検索）

---

最終更新日: 2026-07-18 ／ 準拠年度: 2026年度 ／ 出典: 上記「出典・根拠」参照

※本記事は一次情報をもとにした情報整理です。個別の状況については必ず最新の公式情報・窓口でご確認ください。
