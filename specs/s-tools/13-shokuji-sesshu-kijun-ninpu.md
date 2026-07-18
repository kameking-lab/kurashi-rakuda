# 妊娠中・授乳中の栄養摂取の付加量 早見（P2-T10）

簡易仕様書（数式・境界値・出典のみ）。

- **docs/02**: #68（カテゴリ「妊娠」）
- **queueId**: P2-T10
- **slug**: `shokuji-sesshu-kijun-ninpu`
- **category**: `pregnancy`
- **難易度**: S（付加量の正しい提示・非算出項目の線引き）
- **YMYL区分**: 中（栄養目安。個別の必要量は専門職に委ねる）
- **SSOT**: `data/seido/shokuji-sesshu-kijun-ninpu.json`（日本人の食事摂取基準2025年版）。5年ごと改定。

## 概要

妊娠初期・中期・後期・授乳中の別に、エネルギー・たんぱく質・鉄・葉酸・ビタミンC・カルシウム・食塩相当量の**付加量**（非妊娠時・非授乳時の推奨量に上乗せする量）を一覧表示する。妊娠初期はサプリメント葉酸400µg（神経管閉鎖障害リスク低減）を強調する。★カフェインは食事摂取基準に基準がないため数値を一切示さない（捏造しない）★。

## 入力仕様

| フィールド | 型 | 必須 | ルール |
|---|---|---|---|
| `state`（時期） | enum | 必須 | early / middle / late / lactation |

## ロジック仕様

`nutrientRows(state)` が7行（energy/protein/iron/folate/vitaminC/calcium/salt）を返す。値は推奨量ベースの付加量を data から取得:

- energy: early=50, middle=250, late=450, lactation=350（kcal/day）
- protein: early=0, middle=5, late=25, lactation=20（g/day・推奨量付加）
- iron: early=2.5, middle/late=8.5, lactation=2.0（mg/day・推奨量付加）
- folate: early=0（別途サプリ400µg）, middle/late=240, lactation=100（µg/day・推奨量付加）
- vitaminC: 妊娠=10, 授乳=45（mg/day）
- calcium: 全状態0（付加なし）
- salt: 目標量6.5g未満/日（文字列）

`folicAcidInfo()`: サプリ葉酸 400µg・耐容上限（18〜29歳女性）900µg・目的「神経管閉鎖障害のリスクの低減」。
`shouldEmphasizeFolicSupplement(state)`: early のみ true。

## テストケース表（tests/shokuji-sesshu-kijun-ninpu.test.ts）

| # | 対象 | 期待 |
|---|---|---|
| 1 | energy | 50/250/450/350 |
| 3 | iron 中期後期 | 8.5 |
| 5 | folate 初期 | 0（サプリ別途） |
| 11 | サプリ葉酸 | 400・上限900 |
| 16 | カフェイン行 | 存在しない |

## このツールが行わないこと

- カフェイン・アルコール・水銀魚などの制限量の提示（食事摂取基準に基準なし＝データなし）。
- 個人の必要総量の算出（付加量は上乗せ量であり、基礎量は年齢で異なるため）。
- 妊娠中の体重増加指導の計算（P2-T15が担当。参照のみ）。

## 出典

`data/seido/shokuji-sesshu-kijun-ninpu.json` の `sources`（厚労省 日本人の食事摂取基準2025年版 策定検討会報告書）。
