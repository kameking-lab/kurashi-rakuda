# 高額介護サービス費 該当チェック（P2-T06）

簡易仕様書（数式・境界値・出典のみ）。

- **docs/02**: #93（カテゴリ「介護」）
- **queueId**: P2-T06
- **slug**: `kougaku-kaigo-service-hi`
- **category**: `care`
- **難易度**: S（世帯合算＋個人上乗せの二段構え）
- **YMYL区分**: 中（払い戻し額の目安。所得区分の確定判定は行わない）
- **SSOT**: `data/seido/kougaku-kaigo-service-hi.json`（介護保険法施行令第22条の2の2）。負担限度額は2026年8月改定でも不変だが、非課税低年金区分の年金境界額は8/1に809,000→826,500円へ改定。

## 概要

1か月の介護サービス利用者負担が所得区分別の負担限度額（月額）を超えたとき、超過分が払い戻される。課税区分（140,100／93,000／44,400円）と非課税区分（24,600円）は世帯合算で判定し、本人へ按分。非課税かつ年金収入等が低い方は個人15,000円と比べて有利な方を適用する。生活保護受給者は個人15,000円。

## 入力仕様

| フィールド | 型 | 必須 | ルール |
|---|---|---|---|
| `userSelfPay`（本人の月額負担・円） | number | 必須 | 0以上。福祉用具/住宅改修/食費/居住費は含めない |
| `householdOtherSelfPay`（世帯の他の負担・円） | number | 任意 | 0以上。世帯合算に加える |
| `category`（所得区分） | enum | 必須 | kazei690 / kazei380 / kazei-under380 / hikazei / hikazei-nenkin / seikatsu-hogo |

## ロジック仕様

```
householdTotal = userSelfPay + householdOtherSelfPay

individualOnly（生活保護）:
  userRefund = max(0, userSelfPay − 15000)   // 個人単位・按分しない
それ以外（世帯合算）:
  householdRefund = max(0, householdTotal − householdLimit)
  userRefund      = floor(householdRefund × userSelfPay / householdTotal)
  individualOverride（hikazei-nenkin）:
    individualRefund = max(0, userSelfPay − 15000)
    if individualRefund > userRefund → 個人15,000円を適用（有利な方）

userNetPay = userSelfPay − userRefund
eligible   = userRefund > 0
```

限度額（householdLimit）: kazei690=140,100 / kazei380=93,000 / kazei-under380=44,400 / hikazei・hikazei-nenkin=24,600 / seikatsu-hogo=15,000。すべて `brackets.tiers[].limit` から取得。

## テストケース表（tests/kougaku-kaigo-service-hi.test.ts）

| # | 入力 | 期待 |
|---|---|---|
| 5 | 60,000・kazei-under380 | 払戻15,600・実質44,400 |
| 7 | 30,000・hikazei | 5,400 |
| 8 | 30,000・hikazei-nenkin | 個人15,000適用で15,000払戻 |
| 10 | 20,000・seikatsu-hogo | 5,000 |
| 12 | 本人30,000＋家族30,000・kazei-under380 | 世帯15,600を按分し本人7,800 |
| 15/16 | 年金境界 | 7/31まで809,000・8/1から826,500 |

## このツールが行わないこと

- 所得区分そのものの確定判定（課税所得・年少扶養控除調整は入力側で選択）。
- 福祉用具購入費・住宅改修費・食費・居住費の計算（対象外費用）。
- 高額医療・高額介護合算療養費の計算（P2-T07が担当）。

## 出典

`data/seido/kougaku-kaigo-service-hi.json` の `sources`（e-Gov介護保険法施行令・厚労省介護サービス情報公表システム・kaigo-hoken.json）。
