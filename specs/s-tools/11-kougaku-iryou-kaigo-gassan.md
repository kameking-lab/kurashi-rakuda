# 高額医療・高額介護合算療養費 チェック（P2-T07）

簡易仕様書（数式・境界値・出典のみ）。

- **docs/02**: #96（カテゴリ「介護」）
- **queueId**: P2-T07
- **slug**: `kougaku-iryou-kaigo-gassan`
- **category**: `care`
- **難易度**: S（保険種別×年齢×所得区分の限度額表・按分・両方負担要件）
- **YMYL区分**: 中（支給の目安。合算対象額や区分の確定は保険者が行う）
- **SSOT**: `data/seido/kougaku-iryou-kaigo-gassan.json`（健康保険法施行令・国保法施行令・高確法施行令・介護保険法施行令）。

## 概要

毎年8月1日〜翌年7月31日の1年間の、同一世帯の医療保険＋介護保険の自己負担（高額療養費・高額介護サービス費適用後）を合算し、所得区分別の合算算定基準額を超えた分を支給する。医療・介護の両方に自己負担があること、超過額が支給基準額（501円）以上であることが要件。支給は医療保険者・介護保険者へ按分。

## 入力仕様

| フィールド | 型 | 必須 | ルール |
|---|---|---|---|
| `group`（保険種別×年齢） | enum | 必須 | kenpoUnder70 / kenpo70plus / kokuhoUnder70 / kokuho70plus / kourei70plus。後期高齢は常に70plus |
| `tierKey`（所得区分） | string | 必須 | そのグループの tiers のいずれか |
| `annualMedical`（医療の年間自己負担・円） | number | 必須 | 0以上。高額療養費適用後 |
| `annualKaigo`（介護の年間自己負担・円） | number | 必須 | 0以上。高額介護サービス費適用後 |

## ロジック仕様

```
limit    = brackets[group].tiers.find(tierKey).limit
combined = annualMedical + annualKaigo
bothPresent = annualMedical>0 && annualKaigo>0
excess   = combined − limit
paid     = bothPresent && excess ≥ 501（MINIMUM_PAYMENT）

totalRefund   = paid ? excess : 0
medicalPortion = floor(totalRefund × annualMedical / combined)
kaigoPortion   = totalRefund − medicalPortion   // 端数は介護側に寄せ総額を保つ
```

限度額（円）: 区分ア/現役並みⅢ=2,120,000 ／ 区分イ/現役並みⅡ=1,410,000 ／ 区分ウ/現役並みⅠ=670,000 ／ 区分エ=600,000 ／ 一般=560,000 ／ 区分オ=340,000 ／ 低所得Ⅱ=310,000 ／ 低所得Ⅰ=190,000。すべて `brackets[group].tiers[].limit` から取得。

## テストケース表（tests/kougaku-iryou-kaigo-gassan.test.ts）

| # | 入力 | 期待 |
|---|---|---|
| 6 | 国保70+一般・医療40万＋介護30万 | 超過14万・医療8万/介護6万 |
| 8 | 健保70未満区分ウ67万・医療50万＋介護10万 | 60万<67万→不支給 |
| 9 | 介護0円 | bothRequired違反→不支給 |
| 11 | 超過500円 | <501→不支給 |
| 12 | 超過501円 | 支給501円 |
| 16 | 区分ア212万・医療100万＋介護100万 | 200万<212万→不支給 |

## このツールが行わないこと

- 高額療養費・高額介護サービス費そのものの計算（先に適用済みの前提。介護側はP2-T06が担当）。
- 70歳未満の医療費の月2.1万円下限による合算対象判定（入力側で調整済みの前提。注意書きで案内）。
- 令和8年8月の高額療養費制度見直しの反映（注視事項として明記）。

## 出典

`data/seido/kougaku-iryou-kaigo-gassan.json` の `sources`（e-Gov各施行令・協会けんぽ・厚労省見直し資料）。
