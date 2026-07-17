---
{
  "id": "tool-narisou-pms-yosoku-shikumi",
  "title": "PMS・体調予測カレンダーはどう使う？周期連動の仕組み",
  "summary": "PMS（月経前症候群）の症状が出やすい期間を、月経周期・排卵日予測ツール（seiri-shuki）が計算する次回月経開始予定日から日数を逆算して示す仕組みを解説する。",
  "type": "tool-narisou",
  "category": "健康・美容",
  "tool_ref": "seiri-shuki",
  "persona": "ペルソナ3: 山本遥（29歳・独身・総合職）",
  "solves": [
    "PMSの体調不良がいつ来るか予測できない",
    "生理前のイライラや不調が生理のせいだと気づけない",
    "体調が悪くなりそうな時期を先に知って予定を調整したい"
  ],
  "revision_year": 2026,
  "sources": [
    {
      "url": "https://kennet.mhlw.go.jp/slp/event/womens_health/2021/lecture1.html",
      "title": "女性ホルモンとうまく付き合っていくには？〜増える月経トラブルとその対処法を基礎から知ろう〜",
      "org": "厚生労働省（スマート・ライフ・プロジェクト／健康日本21アクション支援システム）",
      "accessed": "2026-07-17"
    },
    {
      "url": "https://kennet.mhlw.go.jp/information/information/heart/k-02-005.html",
      "title": "女性の睡眠障害",
      "org": "厚生労働省（健康日本21アクション支援システム）",
      "accessed": "2026-07-17"
    },
    {
      "url": "https://w-health.jp/monthly/pms/",
      "title": "PMS（月経前症候群）",
      "org": "厚生労働省事業「女性の健康推進室 ヘルスケアラボ」（厚生労働省研究班監修）",
      "accessed": "2026-07-17"
    }
  ],
  "facts": [
    {
      "key": "pms.onset_days_from",
      "value": 3,
      "unit": "日",
      "seido_ref": "pms-yosoku-shikumi.json#pmsDefinition.onsetBeforeMenstruationDaysFrom",
      "status": "verified"
    },
    {
      "key": "pms.onset_days_to",
      "value": 10,
      "unit": "日",
      "seido_ref": "pms-yosoku-shikumi.json#pmsDefinition.onsetBeforeMenstruationDaysTo",
      "status": "verified"
    },
    {
      "key": "pms.prevalence_percent_from",
      "value": 2,
      "unit": "%",
      "seido_ref": "pms-yosoku-shikumi.json#pmsDefinition.prevalence.valueFromPercent",
      "status": "verified"
    },
    {
      "key": "pms.prevalence_percent_to",
      "value": 10,
      "unit": "%",
      "seido_ref": "pms-yosoku-shikumi.json#pmsDefinition.prevalence.valueToPercent",
      "status": "verified"
    },
    {
      "key": "cycle.luteal_phase_days",
      "value": 14,
      "unit": "日",
      "seido_ref": "pms-yosoku-shikumi.json#menstrualCycle.lutealPhase.approximateLengthDays",
      "status": "verified"
    },
    {
      "key": "cycle.normal_days_from",
      "value": 25,
      "unit": "日",
      "seido_ref": "pms-yosoku-shikumi.json#menstrualCycle.normalCycleDaysFrom",
      "status": "verified"
    },
    {
      "key": "cycle.normal_days_to",
      "value": 38,
      "unit": "日",
      "seido_ref": "pms-yosoku-shikumi.json#menstrualCycle.normalCycleDaysTo",
      "status": "verified"
    },
    {
      "key": "cycle.irregular_short_threshold_days",
      "value": 24,
      "unit": "日",
      "seido_ref": "pms-yosoku-shikumi.json#cycleAbnormalities.list.0.thresholdDays",
      "status": "verified"
    },
    {
      "key": "cycle.irregular_long_threshold_days",
      "value": 39,
      "unit": "日",
      "seido_ref": "pms-yosoku-shikumi.json#cycleAbnormalities.list.1.thresholdDays",
      "status": "verified"
    }
  ],
  "last_updated": "2026-07-17",
  "next_check_due": "2027-07-01"
}
---

# PMS・体調予測カレンダーはどう使う？周期連動の仕組み

## この記事はどのツールと対応している？

本記事は「生理周期・排卵日予測」ツール（seiri-shuki）に対応する解説記事です。このツールは、前回の月経開始日と周期日数をもとに、次回の月経開始予定日と排卵日の目安を日付計算で示します。PMS（月経前症候群）の体調不良は、この次回月経開始予定日を基準にした一定の期間に出やすいことが分かっているため、ツールが算出する次回月経開始予定日に日数を重ねることで、PMSの注意期間を示すのが本記事の考え方です。

## 計算の考え方

前提になるのは月経周期の考え方です。月経周期は月経が始まった日から次の月経の前日までの日数を指し、正常な範囲は25日から38日程度とされています。ツールは、前回の月経開始日にこの周期日数を足して、次回の月経開始予定日を計算します。

排卵は周期の途中で起こり、排卵から次の月経が始まるまでの黄体期はおよそ14日とされています。そのため排卵日の目安は、次回月経開始予定日から14日さかのぼった日として計算できます。

日本産科婦人科学会の定義では、PMSは次回の月経開始予定日の3日前から10日前ごろにかけて出やすい精神的・身体的な症状で、月経が始まるとともに軽くなる、または消えるとされています。PMSは月経がある人の2%から10%程度に起こるとされています。本記事のPMS注意期間は、ツールが計算する次回月経開始予定日から3日前・10日前の日付をそのまま示しているだけで、症状の有無や重さを判定する別の計算式は使っていません。

## 結果の読み方

ツールが示す次回月経開始予定日・排卵日・PMS注意期間は、記録された周期をもとにした日付計算の目安であり、医学的な診断ではありません。症状の出方や体感には個人差が大きく、ストレスや体調によって前後することもあります。

周期が24日以内や39日以上の場合は、月経周期そのものが不規則である可能性があり、日付計算の前提が崩れます。この場合はカレンダーの予測を過信せず、産婦人科に相談することをおすすめします。月経前後の不調が続く場合や、症状が重く日常生活に影響する場合も、我慢せず産婦人科に相談してください。症状が強い場合は、PMSの重い形である月経前不快気分障害（PMDD）の可能性もあります。

## 出典・根拠

- 厚生労働省「女性ホルモンとうまく付き合っていくには？〜増える月経トラブルとその対処法を基礎から知ろう〜」（スマート・ライフ・プロジェクト／健康日本21アクション支援システム）
- 厚生労働省「女性の睡眠障害」（健康日本21アクション支援システム）
- 厚生労働省事業「女性の健康推進室 ヘルスケアラボ」（厚生労働省研究班監修）「PMS（月経前症候群）」

---
最終更新日: 2026-07-17 ／ 準拠年度: 2026年度 ／ 出典: 上記「出典・根拠」参照

※本記事は一次情報をもとにした情報整理です。個別の状況については自治体・専門機関に確認してください。
