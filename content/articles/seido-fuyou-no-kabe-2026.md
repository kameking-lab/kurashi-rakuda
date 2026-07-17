---
{
  "id": "seido-fuyou-no-kabe-2026",
  "title": "扶養の壁2026 — 106万・130万・159万・207万円の意味の違い",
  "summary": "パート主婦(夫)が意識する年収の壁は、社会保険加入の目安106万円（賃金要件は2026年10月撤廃予定）、被扶養者認定の130万円、配偶者特別控除の159万円・207万円（2026年分の税制改正で150万円・201万円から変更）に整理できる。本人の所得税の壁は178万円に引き上げ済み。",
  "type": "seido-kaisetsu",
  "category": "お金",
  "tool_ref": "fuyo-kabe",
  "persona": "パートで働く配偶者",
  "revision_year": 2026,
  "sources": [
    { "url": "https://www.nenkin.go.jp/service/kounen/tekiyo/jigyosho/tanjikan.html", "title": "短時間労働者に対する健康保険・厚生年金保険の適用拡大", "org": "日本年金機構", "accessed": "2026-07-17" },
    { "url": "https://www.nenkin.go.jp/service/kounen/tekiyo/hihokensha1/20141202.html", "title": "健康保険の被扶養者の認定基準", "org": "日本年金機構", "accessed": "2026-07-17" },
    { "url": "https://www.nta.go.jp/publication/pamph/gensen/2026kaisei.pdf", "title": "源泉所得税の改正のあらまし（令和8年4月）", "org": "国税庁", "accessed": "2026-07-17" }
  ],
  "facts": [
    { "key": "fuyou.shakai_hoken", "value": 1060000, "unit": "円", "seido_ref": "fuyou-no-kabe.json#kabe_en.shakai_hoken_kanyu_meyasu", "status": "verified" },
    { "key": "fuyou.shakai_hoken_getsugaku", "value": 88000, "unit": "円", "seido_ref": "fuyou-kabe.json#data.socialInsurance.shortTimeWorker.monthlyWageThreshold.value", "status": "verified" },
    { "key": "fuyou.hifuyousha", "value": 1300000, "unit": "円", "seido_ref": "fuyou-no-kabe.json#kabe_en.hifuyousha_ninnei", "status": "verified" },
    { "key": "fuyou.tokubetsu_koujo_man", "value": 1590000, "unit": "円", "seido_ref": "fuyou-kabe.json#data.haiguushaTokubetsuKoujo.fullAmountSalaryLine.value", "status": "verified" },
    { "key": "fuyou.tokubetsu_koujo_shoushitsu", "value": 2070000, "unit": "円", "seido_ref": "fuyou-kabe.json#data.haiguushaTokubetsuKoujo.vanishSalaryLine.value", "status": "verified" },
    { "key": "fuyou.tokubetsu_koujo_man_kyuu", "value": 1500000, "unit": "円", "status": "stub", "stub_reason": "令和7年分（2025年分）までの旧満額ライン。改正経緯の説明のための言及であり、2026年分の制度値ではないため data/ には保持しない。根拠は fuyou-kabe.json の haiguushaTokubetsuKoujo.fullAmountSalaryLine.amendmentNote を参照。" },
    { "key": "fuyou.tokubetsu_koujo_shoushitsu_kyuu", "value": 2010000, "unit": "円", "status": "stub", "stub_reason": "令和7年分（2025年分）までの旧消失ライン（201万5,999円の通称）。改正経緯の説明のための言及。根拠は fuyou-kabe.json の haiguushaTokubetsuKoujo.vanishSalaryLine.amendmentNote を参照。" },
    { "key": "fuyou.shotokuzei_kazei_saitei", "value": 1780000, "unit": "円", "seido_ref": "fuyou-kabe.json#data.walls.items.1.amount2026", "status": "verified" },
    { "key": "fuyou.kyu_103man", "value": 1030000, "unit": "円", "status": "stub", "stub_reason": "引き上げ前（旧基準）の通称。fuyou-kabe.json の walls.items[1].legacyName に文字列として記録されている改正経緯の参考値。" }
  ],
  "last_updated": "2026-07-17",
  "next_check_due": "2026-10-01"
}
---

# 扶養の壁2026 — 106万・130万・159万・207万円の意味の違い

## 結論

「年収の壁」と呼ばれるものは1つではなく、目的の違う複数の壁が重なっています。106万円は社会保険加入の通称の壁（実際は月額8.8万円などで判定。**この賃金要件は2026年10月に撤廃予定**）、130万円は健康保険の被扶養者に入れる上限、159万円と207万円は配偶者特別控除の金額が変わる境目です。配偶者特別控除の2つのラインは、2026年分（令和8年分）の税制改正で従来の「150万円・201万円」から引き上げられました。なお、かつて最も有名だった「103万円の壁」（本人に所得税がかかるライン）は、現在は178万円まで引き上げられており、この4つの壁とは別の話です。

## 対象と金額

- **106万円**: 一定規模以上の企業で働く場合、社会保険への加入が必要になる年収の目安です。法令上の判定は年収ではなく月額8.8万円以上の所定内賃金（残業代・賞与・通勤手当を含まない）などの要件で行われます。**この賃金要件は2026年10月に撤廃される予定**で、撤廃後は賃金額にかかわらず、労働時間・企業規模などの要件で加入が決まります。
- **130万円**: これを超えると配偶者の健康保険の扶養から外れ、自分で社会保険に加入する必要が出てきます。税と違い「これから1年間の見込み収入」で判定されます。
- **159万円**: この金額までは配偶者特別控除が満額適用されます（2025年分までは150万円。満額になるのは、扶養する方の所得が一定以下の場合です）。
- **207万円**: これを超えると配偶者特別控除がなくなります（2025年分までは201万円）。

## よくある疑問

- **106万円と130万円、両方気にする必要がある？** 勤務先の規模や労働時間によって、どちらの壁が先に関係してくるかが変わります。2026年10月の賃金要件撤廃後は、130万円（被扶養者認定）の壁の方が主な分かれ目になる方が増えます。ご自身の勤務条件を出典の資料と照らし合わせてご確認ください。
- **壁を超えたら必ず損？** 社会保険に加入すると将来の年金が増えるなどのメリットもあるため、単純な損得だけでは判断できません。
- **本人の所得税はいくらからかかる？** 2026年分（令和8年分）からは年収178万円までは所得税がかかりません（期間限定の特例を含む金額です）。

## 出典・根拠

- 日本年金機構「短時間労働者に対する健康保険・厚生年金保険の適用拡大」
- 日本年金機構「健康保険の被扶養者の認定基準」
- 国税庁「源泉所得税の改正のあらまし（令和8年4月）」

---

最終更新日: 2026-07-17 ／ 準拠年度: 2026年度 ／ 出典: 上記「出典・根拠」参照

※本記事は一次情報をもとにした情報整理です。制度の適用にあたっては、必ず最新の公式情報・窓口でご確認ください。
