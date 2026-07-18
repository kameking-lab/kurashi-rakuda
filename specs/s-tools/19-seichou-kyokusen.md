# 成長曲線プロット（パーセンタイル）（P2-T12）

簡易仕様書（数式・境界値・出典のみ）。

- **docs/02**: #25（カテゴリ「子育て」）
- **queueId**: P2-T12
- **slug**: `seichou-kyokusen`
- **category**: `childcare`
- **難易度**: S（データ収集＋パーセンタイル位置判定・医学判断の回避）
- **YMYL区分**: 高（発育。正常/異常の判定は一切しない）
- **データ**: `data/tables/seichou-hatsuiku-percentile.json`（厚生労働省「令和5年乳幼児身体発育調査」。e-Stat 統計表 表1体重・表2身長・表3頭囲を機械転記）。

## データ収集の記録

- 一次情報: 厚労省「令和5年乳幼児身体発育調査」（令和6年12月25日公表）。e-Stat の統計表（統計表ID 000040240361体重／000040240362身長／000040240363頭囲）のExcelを `openpyxl` で機械転記。
- 丸め: 体重kg小数第2位、身長・頭囲cm小数第1位。丸め後も各バンドで p3<…<p97 の単調性を確認（テスト#4）。
- 除外: 出生時直後の1〜4日の行（体重の一時的減少）は成長曲線の月齢軸に載らないため除外。出生時（0日）・生後30日・月齢/年齢バンドのみ収録。
- 収録範囲: 体重24バンド・身長24バンド（〜6歳台）、頭囲17バンド（原典が2歳6〜12月未満までのため。★null埋めや外挿はしない★）。
- ★母子健康手帳の発育曲線は版により平成22年調査に基づく場合があり、本データ（令和5年）と数値が異なりうる点を edition・免責に明記。★

## 入力仕様

| フィールド | 型 | 必須 | ルール |
|---|---|---|---|
| `measure` | enum | 必須 | weight / height / head |
| `sex` | enum | 必須 | male / female |
| `bandKey` | string | 必須 | その measure のバンドキー（存在しなければエラー） |
| `value` | number | 必須 | >0 の実測値 |

## ロジック仕様

```
values = band[sex]（7つのパーセンタイル値 p3..p97、単調増加）
classifyPosition(value, values):
  value < values[0]      → below（3パーセンタイル未満）
  value ≥ values[6]      → above（97パーセンタイル以上）
  values[i] ≤ value < values[i+1] → between（PERCENTILES[i]〜PERCENTILES[i+1]の間）
diffFromMedian = round(value − p50, 2)
plotRatio      = clamp((value − min) / (max − min), 0, 1)   // 描画のみ
markerRatios   = 各p値の (v − min)/(max − min)
```

境界規約: p3ちょうどは below ではなく between（p3〜p10）。p97ちょうどは above。

## テストケース表（tests/seichou-kyokusen.test.ts）

| # | 入力 | 期待 |
|---|---|---|
| 3 | バンド数 | 体重24・身長24・頭囲17 |
| 4 | 全バンド | p3<…<p97 単調 |
| 9 | 出生時男子・体重2.9kg | p25〜p50 |
| 11 | 3.81kg（p97値） | above |
| 14 | 出生時男子・3.5kg | p75〜p90 |
| 16 | 頭囲男子30日・36.8 | 中央値一致 |

## このツールが行わないこと

- 発育の正常/異常・病的かどうかの判定（位置の提示のみ。健診・小児科へ案内）。
- パーセンタイル曲線の外挿・欠損区分の補完（頭囲3歳以上など）。
- BMI・肥満度（カウプ指数等）の算出（別ツールの領分）。

## 出典

`data/tables/seichou-hatsuiku-percentile.json` の `sources`（e-Stat 令和5年乳幼児身体発育調査 表1〜3、厚労省 調査の結果）。
