# 介護休業給付金 計算（P2-T05）

簡易仕様書（数式・境界値・出典のみ）。

- **docs/02**: #91（カテゴリ「介護」寄りだが給付金計算のため category は `money`）
- **queueId**: P2-T05
- **slug**: `kaigo-kyugyou-kyufukin`
- **category**: `money`
- **難易度**: S（賃金クランプ・支給単位期間分割・80%調整）
- **YMYL区分**: 中（給付額の目安。被保険者期間要件の充足判定は行わない）
- **SSOT**: `data/seido/kaigo-kyugyou-kyufukin.json`（雇用保険法第61条の4・令和8年度）。★上限額356,574円は毎年8月1日改定★。

## 概要

介護休業開始前6か月の平均月額賃金と休業日数から、介護休業給付金の総額を計算する。支給額＝休業開始時賃金日額×支給日数×67%。賃金月額（＝賃金日額×30）は上限532,200円・下限90,420円でクランプ。休業は支給単位期間（各1か月＝30日、最終期間は実日数）に分割し、通算93日を上限とする。任意で休業中の賃金支払（80%調整）・離職予定・対象家族該当を加味する。

## 入力仕様

| フィールド | 型 | 必須 | ルール |
|---|---|---|---|
| `monthlyWage`（平均月額賃金・円） | number | 必須 | >0。賃金日額＝monthlyWage/30 |
| `leaveDays`（休業日数） | number | 必須 | 1以上。93超は93に切り詰め（cappedToMaxDays） |
| `wagePaidPerPeriod`（休業中の賃金・円） | number | 任意 | 0以上。各支給対象期間に同額が支払われる前提で80%調整 |
| `resigningAfterLeave`（離職予定） | boolean | 任意 | trueで支給対象外の理由を付す |
| `familyInScope`（対象家族該当） | boolean | 任意 | falseで支給対象外の理由を付す |

## ロジック仕様

```
cappedMonthly = clamp(monthlyWage, 90420, 532200)
cappedDaily   = cappedMonthly / 30

splitPeriods(leaveDays): 30日ずつ切り出し、余りを最終期間に。例 93 → [30,30,30,3]

各期間 p（periodDays 日）:
  fullWage = cappedDaily × periodDays
  support  = floor(fullWage × 0.67)
  wagePaid=0 なら benefit = support
  else ratio = wagePaid / fullWage
    ratio ≥ 0.8  → benefit = 0
    ratio > 0.13 → benefit = max(0, floor(fullWage×0.8 − wagePaid))
    ratio ≤ 0.13 → benefit = support
  benefit = min(benefit, support)

totalBenefit       = Σ benefit
totalBenefitUnpaid = Σ support（賃金支払があっても比較用に無給前提の総額を保持）
```

境界: 上限賃金の30日期間 → 356,574円（monthlyMax）。下限賃金の30日期間 → 60,581円（monthlyMin）。

## テストケース表（tests/kaigo-kyugyou-kyufukin.test.ts）

| # | 入力 | 期待 |
|---|---|---|
| 5 | 賃金上限・30日・無給 | 356,574円 |
| 6 | 賃金下限・30日・無給 | 60,581円 |
| 7 | splitPeriods(93) | [30,30,30,3] |
| 10 | 月30万・93日・無給 | [201000,201000,201000,20100]・総額623,100 |
| 12 | 月30万・120日 | 93日に切詰・cappedToMaxDays |
| 14 | 10000×30・賃金30,000（13%以下） | 減額なし201,000 |
| 15 | 10000×30・賃金150,000（50%） | 90,000（80%相当−賃金） |
| 16 | 10000×30・賃金240,000（80%） | 0 |

## 8/1改定の失効フェイルセーフ

賃金月額の上限額・下限額（＝支給上限額356,574円等）は毎年8月1日に改定される。JSONの `amendments` に `status:"expires"` / `expiresOn:"2026-07-31"` として記録されており、基準日（`today`）がこれを過ぎると `isDataExpired()` が true になる。その場合、育休給付（`sankyu-ikukyu-money`）・育児時短就業給付（`jitan-kyuyo`）と同じく**古い額で計算せず停止**する（`expired:true`・金額0・停止メッセージ表示）。新リーフレットで `kaigo-kyugyou-kyufukin.json` を差し替えれば自動で再開する。テスト #25〜#27。

## このツールが行わないこと

- 被保険者期間要件（開始前2年に11日以上の月12か月）の充足判定（文章で案内）。
- 高年齢雇用継続給付との併給調整の金額計算。
- 実際の賃金台帳からの賃金日額算定（利用者入力の月額を1/30する簡易換算）。

## 出典

`data/seido/kaigo-kyugyou-kyufukin.json` の `sources`（e-Gov雇用保険法・厚労省パンフ・令和7年8月支給限度額リーフレット）。
