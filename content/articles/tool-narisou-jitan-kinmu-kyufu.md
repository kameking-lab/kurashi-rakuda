---
{
  "id": "tool-narisou-jitan-kinmu-kyufu",
  "title": "時短勤務の給料はこう決まる — 育児時短就業給付金ツールの結果の読み方",
  "summary": "育児時短就業給付金は、時短勤務中に支払われた賃金の10%相当が上乗せされる制度。ツールの計算結果をどう読めばよいかを解説する。",
  "type": "tool-narisou",
  "category": "仕事・キャリア",
  "tool_ref": "jitan-kyuyo",
  "persona": "時短勤務を検討する共働き親",
  "solves": [
    "時短勤務で給料がいくら減るか分からない"
  ],
  "revision_year": 2026,
  "sources": [
    {
      "url": "https://www.mhlw.go.jp/content/11600000/001395102.pdf",
      "title": "育児時短就業給付の内容と支給申請手続（令和7年8月1日時点版）",
      "org": "厚生労働省",
      "accessed": "2026-07-22",
      "verify": { "expect": ["育児時短就業中の各月に支払われた賃金額\n×\n10％", "２歳未\n満の子を養育するために所定労働時間を短縮して就業した場合"] }
    }
  ],
  "facts": [
    {
      "key": "jitan.kyufu_wariai",
      "value": 10,
      "unit": "%",
      "seido_ref": "ikukyu-kyufu.json#data.ikujiJitanShugyoKyufuKin.rate.value",
      "status": "stub",
      "stub_reason": "元データは0.1のrate形式で、本文の10%とは倍率が異なる。現行の参照マップにscale定義がないためstubとし、雇用保険法（百分の十）を人手確認した。"
    },
    {
      "key": "jitan.age_2_miman",
      "value": 2,
      "unit": "歳",
      "seido_ref": "ikukyu-kyufu.json#data.ikujiJitanShugyoKyufuKin.targetChildAgeYears.value",
      "status": "verified"
    }
  ],
  "last_updated": "2026-07-17",
  "next_check_due": "2026-10-01",
  "audience": {
    "universal": false,
    "lifeStages": [
      "newborn",
      "infant",
      "toddler"
    ],
    "lifeEvents": [
      "parenting",
      "working"
    ],
    "childAgeBands": [
      "age0_1",
      "age1_3",
      "age3_6"
    ],
    "gender": null
  }
}
---

# 時短勤務の給料はこう決まる — 育児時短就業給付金ツールの結果の読み方

## この記事はどのツールと対応している？

「時短勤務の給料・育児時短就業給付シミュレーター」ツールと対応しています。時短勤務中に支払われる給料と、あわせて受け取れる給付金の目安をまとめて確認できます。

## 計算の考え方

育児時短就業給付金は、時短勤務中に実際に支払われた賃金の10%相当が上乗せされる仕組みです（上限あり）。ツールでは「時短前の給料」と「時短後の給料」を入力すると、この10%相当の給付額を自動で計算します。

## 結果の読み方

ツールの結果画面には「時短後の給料」「給付金の目安」「合計の目安」の3つが表示されます。合計の目安が時短前の給料にどれくらい近づくかで、時短勤務による収入への影響を確認できます。

## よくある疑問

- **誰でも対象になる？** 雇用保険の被保険者で、2歳未満の子を養育しながら時短勤務をしているなど、一定の要件があります。
- **給付額に上限はある？** あります。時短前の賃金を超えない範囲などの上限があるため、正確な金額は出典の資料もあわせてご確認ください。

## 出典・根拠

- 厚生労働省「育児時短就業給付の内容と支給申請手続」

---

最終更新日: 2026-07-17 ／ 準拠年度: 2026年度 ／ 出典: 上記「出典・根拠」参照

※本記事は一次情報をもとにした情報整理です。個別の状況については必ず最新の公式情報・窓口でご確認ください。
