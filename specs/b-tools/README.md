# specs/b-tools/ — B級14ツール実装仕様書

docs/02_ツール一覧.md の難易度B（定型・テンプレで量産可能）ツールのうち、優先度S・MVP対象の14本の実装仕様書。各ファイルは概要／入力仕様／ロジック仕様／データ表／出力仕様／エッジケース・注意事項／YMYL配慮事項／テストケース（10件以上）の8セクション構成。

サイト実装（`packages/calc`等）はこのタスクのスコープ外。ここにあるのは実装者が着手できるレベルの仕様のみ。

| # | ファイル | ツール名 | docs/02 # | カテゴリ | YMYL |
|---|---------|---------|-----------|---------|------|
| 1 | [01-due-date-pregnancy-week-calculator.md](01-due-date-pregnancy-week-calculator.md) | 出産予定日・妊娠週数計算 | #1 | 妊娠・出産 | 中 |
| 2 | [02-inu-no-hi-calendar.md](02-inu-no-hi-calendar.md) | 戌の日計算・安産祈願カレンダー | #2 | 妊娠・出産 | 低 |
| 3 | [03-menstrual-cycle-ovulation-predictor.md](03-menstrual-cycle-ovulation-predictor.md) | 生理周期・排卵日予測 | #3 | 妊娠・出産 | 中 |
| 4 | [17-age-in-months-calculator.md](17-age-in-months-calculator.md) | 月齢計算 | #17 | 子育て | 低 |
| 5 | [18-vaccination-scheduler.md](18-vaccination-scheduler.md) | 予防接種スケジューラー | #18 | 子育て | 高 |
| 6 | [19-baby-food-amount-guide.md](19-baby-food-amount-guide.md) | 離乳食の量・固さ早見 | #19 | 子育て | 中〜高 |
| 7 | [20-child-allowance-calculator.md](20-child-allowance-calculator.md) | 児童手当計算 | #20 | 子育て | 中 |
| 8 | [22-height-prediction.md](22-height-prediction.md) | 子どもの身長予測（両親身長法） | #22 | 子育て | 中 |
| 9 | [23-hokatsu-schedule-maker.md](23-hokatsu-schedule-maker.md) | 保活スケジュールメーカー | #23 | 子育て | 低 |
| 10 | [24-feeding-amount-guide.md](24-feeding-amount-guide.md) | 授乳・ミルク量の目安 | #24 | 子育て | 中 |
| 11 | [37-frozen-storage-period-search.md](37-frozen-storage-period-search.md) | 冷凍保存期間検索 | #37 | 家事・料理 | 低 |
| 12 | [38-seasoning-conversion.md](38-seasoning-conversion.md) | 調味料換算 | #38 | 家事・料理 | 低 |
| 13 | [39-rice-cooking-water-ratio.md](39-rice-cooking-water-ratio.md) | 炊飯の水の量・合数⇄g換算 | #39 | 家事・料理 | 低 |
| 14 | [41-laundry-care-label-search.md](41-laundry-care-label-search.md) | 洗濯表示検索 | #41 | 家事・料理 | 低 |

## データ整合性について

以下の仕様書は `factory/data/seido/` の制度データを参照し、数値を完全一致させている（サイト実装時もこのJSONをSingle Source of Truthとして参照する想定）:

- `20-child-allowance-calculator.md` ⇔ `factory/data/seido/jidou-teate.json`
- `37-frozen-storage-period-search.md` ⇔ `data/tables/reito-hozon.json`
- `41-laundry-care-label-search.md` ⇔ `data/tables/sentaku-hyoji.json`

## 未収載（Phase 1のB級20本のうち、この14本以外）

`保育料計算`（#21、難易度S）・`授乳ミルク量`は本一覧に含むが、`保育料計算`は制度データ設計を要するS級のため本仕様書群のスコープ外（docs/08 P1-18相当）。
