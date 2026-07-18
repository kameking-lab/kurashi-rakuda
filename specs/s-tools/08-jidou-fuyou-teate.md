# 児童扶養手当計算（ひとり親）（P2-T03）

簡易仕様書（BACKLOG.md の規約に基づき、数式・境界値・出典のみを記載する）。

- **docs/02**: #59（カテゴリ「お金」）
- **queueId**: P2-T03
- **slug**: `jidou-fuyou-teate`
- **category**: `money`
- **難易度**: S（制度計算・境界値・年金併給の非計算判断）
- **YMYL区分**: 高（支給可否・支給額の目安を扱う。個別認定は窓口に委ねる）
- **SSOT**: `data/seido/jidou-fuyou-teate.json`（令和8年度＝2026年度）。金額・係数・所得制限限度額はコードに直書きせず、すべて同JSONから import する。

## 概要

対象児童の人数・受給者本人の所得額・扶養親族の数から、児童扶養手当の**全部支給／一部支給／支給停止**を判定し、月額・年額・1回あたりの支給額の目安を表示する。任意で①受け取っている養育費（8割を所得に算入）②同居する扶養義務者等の所得（限度額以上なら全部支給停止）③公的年金の受給有無（併給調整の警告）を加味する。

## 入力仕様

| フィールド | 型 | 必須 | ルール |
|---|---|---|---|
| `childrenCount`（対象児童数） | number | 必須 | 1以上。小数は切り捨て。0以下はエラー |
| `recipientIncome`（本人の所得額・円） | number | 必須 | 0以上。**年収ではなく所得額**。負値はエラー |
| `dependentsCount`（扶養親族数） | number | 必須 | 0以上。所得制限限度額表の行を決める。負値はエラー |
| `childSupportAnnual`（養育費年額・円） | number | 任意 | 0以上。8割を所得に加算。負値はエラー |
| `obligorIncome`（扶養義務者等の所得額・円） | number | 任意 | 指定時のみ扶養義務者の所得制限を判定 |
| `receivingPension`（公的年金受給） | boolean | 任意 | true のとき併給調整の警告を表示 |

## ロジック仕様

### 実効所得額

```
childSupportIncluded = floor(childSupportAnnual × 0.8)   // childSupportIncomeInclusion.value
effectiveIncome     = recipientIncome + childSupportIncluded
```

### 所得制限限度額の取得（扶養親族数 d）

`incomeLimits.incomeBasedTable.rows`（d=0..3）から fullPayment / partialPayment / dependentObligor を引く。d≥4 は d=3 の各値に `incrementPerAdditionalDependent`（38万円）×(d−3) を加算する。

### 支給区分の判定（優先順）

1. `obligorIncome != null && obligorIncome ≥ dependentObligor` → **obligorStop**（0円）
2. `effectiveIncome ≥ partialPayment` → **fullStop**（0円）
3. `effectiveIncome < fullPayment` → **full**（全部支給）
4. それ以外（fullPayment ≤ effectiveIncome < partialPayment） → **partial**（一部支給）

境界: fullPayment / partialPayment / dependentObligor は「その額**未満**なら支給側」。ちょうどの額は支給停止側に倒す（未満＝OK）。

### 金額

- **full**: 本体 `firstChildFull`(48,050) ＋ 加算 `additionalChildFull`(11,350) ×(n−1)
- **partial**（10円きざみ・下限上限クランプ）:
  ```
  本体 = clamp( round10( firstChildFull − ((effectiveIncome − fullPayment)×0.0264029 + 10) ),
               firstChildPartialMin(11,340), firstChildPartialMax(48,040) )
  加算 = clamp( round10( additionalChildFull − ((effectiveIncome − fullPayment)×0.0040719 + 10) ),
               additionalChildPartialMin(5,680), additionalChildPartialMax(11,340) )
  ```
  `round10(x) = Math.round(x/10)×10`
- **fullStop / obligorStop**: すべて0円

合計月額 = 本体 ＋ 加算×(n−1)。年額 = 月額×12。1回あたり = 月額×2（奇数月・年6回、各回2か月分）。

## テストケース表（tests/jidou-fuyou-teate.test.ts）

| # | 入力 | 期待 |
|---|---|---|
| 1 | 児童1・所得0・扶養0 | full・月48,050・年576,600・1回96,100 |
| 4 | 扶養0・所得69万ちょうど | partial・本体48,040 |
| 5 | 扶養0・所得689,999 | full |
| 6 | 扶養0・所得208万ちょうど | fullStop・0円 |
| 7 | 扶養0・所得2,079,999 | partial下限（本体11,340・加算5,680） |
| 8 | 扶養0・所得100万・児童2 | 本体39,860＋加算10,080＝49,940 |
| 9 | 扶養1・所得150万・児童3 | 本体36,690＋加算9,590×2＝55,870 |
| 13 | 扶養義務者所得236万ちょうど | obligorStop・0円 |
| 15 | 養育費年100万 | 80万を所得算入・実効110万（本人30万＋80万） |
| 16 | 本人60万＋養育費100万 | full→partial に切替 |

## このツールが行わないこと

- 年収から所得額への自動換算（諸控除が個別のため）。
- 公的年金受給者への確定額表示（`withPublicPension` が null＝未確認。警告のみ）。
- 事実婚・遺棄・拘禁など支給要件そのものの該当判定（要件は文章で案内）。

## 出典

`data/seido/jidou-fuyou-teate.json` の `sources`（こども家庭庁・大阪府・東京都福祉局・e-Gov児童扶養手当法）。手当額・係数・所得制限限度額は毎年4月の物価スライドで改定されるため、翌年度更新時は同JSONを差し替える。
