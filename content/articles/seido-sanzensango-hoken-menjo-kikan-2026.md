---
{
  "id": "seido-sanzensango-hoken-menjo-kikan-2026",
  "title": "産前産後の社会保険料免除はいつからいつまで？",
  "summary": "産前産後休業中は健康保険・厚生年金保険の保険料が本人・会社ともに免除される。対象期間は産前42日（多胎は98日）から産後56日まで。育児休業等の保険料免除は3歳未満の子を養育する期間まで対象で、同月内14日以上の休業でも免除される。",
  "type": "seido-kaisetsu",
  "category": "妊娠・出産",
  "tool_ref": null,
  "persona": "ペルソナ4: 鈴木奈々（34歳・妊活→プレママ）",
  "revision_year": 2026,
  "sources": [
    { "url": "https://laws.e-gov.go.jp/law/211AC0000000070", "title": "健康保険法（第159条・第159条の3）", "org": "デジタル庁 e-Gov法令検索", "accessed": "2026-07-17" },
    { "url": "https://www.nenkin.go.jp/service/kounen/hokenryo/menjo/20140122-01.html", "title": "厚生年金保険料等の免除（産前産後休業・育児休業等期間）", "org": "日本年金機構", "accessed": "2026-07-17" }
  ],
  "facts": [
    { "key": "sango_menjo.sanzen_tanmine", "value": 42, "unit": "日", "seido_ref": "ikukyu-kyufu.json#data.shussanTeateKin.periodBeforeBirth.value", "status": "verified" },
    { "key": "sango_menjo.sanzen_tatai", "value": 98, "unit": "日", "seido_ref": "ikukyu-kyufu.json#data.shussanTeateKin.periodBeforeBirthMultiple.value", "status": "verified" },
    { "key": "sango_menjo.sango", "value": 56, "unit": "日", "seido_ref": "ikukyu-kyufu.json#data.shussanTeateKin.periodAfterBirth.value", "status": "verified" },
    { "key": "sango_menjo.ikuji_14nichi_rule", "value": 14, "unit": "日", "seido_ref": "ikukyu-kyufu.json#data.shakaiHokenryoMenjo.childcareLeave.fourteenDayRule.value", "status": "verified" },
    { "key": "sango_menjo.ikuji_taisho_nenrei", "value": 3, "unit": "歳", "status": "stub", "stub_reason": "育児休業等の保険料免除の対象年齢（3歳未満）は一次データ上テキストのvalueフィールドに格納されており、独立した数値ノードがないため個別確認が必要" }
  ],
  "last_updated": "2026-07-17",
  "next_check_due": "2026-10-01"
}
---

# 産前産後の社会保険料免除はいつからいつまで？

## 結論

産前産後休業を取っている期間は、健康保険と厚生年金保険の保険料が本人負担分・会社負担分ともに免除されます。対象になるのは、出産予定日を基準とした産前42日（多胎妊娠は98日）から、出産日の翌日を基準とした産後56日までの期間です。会社を通じて年金事務所などに申出をすることで免除が適用され、免除されていても年金の記録上は保険料を納めた期間として扱われます。

## 対象と金額

- **産前産後休業の免除期間**: 出産予定日（実際の出産が予定日後になった場合は出産日）以前42日（多胎妊娠は98日）から、出産日後56日までの範囲。この休業を開始した月から、休業が終わる日の翌日が属する月の前月までの保険料が免除されます。
- **育児休業等の免除期間**: 3歳未満の子を養育するための育児休業等を取得している間が対象です。休業の開始月と終了日翌日の属する月が異なる場合はその間の月の保険料が免除され、同じ月内であっても14日以上休業していればその月の保険料が免除されます。
- **免除される内容**: 健康保険料・厚生年金保険料の本人負担分・会社負担分の両方が免除の対象です。

## よくある疑問

- **免除されると将来の年金額が減る？** 免除されていても保険料を納めた期間として扱われるため、将来の年金額の計算上は不利になりません。
- **自分で手続きする必要がある？** 事業主（会社）が申出書を年金事務所などに提出する仕組みです。勤務先の担当部署に申出をしてもらう必要があります。
- **雇用保険の育休給付と同じ期間まで免除される？** 対象になる年齢の考え方が異なります。育児休業等の保険料免除は3歳未満の子を養育する期間まで対象になる点が特徴です。

## 出典・根拠

- デジタル庁 e-Gov法令検索「健康保険法（第159条・第159条の3）」
- 日本年金機構「厚生年金保険料等の免除（産前産後休業・育児休業等期間）」

---

最終更新日: 2026-07-17 ／ 準拠年度: 2026年度 ／ 出典: 上記「出典・根拠」参照

※本記事は一次情報をもとにした情報整理です。制度の適用にあたっては、必ず最新の公式情報・窓口でご確認ください。
