# 扶養内⇄社保加入 損益分岐（P2-T04）

簡易仕様書（数式・境界値・出典のみ）。

- **docs/02**: #80（カテゴリ「お金」）
- **queueId**: P2-T04
- **slug**: `fuyounai-shaho-songeki-bunkiten`
- **category**: `money`
- **難易度**: S（料率・壁・損益分岐点の計算）
- **YMYL区分**: 中（社会保険料に限定した目安。税は別ツール）
- **SSOT**: 料率・国民年金＝`data/seido/fuyounai-shaho-songeki-bunkiten.json`／壁の金額＝`data/seido/fuyou-kabe.json`。

## 概要

★社会保険料の負担のみに着目★し、扶養を抜けて働くときの「働き損」ゾーン（壁〜損益分岐点）と、手取りが壁の手前の水準に戻る損益分岐点の年収を示す。★所得税・住民税・配偶者控除・家族手当は含めない（fuyo-kabe が担当）★。国民健康保険料は自治体依存で null のため、130万で自分加入するケースは国民年金のみで試算し国保上乗せを明示する。

## 入力仕様

| フィールド | 型 | 必須 | ルール |
|---|---|---|---|
| `scenario` | enum | 必須 | join-shaho（106万で勤務先社保）／self-insure（130万で自分で加入） |
| `ageGroup` | enum | 必須 | under40 / age40to64（介護保険料の有無） |
| `targetIncome`（想定年収・円） | number | 必須 | >0 |

## ロジック仕様

```
join-shaho:
  rate = under40 ? 0.141 : 0.1491（本人負担合計料率）
  wall = 1,060,000（fuyou-kabe shaho-106.amount2026）
  socialInsurance = round(income × rate)
  takeHome        = income − socialInsurance
  breakEvenIncome = ceil(wall / (1 − rate))
  inLossZone      = wall ≤ income < breakEvenIncome

self-insure:
  wall = 1,300,000（fuyou-kabe shaho-130.amount2026）
  socialInsurance = 国民年金年額 = 17,920 × 12 = 215,040（国保は含めない）
  takeHome        = income − 215,040
  breakEvenIncome = wall + 215,040（国年のみ。国保分さらに上）
  kokuhoNotIncluded = true
```

takeHomeJustBelowWall = wall（壁手前の手取りの目安）。diffVsJustBelow = takeHome − wall（マイナスなら働き損）。

## テストケース表（tests/fuyounai-shaho-songeki.test.ts）

| # | 入力 | 期待 |
|---|---|---|
| 2 | join・40未満・110万 | 社保155,100・手取り944,900・損ゾーン |
| 3 | join・40未満 | 分岐点1,233,994 |
| 6 | join・40以上 | 料率・分岐点が上がる |
| 7 | self・140万 | 国年215,040・手取り1,184,960・国保別途 |
| 8 | self | 分岐点1,515,040 |

## このツールが行わないこと

- 所得税・住民税・配偶者（特別）控除・家族手当を含めた手取り計算（fuyo-kabe が担当）。
- 国民健康保険料の算出（自治体依存・null）。
- 106万の5要件（週20時間・企業規模等）の充足判定（前提として選択）。

## 出典

`data/seido/fuyounai-shaho-songeki-bunkiten.json`・`data/seido/fuyou-kabe.json` の `sources`（日本年金機構・協会けんぽ等）。
