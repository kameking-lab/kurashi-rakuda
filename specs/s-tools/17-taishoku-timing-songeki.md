# 退職タイミング損得カレンダー（P2-T09）

簡易仕様書（数式・境界値・出典のみ）。

- **docs/02**: #81（カテゴリ「働き方・キャリア」）
- **queueId**: P2-T09
- **slug**: `taishoku-timing-songeki`
- **category**: `career`
- **難易度**: S（月末判定・住民税ルール・給付日数表の3系統）
- **YMYL区分**: 中（制度上の扱いの目安。金額は算出しない）
- **SSOT**: `data/seido/taishoku-timing-songeki.json`。

## 概要

退職日・離職理由・年齢・被保険者期間から、退職の**時期**で変わる3つの扱いを示す。①社会保険料（月末退職か否かで退職月の社保の扱いが変わる）②住民税（退職月で一括徴収の扱いが変わる）③雇用保険（離職理由・年齢・被保険者期間で所定給付日数・給付制限が変わる）。★保険料・税の実額は標準報酬・自治体で異なるため算出しない（捏造しない）★。

## 入力仕様

| フィールド | 型 | 必須 | ルール |
|---|---|---|---|
| `resignDate`（退職日） | date | 必須 | YYYY-MM-DD。不正日はエラー |
| `reason`（離職理由） | enum | 必須 | jiko-tsugou / kaisha-tsugou / shuushoku-konnan |
| `age`（離職日の年齢） | number | 必須 | 0以上 |
| `insuredYears`（被保険者期間・年） | number | 必須 | 0以上 |

## ロジック仕様

```
isMonthEnd = resign.d == その月の末日 → resignMonthShahoViaCompany
shikakuSoushitsu = resign + 1日

juuminzeiRule(month):
  1〜4月 → forced-lump（強制一括）
  5月    → may-limit（限度）
  6〜12月 → optional-lump（原則普通徴収・申出で一括）

lookupKyufuNissuu(reason, age, years):
  table = 会社都合→特定受給資格者 / 自己都合→一般離職者 / 就職困難→就職困難者
  行 = ageLabel を [min,max) に解釈して age で選択
  列index: 一般は [<1, 1〜10（同値90）, 10〜20, 20+] の4列、他は [<1,1-5,5-10,10-20,20+] の5列
  days = row.days[index]（null は原典で該当なし）

restrictionMonths = 自己都合 ? 1 : 0（会社都合等は給付制限なし）
waitingDays = 7
```

## テストケース表（tests/taishoku-timing-songeki.test.ts）

| # | 入力 | 期待 |
|---|---|---|
| 2 | 3/31退職 | 月末・喪失4/1・会社経由 |
| 3 | 3/30退職 | 月末以外・喪失3/31 |
| 9 | 自己都合3年 | 90日 |
| 11 | 自己都合25年 | 150日 |
| 12 | 会社都合46歳12年 | 270日 |
| 14 | 就職困難50歳6年 | 360日 |
| 16 | 会社都合29歳22年 | null（該当なし） |

## このツールが行わないこと

- 保険料・住民税・基本手当日額の実額計算（標準報酬・自治体・賃金で変動＝算出しない）。
- 賞与の支給日在籍要件の判定（就業規則依存）。
- 退職後の健康保険3択（任意継続/国保/被扶養者）の損得の金額比較。

## 出典

`data/seido/taishoku-timing-songeki.json` の `sources`（日本年金機構・e-Gov地方税法・ハローワーク・厚労省）。
