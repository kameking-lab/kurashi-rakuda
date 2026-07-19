---
{
  "id": "tool-narisou-kaigo-kyugyou-kyufukin",
  "title": "介護休業給付金はいくら？ 計算ツールの結果の読み方",
  "summary": "介護休業給付金計算ツールが、休業前の賃金と休業日数から給付額を求める考え方を解説します。上限額、休業中に賃金が出る場合の調整、結果に含まれない負担も確認できます。",
  "type": "tool-narisou",
  "category": "介護",
  "tool_ref": "kaigo-kyugyou-kyufukin",
  "persona": "ペルソナ5: 高橋京子（52歳・パート・親の介護が視野）",
  "solves": [
    "介護休業給付金がいくらもらえるか分からない",
    "介護休業を93日フルに取ったときの給付総額を知りたい",
    "休業中に会社から一部給与が出ると給付が減るのか知りたい",
    "賃金月額の上限額で給付が頭打ちになるラインを知りたい"
  ],
  "revision_year": 2026,
  "sources": [
    { "url": "https://www.mhlw.go.jp/content/11600000/001282596.pdf", "title": "介護休業給付の内容及び支給申請手続について（令和7年8月版）", "org": "厚生労働省・都道府県労働局・公共職業安定所", "accessed": "2026-07-18" },
    { "url": "https://laws.e-gov.go.jp/law/349AC0000000116", "title": "雇用保険法", "org": "e-Gov法令検索（デジタル庁）", "accessed": "2026-07-18" }
  ],
  "facts": [
    { "key": "kaigo_kyufukin.rate_display", "value": 67, "unit": "%", "seido_ref": "kaigo-kyugyou-kyufukin.json#data.shikyuGaku.rate", "status": "stub", "stub_reason": "制度データは支給率を小数0.67で保持しており、本文の百分率表示67%との×100の表示スケールを現行の照合器が変換できないため。" },
    { "key": "kaigo_kyufukin.monthly_max", "value": 356574, "unit": "円", "seido_ref": "kaigo-kyugyou-kyufukin.json#data.shikyuGaku.monthlyMax", "status": "verified" },
    { "key": "kaigo_kyufukin.max_days", "value": 93, "unit": "日", "seido_ref": "kaigo-kyugyou-kyufukin.json#data.leaveLimits.maxDays", "status": "verified" },
    { "key": "kaigo_kyufukin.max_count", "value": 3, "unit": "回", "seido_ref": "kaigo-kyugyou-kyufukin.json#data.leaveLimits.maxCount", "status": "verified" },
    { "key": "kaigo_kyufukin.insured_months", "value": 12, "unit": "ヶ月", "seido_ref": "kaigo-kyugyou-kyufukin.json#data.eligibility.insuredPeriodMonths", "status": "verified" },
    { "key": "kaigo_kyufukin.adjustment_display", "value": 80, "unit": "%", "status": "stub", "stub_reason": "休業中賃金との調整基準は一次資料で確認できるが、data/seidoの該当ノードが数値ではなく文章として保持され、機械照合できないため。" }
  ],
  "last_updated": "2026-07-18",
  "next_check_due": "2026-08-01",
  "audience": { "universal": false, "lifeStages": ["adult", "senior"], "lifeEvents": ["caregiving", "working"], "childAgeBands": [], "gender": null }
}
---

# 介護休業給付金はいくら？ 計算ツールの結果の読み方

## この記事はどのツールと対応している？

本記事は[介護休業給付金 計算](/tools/money/kaigo-kyugyou-kyufukin)に対応しています。休業開始前の平均月額賃金、休業日数、休業中に会社から支払われる賃金を入力し、支給対象期間ごとの給付額と総額の目安を確認するツールです。受給要件や対象家族を先に確認したい方は、[介護休業給付金の制度解説](/guide/care/seido-kaigo-kyugyou-kyufukin)もあわせてご覧ください。

## 計算の考え方

基本の考え方は「休業開始時賃金日額×支給日数×67%」です。ツールは入力した休業前の賃金を日額に直し、休業期間ごとの日数を掛けます。対象家族ごとに通算93日、3回までという範囲で計算するため、分割して休む場合は各期間を分けて入力します。

賃金には制度上の上限・下限があります。上限に達した場合、入力した賃金がさらに高くても給付額は同じです。2026年7月時点の1支給対象期間の上限は356,574円ですが、この額は毎年8月に改定されるため、実際の申請では休業開始日に適用される額を確認してください。

休業中に会社から賃金が支払われる場合は単純な足し算にはなりません。休業開始時賃金月額の80%以上が支払われる期間は給付されず、それ未満でも支払額に応じて給付が調整されます。ツールは入力された休業中賃金をこの判定に使います。

## 結果の読み方

「給付見込額」は、入力条件を制度式に当てはめた概算です。「調整後」と表示された期間は、会社からの賃金を反映して給付が減っていることを示します。上限適用の表示がある場合は、入力賃金ではなく制度上の上限額を用いています。

表示額は雇用保険からの給付だけです。休業中の健康保険料・厚生年金保険料は育児休業と異なり免除されないため、家計の手取り見通しでは別に見込む必要があります。また、休業取得の権利と給付の受給要件は別です。開始前2年間に被保険者期間が12か月以上あることなどを勤務先またはハローワークに確認してください。

## よくある疑問

**93日分をまとめて受け取る計算だけできますか？** できます。ただし介護休業を分割する予定なら、実際の各休業期間と会社から出る賃金を期間ごとに入力したほうが調整を反映しやすくなります。

**ツールの結果がそのまま振込額になりますか？** なりません。賃金支払状況や被保険者記録をもとにハローワークが決定します。結果は勤務先への相談と申請準備の目安として使ってください。

**介護休業を取れれば必ず給付も出ますか？** 必ずではありません。介護休業は育児・介護休業法、給付は雇用保険法に基づく別制度で、給付には被保険者期間などの要件があります。

## 出典・根拠

- 厚生労働省・都道府県労働局・公共職業安定所「介護休業給付の内容及び支給申請手続について」
- e-Gov法令検索「雇用保険法」

---

最終更新日: 2026-07-18 ／ 準拠年度: 2026年度 ／ 出典: 上記「出典・根拠」参照

※本記事とツールは一次情報をもとにした概算です。実際の支給可否・支給額は勤務先とハローワークにご確認ください。
