---
{
  "id": "seido-fuyou-no-kabe-103-106-130-2026",
  "title": "扶養の壁（103/106/130万）は2026年どう変わった？",
  "summary": "所得税がかかり始める年収ラインは2025年分で160万円、2026年分（令和8年分）からは特例で178万円に引き上げられた。いわゆる106万円の壁（社会保険加入の賃金要件）は2026年10月に撤廃される予定で、被扶養者認定の130万円は変わらない。",
  "type": "seido-kaisetsu",
  "category": "お金",
  "tool_ref": "fuyo-kabe",
  "persona": "ペルソナ2: 田中絵里（36歳・ワーママ・時短勤務）",
  "solves": [
    "2026年の年収の壁の変更点が分からない",
    "103万円の壁がどうなったのか分からない",
    "106万円の壁がいつなくなるのか分からない",
    "扶養内でいくらまで働けるか分からない",
    "106万・130万の壁を超えると損か得か分からない"
  ],
  "revision_year": 2026,
  "sources": [
    {
      "url": "https://www.nta.go.jp/publication/pamph/gensen/2026kaisei.pdf",
      "title": "源泉所得税の改正のあらまし（令和8年4月）",
      "org": "国税庁",
      "accessed": "2026-07-21",
      "verify": {
        "expect": ["基礎控除の引上げ"]
      }
    },
    {
      "url": "https://www.nenkin.go.jp/service/kounen/tekiyo/jigyosho/tanjikan.html",
      "title": "短時間労働者に対する健康保険・厚生年金保険の適用拡大",
      "org": "日本年金機構",
      "accessed": "2026-07-21",
      "verify": {
        "expect": ["令和8年10月に撤廃予定です"]
      }
    },
    {
      "url": "https://www.nenkin.go.jp/service/kounen/tekiyo/hihokensha1/20141202.html",
      "title": "健康保険の被扶養者の認定基準",
      "org": "日本年金機構",
      "accessed": "2026-07-21",
      "verify": {
        "expect": ["130万円未満"]
      }
    }
  ],
  "facts": [
    {
      "key": "fuyou.kyu_103man",
      "value": 1030000,
      "unit": "円",
      "status": "stub",
      "stub_reason": "引き上げ前（旧基準）の参考値。data/seido/fuyou-kabe.json の walls.items[1].legacyName に文字列としてのみ記録され、独立した数値ノードが存在しないため機械照合対象外（本文では比較のための参考値として言及）。"
    },
    {
      "key": "fuyou.kyu_160man",
      "value": 1600000,
      "unit": "円",
      "status": "stub",
      "stub_reason": "令和7年分（2025年分）の課税最低限。fuyou-kabe.json の walls.items[1].legacyName と amendments の summary に文字列として記録されている改正経緯の参考値。"
    },
    {
      "key": "fuyou.shotokuzei_178man",
      "value": 1780000,
      "unit": "円",
      "seido_ref": "fuyou-kabe.json#data.walls.items.1.amount2026",
      "status": "verified"
    },
    {
      "key": "fuyou.tokurei_go_168man",
      "value": 1680000,
      "unit": "円",
      "status": "stub",
      "stub_reason": "令和10年分以後の課税最低限（特例失効後）。fuyou-kabe.json の amendments に文字列として記録（給与所得控除の最低保障額69万円＋基礎控除99万円）。"
    },
    {
      "key": "fuyou.shaho_106man",
      "value": 1060000,
      "unit": "円",
      "seido_ref": "fuyou-kabe.json#data.walls.items.6.amount2026",
      "status": "verified"
    },
    {
      "key": "fuyou.shaho_gessu_88sen",
      "value": 88000,
      "unit": "円",
      "seido_ref": "fuyou-kabe.json#data.socialInsurance.shortTimeWorker.monthlyWageThreshold.value",
      "status": "verified"
    },
    {
      "key": "fuyou.hifuyousha_130man",
      "value": 1300000,
      "unit": "円",
      "seido_ref": "fuyou-kabe.json#data.socialInsurance.dependentCertification.annualIncomeThreshold.value",
      "status": "verified"
    },
    {
      "key": "fuyou.hifuyousha_150man_19to22",
      "value": 1500000,
      "unit": "円",
      "seido_ref": "fuyou-kabe.json#data.socialInsurance.dependentCertification.annualIncomeThreshold19to22.value",
      "status": "verified"
    },
    {
      "key": "fuyou.hifuyousha_180man_korei",
      "value": 1800000,
      "unit": "円",
      "seido_ref": "fuyou-kabe.json#data.socialInsurance.dependentCertification.annualIncomeThresholdElderlyOrDisabled.value",
      "status": "verified"
    },
    {
      "key": "fuyou.age_19",
      "value": 19,
      "unit": "歳",
      "status": "stub",
      "stub_reason": "被扶養者認定150万円特例の対象年齢の下限。データでは annualIncomeThreshold19to22 のキー名・注記として保持され、独立した数値ノードがないため。"
    },
    {
      "key": "fuyou.age_23",
      "value": 23,
      "unit": "歳",
      "status": "stub",
      "stub_reason": "同上（対象年齢の上限。19歳以上23歳未満）。"
    },
    {
      "key": "fuyou.age_60",
      "value": 60,
      "unit": "歳",
      "status": "stub",
      "stub_reason": "被扶養者認定180万円基準の対象年齢。データでは annualIncomeThresholdElderlyOrDisabled の注記として保持。"
    },
    {
      "key": "fuyou.haigusha_mangaku_159man",
      "value": 1590000,
      "unit": "円",
      "seido_ref": "fuyou-kabe.json#data.haiguushaTokubetsuKoujo.fullAmountSalaryLine.value",
      "status": "verified"
    },
    {
      "key": "fuyou.haigusha_shoshitsu_207man",
      "value": 2070000,
      "unit": "円",
      "seido_ref": "fuyou-kabe.json#data.haiguushaTokubetsuKoujo.vanishSalaryLine.value",
      "status": "verified"
    },
    {
      "key": "fuyou.haigusha_shoshitsu_kyu_201man",
      "value": 2010000,
      "unit": "円",
      "status": "stub",
      "stub_reason": "令和7年分（2025年分）までの配偶者特別控除の旧消失ライン（201万5,999円の通称）。改正経緯の説明のための言及であり、2026年分の制度値ではないため data/ には保持しない。根拠は fuyou-kabe.json の haiguushaTokubetsuKoujo.vanishSalaryLine.amendmentNote を参照。"
    }
  ],
  "last_updated": "2026-07-17",
  "next_check_due": "2026-10-01",
  "audience": {
    "universal": false,
    "lifeStages": [
      "adult"
    ],
    "lifeEvents": [
      "working"
    ],
    "childAgeBands": [],
    "gender": null
  }
}
---

# 扶養の壁（103/106/130万）は2026年どう変わった？

## 結論

かつて「103万円の壁」と呼ばれていた、本人に所得税がかかり始める年収ラインは、2025年分（令和7年分）で160万円に引き上げられ、2026年分（令和8年分）からは期限付きの特例でさらに178万円になりました。一方、「106万円の壁」と呼ばれてきた社会保険加入の賃金要件は2026年10月に撤廃される予定で、健康保険の扶養に入れる上限（130万円）は変わっていません。壁ごとに根拠となる制度が違うため、分けて確認するのが確実です。

## 対象と金額

- **所得税の壁（旧・103万円の壁）**: 基礎控除と給与所得控除の引き上げにより、2025年分で160万円になり、2026年分からは178万円が課税最低限です。「103万円の壁」はもう存在しません。ただし178万円は令和8・9年分（2026・2027年分）限りの特例で、令和10年分以後は168万円になる予定です。また、この改正の施行は2026年12月のため、2026年11月までの毎月の給与から引かれる所得税（源泉徴収）は従来どおりで、12月の年末調整で1年分がまとめて精算されます。「毎月の手取りがすぐ増える」わけではない点にご注意ください。
- **社会保険加入の壁（いわゆる106万円の壁）**: 勤務先の健康保険・厚生年金への加入対象になるかどうかの基準です。法令上「年収106万円」という基準はなく、実際の判定は月額8.8万円以上の所定内賃金（残業代・賞与・通勤手当を含まない）などの要件で行われます。**この賃金要件は2026年10月に撤廃される予定**で、撤廃後は週の労働時間や勤務先の規模などの要件を満たせば、賃金額にかかわらず加入対象になります。
- **被扶養者認定の壁（130万円）**: 配偶者や親の健康保険の被扶養者でいられる年間収入の基準です。これを超えると自分自身で社会保険に加入する必要があります。19歳以上23歳未満の方は150万円未満、60歳以上の方や障害のある方は180万円未満と、対象により基準が異なります。
- **配偶者特別控除の壁**: 配偶者の給与収入が159万円以下なら配偶者特別控除が満額になり、207万円を超えると控除がなくなります（満額になるのは、扶養する方の所得が一定以下の場合です）。2025年分までの基準は150万円・201万円でしたが、2026年分の税制改正でそれぞれ159万円・207万円に引き上げられました。

## よくある疑問

- **103万円の壁はもうなくなった？** はい。所得税の課税最低限としては2025年分で160万円、2026年分からは178万円に置き換わりました。なお、扶養控除・配偶者特別控除（いずれも所得税の制度）や、社会保険の加入・被扶養者の基準は、これとは別の金額でそれぞれ決まっています。
- **106万円と130万円はどう違う？** 106万円は勤務先の社会保険に加入するかどうかの通称の壁（実際は月額8.8万円などで判定）、130万円は配偶者・親の扶養から外れて自分で社会保険に入るかどうかの壁で、根拠となる制度が異なります。前者の賃金要件は2026年10月に撤廃予定です。
- **配偶者特別控除の壁を超えたらどうなる？** 159万円を超えると控除額が段階的に減り、207万円を超えるとゼロになります。急に手取りが減る「崖」ではなく、なだらかに変化する仕組みです。
- **壁を超えたら必ず損？** 社会保険に加入すると将来の年金が増えるなどのメリットもあるため、単純な損得だけでは判断できません。

## 出典・根拠

- 国税庁「源泉所得税の改正のあらまし（令和8年4月）」
- 日本年金機構「短時間労働者に対する健康保険・厚生年金保険の適用拡大」
- 日本年金機構「健康保険の被扶養者の認定基準」

---

最終更新日: 2026-07-17 ／ 準拠年度: 2026年度 ／ 出典: 上記「出典・根拠」参照

※本記事は一次情報をもとにした情報整理です。制度の適用にあたっては、必ず最新の公式情報・窓口でご確認ください。
