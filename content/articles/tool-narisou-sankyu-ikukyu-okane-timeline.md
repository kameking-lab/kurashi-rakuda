---
{
  "id": "tool-narisou-sankyu-ikukyu-okane-timeline",
  "title": "産休・育休のお金の流れ｜手当金・一時金・給付金タイムライン",
  "summary": "産休・育休中は、出産育児一時金・出産手当金・育児休業給付金という3種類のお金が、それぞれ違うタイミング・条件で支給される。あわせて社会保険料の免除も重なるため、時系列で流れを整理する。",
  "type": "tool-narisou",
  "category": "妊娠・出産",
  "tool_ref": "sankyu-ikukyu-money",
  "persona": "ペルソナ4: 鈴木奈々（34歳・妊活→プレママ）",
  "solves": [
    "産休育休中の収入が総額いくらか分からない",
    "給付金がいつ振り込まれるか分からない"
  ],
  "revision_year": 2026,
  "sources": [
    {
      "url": "https://www.kyoukaikenpo.or.jp/benefit/childbirth/001/index.html",
      "title": "出産手当金",
      "org": "全国健康保険協会（協会けんぽ）",
      "accessed": "2026-07-17"
    },
    {
      "url": "https://www.kyoukaikenpo.or.jp/benefit/childbirth/002/index.html",
      "title": "出産育児一時金",
      "org": "全国健康保険協会（協会けんぽ）",
      "accessed": "2026-07-17"
    },
    {
      "url": "https://www.hellowork.mhlw.go.jp/insurance/insurance_childcareleave.html",
      "title": "育児休業等給付について",
      "org": "ハローワークインターネットサービス（厚生労働省）",
      "accessed": "2026-07-17"
    },
    {
      "url": "https://www.nenkin.go.jp/service/kounen/hokenryo/menjo/20140122-01.html",
      "title": "厚生年金保険料等の免除（産前産後休業・育児休業等期間）",
      "org": "日本年金機構",
      "accessed": "2026-07-17"
    }
  ],
  "facts": [
    {
      "key": "timeline.shussan_teate_sanzen",
      "value": 42,
      "unit": "日",
      "seido_ref": "ikukyu-kyufu.json#data.shussanTeateKin.periodBeforeBirth.value",
      "status": "verified"
    },
    {
      "key": "timeline.shussan_teate_sango",
      "value": 56,
      "unit": "日",
      "seido_ref": "ikukyu-kyufu.json#data.shussanTeateKin.periodAfterBirth.value",
      "status": "verified"
    },
    {
      "key": "timeline.shussan_ichijikin_gaku",
      "value": 500000,
      "unit": "円",
      "seido_ref": "ikukyu-kyufu.json#data.shussanIkujiIchijikin.amount.value",
      "status": "verified"
    },
    {
      "key": "timeline.ikuji_kyugyo_180nichi_made",
      "value": 67,
      "unit": "%",
      "seido_ref": "ikuji-kyugyou-kyufu.json#kyufu_ritsu.kaishi_kara_180nichi_made",
      "status": "verified"
    },
    {
      "key": "timeline.ikuji_kyugyo_181nichime_ikou",
      "value": 50,
      "unit": "%",
      "seido_ref": "ikuji-kyugyou-kyufu.json#kyufu_ritsu.181nichime_ikou",
      "status": "verified"
    },
    {
      "key": "timeline.ikuji_kyugyo_kirikae",
      "value": 180,
      "unit": "日",
      "seido_ref": "ikuji-kyugyou-kyufu.json#kirikae_nissu",
      "status": "verified"
    },
    {
      "key": "timeline.hoken_menjo_14nichi",
      "value": 14,
      "unit": "日",
      "seido_ref": "ikukyu-kyufu.json#data.shakaiHokenryoMenjo.childcareLeave.fourteenDayRule.value",
      "status": "verified"
    }
  ],
  "last_updated": "2026-07-17",
  "next_check_due": "2026-10-01",
  "audience": {
    "universal": false,
    "lifeStages": [
      "pregnancy",
      "newborn"
    ],
    "lifeEvents": [
      "pregnant",
      "parenting",
      "working"
    ],
    "childAgeBands": [
      "prenatal",
      "age0_1"
    ],
    "gender": null
  }
}
---

# 産休・育休のお金の流れ｜手当金・一時金・給付金タイムライン

## この記事はどのツールと対応している？

「産休・育休のお金シミュレーター」ツールと対応しています。出産・産休・育休の間に受け取れる出産育児一時金・出産手当金・育児休業給付金の目安と、社会保険料が免除される期間を、時系列に沿ってまとめて確認できます。

## 計算の考え方

産休・育休の間に関わるお金の制度は、大きく分けて3つあります。それぞれ支給されるタイミングや条件が異なるため、ツールでは時系列で並べて計算します。

- **出産育児一時金**: 出産したときに、出産費用にあてるためのお金として1児につき50万円が目安として支給されます。直接支払制度を使えば、医療機関が本人に代わって受け取るため、出産のタイミングでまとめて計算します。
- **出産手当金**: 出産予定日以前42日から出産日後56日までの期間のうち、会社を休んで給与が出なかった日について支給されます。ツールでは、この産前・産後の期間を出産日から逆算・順算して計算します。
- **育児休業給付金**: 産休が終わり育児休業に入ったあとに支給されます。育休を開始してから通算180日目までは休業前賃金の67%、それ以降は50%という支給率の切り替えを、休業開始日からの経過日数で計算します。

あわせて、産前産後休業や育児休業等の期間は社会保険料が免除されます。育児休業の場合、月の末日時点で休業中でなくても、同じ月の中で14日以上休業していれば免除の対象になるため、ツールでは休業日数もあわせて表示します。

## 結果の読み方

ツールの結果画面には、出産日を起点にしたタイムラインの上に、それぞれの制度がいつからいつまで関わるかが並びます。

- **出産育児一時金の欄**: 出産したタイミングでまとめて計算される金額です。
- **出産手当金の欄**: 産前・産後それぞれの期間のうち、給与が出なかった日数分の目安額です。
- **育児休業給付金の欄**: 育休開始からの経過日数に応じて、支給率が67%の期間と50%の期間に自動で分かれて表示されます。
- **社会保険料免除の欄**: 産前産後休業・育児休業のそれぞれで、保険料が免除される月がハイライトされます。

金額はいずれも目安であり、実際の受給額・受給可否は加入している健康保険や雇用保険の被保険者期間などの条件によって変わります。

## よくある疑問

- **出産手当金と育児休業給付金は同時にもらえる？** 対象になる期間が異なるため、通常は産休中は出産手当金、育休中は育児休業給付金という形で時期がずれて支給されます。
- **社会保険料免除の期間はどう決まる？** 産前産後休業は出産日を基準にした日数、育児休業等は月単位や同月内14日以上といった別のルールで決まります。ツールではそれぞれ別々に判定して表示しています。

## 出典・根拠

- 全国健康保険協会（協会けんぽ）「出産手当金」「出産育児一時金」
- ハローワークインターネットサービス「育児休業等給付について」
- 日本年金機構「厚生年金保険料等の免除（産前産後休業・育児休業等期間）」

---

最終更新日: 2026-07-17 ／ 準拠年度: 2026年度 ／ 出典: 上記「出典・根拠」参照

※本記事は一次情報をもとにした情報整理です。個別の状況については必ず最新の公式情報・窓口でご確認ください。
