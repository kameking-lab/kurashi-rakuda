---
{
  "id": "seido-yuukyuu-fuyo-nissuu-kijun",
  "title": "有給休暇の付与日数はどう決まる？労働基準法の基準",
  "type": "seido-kaisetsu",
  "category": "仕事・キャリア",
  "revision_year": 2026,
  "sources": [
    {
      "url": "https://laws.e-gov.go.jp/law/322AC0000000049",
      "title": "労働基準法（昭和二十二年法律第四十九号）",
      "org": "e-Gov法令検索（デジタル庁）",
      "accessed": "2026-07-17"
    },
    {
      "url": "https://laws.e-gov.go.jp/law/322M40000100023",
      "title": "労働基準法施行規則（昭和二十二年厚生省令第二十三号）",
      "org": "e-Gov法令検索（デジタル庁）",
      "accessed": "2026-07-17"
    },
    {
      "url": "https://www.mhlw.go.jp/content/001140963.pdf",
      "title": "年５日の年次有給休暇の確実な取得 わかりやすい解説",
      "org": "厚生労働省・都道府県労働局・労働基準監督署",
      "accessed": "2026-07-17"
    }
  ],
  "facts": [
    {
      "key": "keizoku_kinmu_6kagetsu",
      "value": 6,
      "unit": "ヶ月",
      "seido_ref": "yuukyuu-fuyo-nissuu-kijun.json#data.eligibility.continuousServiceMonths",
      "status": "verified"
    },
    {
      "key": "shukkin_ritsu_8wari",
      "value": 8,
      "unit": "割",
      "status": "stub",
      "stub_reason": "元データ(data.eligibility.attendanceRate)は出勤率を0.8という小数（rate）形式で保持しており、本文表記の「8割」という整数表記とはスケールが異なるため、config/seido-ref-map.jsonにスケール変換を追加しない限り機械照合できない。値自体は労働基準法第39条第1項「全労働日の八割以上出勤」に基づき0.8=8割であることを人手で確認済み。"
    },
    {
      "key": "saisho_fuyo_10nichi",
      "value": 10,
      "unit": "日",
      "seido_ref": "yuukyuu-fuyo-nissuu-kijun.json#data.eligibility.firstGrantDays",
      "status": "verified"
    },
    {
      "key": "fuyo_1nen6kagetsu_11nichi",
      "value": 11,
      "unit": "日",
      "seido_ref": "yuukyuu-fuyo-nissuu-kijun.json#data.standardGrantTable.rows[serviceLabel=1年6か月].grantDays",
      "status": "verified"
    },
    {
      "key": "fuyo_2nen6kagetsu_12nichi",
      "value": 12,
      "unit": "日",
      "seido_ref": "yuukyuu-fuyo-nissuu-kijun.json#data.standardGrantTable.rows[serviceLabel=2年6か月].grantDays",
      "status": "verified"
    },
    {
      "key": "fuyo_3nen6kagetsu_14nichi",
      "value": 14,
      "unit": "日",
      "seido_ref": "yuukyuu-fuyo-nissuu-kijun.json#data.standardGrantTable.rows[serviceLabel=3年6か月].grantDays",
      "status": "verified"
    },
    {
      "key": "fuyo_4nen6kagetsu_16nichi",
      "value": 16,
      "unit": "日",
      "seido_ref": "yuukyuu-fuyo-nissuu-kijun.json#data.standardGrantTable.rows[serviceLabel=4年6か月].grantDays",
      "status": "verified"
    },
    {
      "key": "fuyo_5nen6kagetsu_18nichi",
      "value": 18,
      "unit": "日",
      "seido_ref": "yuukyuu-fuyo-nissuu-kijun.json#data.standardGrantTable.rows[serviceLabel=5年6か月].grantDays",
      "status": "verified"
    },
    {
      "key": "fuyo_jougen_20nichi",
      "value": 20,
      "unit": "日",
      "seido_ref": "yuukyuu-fuyo-nissuu-kijun.json#data.standardGrantTable.maxGrantDays",
      "status": "verified"
    },
    {
      "key": "hirei_fuyo_shukan_jikan_30jikan",
      "value": 30,
      "unit": "時間",
      "seido_ref": "yuukyuu-fuyo-nissuu-kijun.json#data.proportionalGrant.weeklyHoursThreshold",
      "status": "verified"
    },
    {
      "key": "hirei_fuyo_shukan_nissu_4nichi",
      "value": 4,
      "unit": "日",
      "seido_ref": "yuukyuu-fuyo-nissuu-kijun.json#data.proportionalGrant.weeklyWorkDaysThreshold",
      "status": "verified"
    },
    {
      "key": "hirei_fuyo_nenkan_nissu_216nichi",
      "value": 216,
      "unit": "日",
      "seido_ref": "yuukyuu-fuyo-nissuu-kijun.json#data.proportionalGrant.annualWorkDaysThreshold",
      "status": "verified"
    }
  ],
  "last_updated": "2026-07-17",
  "next_check_due": "2027-04-01",
  "summary": "年次有給休暇は、雇い入れから6ヶ月継続勤務し出勤率の要件を満たせば10日付与され、勤続年数に応じて増加し6年6ヶ月以上で20日が上限になります。週の所定労働時間や所定労働日数が少ない人には比例付与という別の基準が適用されます。",
  "tool_ref": null,
  "persona": "ペルソナ2: 田中絵里（36歳・ワーママ・時短勤務）",
  "solves": [
    "有給休暇が何日もらえるか分からない",
    "時短勤務でも有給休暇は普通にもらえるのか不安",
    "パートでも有給休暇がもらえるか分からない",
    "育休から復帰したら有給休暇はどうなるのか心配"
  ],
  "audience": {
    "universal": false,
    "lifeStages": [
      "infant",
      "adult"
    ],
    "lifeEvents": [
      "parenting",
      "working"
    ],
    "childAgeBands": [
      "age0_1"
    ],
    "gender": null
  }
}
---

# 有給休暇の付与日数はどう決まる？労働基準法の基準

## 結論

年次有給休暇は、雇い入れの日から6ヶ月継続勤務し、その期間の全労働日の8割以上出勤すれば10日が付与されます。以降は勤続年数に応じて日数が増え、6年6ヶ月以上で20日が上限になります。育児休業を取得した期間も出勤したものとみなされるため、育休から復帰したあとも通常どおり付与日数が積み上がります。

## 対象と金額

通常の労働者（フルタイム勤務や、週の所定労働日数が多い時短勤務など）に適用される年次有給休暇の付与日数は、勤続年数に応じて次のとおり増えていきます。

- 6ヶ月: 10日
- 1年6ヶ月: 11日
- 2年6ヶ月: 12日
- 3年6ヶ月: 14日
- 4年6ヶ月: 16日
- 5年6ヶ月: 18日
- 6年6ヶ月以上: 20日

正社員・パートタイム・有期雇用・管理監督者かどうかにかかわらず、上記の2つの要件を満たせば年次有給休暇は発生します。一方で、週の所定労働時間が30時間未満で、かつ週の所定労働日数が4日以下（または1年間の所定労働日数が216日以下）の労働者には、所定労働日数に応じて日数を少なくする「比例付与」という別の基準が適用されます。時短勤務であっても、週の所定労働日数や所定労働時間が上記の基準を上回っていれば、比例付与ではなく上記の表がそのまま適用されます。

## 出典・根拠

- e-Gov法令検索（デジタル庁）「労働基準法」第39条
- e-Gov法令検索（デジタル庁）「労働基準法施行規則」第24条の3
- 厚生労働省・都道府県労働局・労働基準監督署「年５日の年次有給休暇の確実な取得 わかりやすい解説」

---
最終更新日: 2026-07-17 ／ 準拠年度: 2026年度 ／ 出典: 上記「出典・根拠」参照

※本記事は一次情報をもとにした情報整理です。個別の状況については自治体・専門機関に確認してください。
