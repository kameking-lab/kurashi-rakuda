# 養育費 目安（裁判所算定表）（P2-T08）

簡易仕様書（数式・境界値・出典のみ）。

- **docs/02**: #60（カテゴリ「お金」）
- **queueId**: P2-T08
- **slug**: `youikuhi-santeihyou`
- **category**: `money`
- **難易度**: S（表選択・指数按分・非算出金額の線引き）
- **YMYL区分**: 高（金額は個別事情で幅があり、断定を避ける設計）
- **SSOT**: `data/seido/youikuhi-santeihyou.json`（改定標準算定方式・算定表 令和元年版）。

## 概要

★養育費の額を年収から算出しない★。算定表（表1〜9）の金額はPDF画像で提供されテキスト抽出不可（tablePdfTextExtractable=false）のためデータ化されていない。本ツールは①子の人数・年齢構成から使うべき算定表を特定し公式PDFへ案内、②算定表から読み取った合計額を公式の「子の指数」で各子に按分、③法定養育費（1人月2万円）・先取特権（1人8万円）を案内する、に限定する。

## 入力仕様

| フィールド | 型 | 必須 | ルール |
|---|---|---|---|
| `ages`（各子の年齢区分の配列） | ("0-14"\|"15+")[] | 必須 | 1〜3人。0人/4人以上はエラー |
| `tableAmount`（表から読んだ合計月額・円） | number | 任意 | 指定時のみ指数按分 |

## ロジック仕様

```
selectTable(ages):
  15歳以上を先に並べ替え、tables[type=youikuhi] のうち children一致 & ages配列一致を返す
  例 ["0-14","15+"] → sort ["15+","0-14"] → 表4

allocateByIndex(total, ages):
  index = 0-14→62 / 15+→85（childIndex）
  各子 = round(total × index_i / Σindex)、最後の子＝total − 他の合計（端数吸収）
```

法定養育費 = 20,000円/人（houteiYouikuhi.monthlyAmountPerChild）。先取特権 = 80,000円/人（sakidoriTokken.amountPerChild）。

## テストケース表（tests/youikuhi-santeihyou.test.ts）

| # | 入力 | 期待 |
|---|---|---|
| 2 | 子1・0-14 | 表1 |
| 4 | 子2・混在 | 表4（順序非依存） |
| 7 | 子3・15+2/0-14×1 | 表8 |
| 10 | 合計5万・10歳と15歳 | 21,088／28,912（合計保持） |
| 13 | 表4＋合計5万 | 表4・按分2件・法定4万 |
| 15 | 子4人 | エラー |

## このツールが行わないこと

- 義務者・権利者の年収からの養育費額の算出（算定表がPDF画像でデータ化不可＝捏造しない）。
- 婚姻費用の算定（表10〜19は今回対象外）。

## 出典

`data/seido/youikuhi-santeihyou.json` の `sources`（裁判所 改定標準算定方式・算定表、法務省）。算定表PDFは courts.go.jp。
