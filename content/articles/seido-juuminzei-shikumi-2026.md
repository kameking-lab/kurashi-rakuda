---
{
  "id": "seido-juuminzei-shikumi-2026",
  "title": "住民税はいつの所得にかかる？均等割と所得割の仕組み",
  "summary": "2026年度の個人住民税は原則として2025年の所得をもとに計算されます。定額の均等割と、所得に応じる所得割を分けて確認します。",
  "type": "seido-kaisetsu",
  "category": "お金",
  "tool_ref": null,
  "persona": "ペルソナ2: 田中絵里（36歳・ワーママ・時短勤務）",
  "solves": ["住民税がいつの収入をもとに決まるか分からない", "住民税の均等割と所得割の違いが分からない"],
  "revision_year": 2026,
  "sources": [{ "url": "https://laws.e-gov.go.jp/law/325AC0000000226", "title": "地方税法", "org": "e-Gov法令検索（デジタル庁）", "accessed": "2026-07-18" }],
  "facts": [
    { "key": "juuminzei.income_year", "value": 2025, "unit": "年", "seido_ref": "juuminzei.json#data.taxYearRule.incomeYear.value", "status": "verified" },
    { "key": "juuminzei.kintouwari_total", "value": 4000, "unit": "円", "seido_ref": "juuminzei.json#data.kintouwari.totalStandard.value", "status": "verified" },
    { "key": "juuminzei.shinrin_kankyouzei", "value": 1000, "unit": "円", "seido_ref": "juuminzei.json#data.kintouwari.shinrinKankyouzei.value", "status": "verified" },
    { "key": "juuminzei.shotokuwari_rate", "value": 10, "unit": "%", "status": "stub", "stub_reason": "元データは0.1のrate形式で、本文の10%とは倍率が異なる。現行の参照マップにscale定義がないためstubとし、地方税法の標準税率を人手確認した。" }
  ],
  "last_updated": "2026-07-18",
  "next_check_due": "2027-04-01",
  "audience": { "universal": false, "lifeStages": ["adult"], "lifeEvents": ["working"], "childAgeBands": [], "gender": null }
}
---

# 住民税はいつの所得にかかる？均等割と所得割の仕組み

## 結論

2026年度の個人住民税は、原則として2025年の所得をもとに計算されます。税額は、定額で負担する「均等割」と、前年の所得に応じる「所得割」の合計です。給与が変わった直後に住民税が同じでも、計算が間違っているとは限りません。

## 対象と金額

均等割の標準額は年4,000円です。これとは別に、森林環境税として年1,000円が個人住民税とあわせて徴収されます。所得割の標準税率は合計10%ですが、所得から各種控除を差し引き、税額控除も反映するため、給与収入へそのまま掛ける計算ではありません。

住民税は、その年の年初時点に住所がある市区町村が課税します。自治体の条例や家族構成、控除によって結果が変わるため、最終額は納税通知書または給与明細で確認してください。

## よくある疑問

- **転職や時短勤務の直後に高く感じるのはなぜ？** 前年所得をもとにするため、現在の給与が下がってもすぐには同じ割合で下がりません。
- **扶養内なら必ず非課税？** 税の扶養と本人の住民税非課税基準は別です。自治体の基準を確認してください。
- **収入の壁も一緒に確認したい** 「[扶養の壁シミュレーター](/tools/money/fuyo-kabe)」と「[パート・シフト収入計算](/tools/career/part-shift-shunyuu-keisan)」で働き方を整理できます。関連記事「[扶養の壁は2026年どう変わった？](/articles/seido-fuyou-no-kabe-103-106-130-2026)」もあわせて確認してください。

## 出典・根拠

- e-Gov法令検索（デジタル庁）「地方税法」

---

最終更新日: 2026-07-18 ／ 準拠年度: 2026年度 ／ 出典: 上記「出典・根拠」参照

※本記事は一次情報をもとにした情報整理です。実際の課税は自治体の通知と最新の公式情報をご確認ください。
