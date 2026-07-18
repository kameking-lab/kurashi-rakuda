# 不妊治療 保険適用・回数・費用早見（P2-T11）

簡易仕様書（数式・境界値・出典のみ）。

- **docs/02**: #8（カテゴリ「お金」寄りだが妊娠関連。category は `pregnancy`）
- **queueId**: P2-T11
- **slug**: `funin-chiryou-hoken-tekiyou`
- **category**: `pregnancy`
- **難易度**: S（年齢上限・初回年齢基準の回数上限・非算出費用の線引き）
- **YMYL区分**: 中（保険適用の目安。適用可否は医療機関が判断）
- **SSOT**: `data/seido/funin-chiryou-hoken-tekiyou.json`（令和4年4月〜の保険適用）。

## 概要

生殖補助医療（体外受精・顕微授精）の保険適用の年齢上限・回数上限をチェックする。年齢上限は治療開始日に女性43歳未満。回数上限は**初めての治療開始日の年齢**で決まり、40歳未満なら通算6回、40〜43歳未満なら3回。子ども1人ごとにリセット。任意で保険総額（10割）から3割の窓口負担を計算する。★総額・高額療養費限度額は算出しない（データにない）★。

## 入力仕様

| フィールド | 型 | 必須 | ルール |
|---|---|---|---|
| `currentAge`（今回の治療開始年齢） | number | 必須 | 0以上。43未満で年齢適用 |
| `firstAge`（初回治療開始年齢） | number | 任意 | 未指定なら currentAge。回数上限の判定に使う |
| `priorTransfers`（これまでの胚移植回数） | number | 必須 | 0以上 |
| `totalTenWari`（保険総額10割・円） | number | 任意 | 指定時のみ3割負担を計算 |

## ロジック仕様

```
eligibleByAge = currentAge < 43（UPPER_AGE_LIMIT）

countLimit:
  firstAge ≥ 43 → 0（対象外）
  firstAge < 40（AGE_BOUNDARY） → 6（UNDER40_LIMIT）
  else → 3（AGE40_TO43_LIMIT）

remaining      = max(0, countLimit − priorTransfers)
canReceiveMore = eligibleByAge && remaining > 0
copayment      = totalTenWari 指定時のみ floor(totalTenWari × 0.3)、なければ null
```

## テストケース表（tests/funin-chiryou-hoken-tekiyou.test.ts）

| # | 入力 | 期待 |
|---|---|---|
| 3 | 43歳 | eligibleByAge=false |
| 4 | 初回39歳 | 上限6回 |
| 5 | 初回40歳 | 上限3回 |
| 6 | 初回39・現在41・4回実施 | 上限6・残り2 |
| 9 | 初回43歳 | 上限0 |
| 11 | 総額50万 | 3割15万 |

## このツールが行わないこと

- 生殖補助医療の総額の提示（治療内容で大きく変動・データなし）。
- 高額療養費の自己負担限度額の計算（所得区分次第・highCostMedicalExpenseLimit=null）。
- 第三者提供・代理懐胎・先進医療の可否判断（対象外/併用可を文章で案内）。

## 出典

`data/seido/funin-chiryou-hoken-tekiyou.json` の `sources`（厚労省 不妊治療の保険適用・中医協資料・e-Gov健康保険法）。
