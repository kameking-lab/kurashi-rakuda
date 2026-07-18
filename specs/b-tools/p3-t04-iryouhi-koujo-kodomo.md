# P3-T04 子ども関連の医療費控除 対象チェック

BACKLOG.md P3-T04（docs/02 #65、難易度B、YMYL: 中）の実装仕様書。「簡易」仕様＝数式・境界値・出典のみ。

- slug: `iryouhi-koujo-kodomo`
- category: `money`
- 実装: `components/tools/impl/IryouhiKoujoKodomo.calc.ts`（ロジック）／`components/tools/impl/IryouhiKoujoKodomo.tsx`（UI）
- テスト: `tests/iryouhi-koujo-kodomo.test.ts`
- SSOT: `data/seido/iryouhi-koujo-kodomo.json`（本ツールが使う唯一のデータソース）

## 1. 概要

世帯の年間医療費（出産費用とそれ以外に分けて入力）・保険金や出産育児一時金などの補てん額・総所得金額等を入力すると、所得税法第73条に基づく医療費控除額の目安を計算する。あわせて、子育て世帯で判断に迷いやすい費目（妊婦健診・通院費・タクシー代・入院食事代・不妊治療・歯列矯正・付添人の交通費・歯科ローンなど）が対象になりそうか対象外かをチェックリストとして提示し、セルフメディケーション税制（通常の医療費控除との選択制）との比較、確定申告の手続きも案内する。

金額計算は行うが、還付額（＝控除額×適用税率）そのものは計算しない（適用税率の入力を求めないため）。実際の還付額・対象可否の最終判断は税務署に確認する必要がある旨を常に明記する。

## 2. 入力仕様

| フィールド名 | 型 | 必須/任意 | バリデーションルール |
|---|---|---|---|
| 出産費用以外の医療費 合計（otherMedicalExpenses） | 数値（円） | 必須（未入力は0として扱う） | 0以上の有限数。負数・非数値はエラー |
| 出産費用 合計（shussanHiyou） | 数値（円） | 必須（未入力は0として扱う） | 0以上の有限数。負数・非数値はエラー |
| 出産育児一時金・家族出産育児一時金等の受取額（shussanIchijikin） | 数値（円） | 必須（未入力は0として扱う） | 0以上の有限数。負数・非数値はエラー。出産手当金は含めない |
| 出産費用以外への保険金・高額療養費等の補てん額 合計（otherReimbursement） | 数値（円） | 必須（未入力は0として扱う） | 0以上の有限数。負数・非数値はエラー |
| 総所得金額等（totalIncome） | 数値（円） | 必須（未入力は0として扱う） | 0以上の有限数。負数・非数値はエラー。給与のみの世帯は「年収−給与所得控除」に相当する額が目安（本ツールは給与収入からの自動換算は行わない。理由は§5参照） |
| 特定一般用医薬品等購入費 合計（otcExpenses） | 数値（円） | 任意（未入力は0） | 0以上の有限数。負数・非数値はエラー |

UI側は「まだ何も入力していない」状態を各欄の空文字列で判定し、1つでも入力があれば計算結果を表示する（空欄は0として計算に使う）。

## 3. ロジック仕様

### 3.1 補てん額の個別対応（按分）

`data/seido/iryouhi-koujo-kodomo.json` の `compensationDeduction.perExpenseLimitRule` が最重要ロジック:

> 保険金などで補てんされる金額は、その給付の目的となった医療費の金額を限度として差し引き、引ききれない金額が生じた場合であっても他の医療費からは差し引かない

本ツールは入力を「出産費用」「それ以外の医療費」の2バケットに分け、それぞれのバケット内でのみ補てん額を相殺する。

```
shussanCompensationApplied = min(shussanIchijikin, shussanHiyou)
shussanIchijikinExcess     = max(0, shussanIchijikin - shussanHiyou)   // 他の医療費からは差し引かない（表示のみ）

otherCompensationApplied     = min(otherReimbursement, otherMedicalExpenses)
otherReimbursementExcess     = max(0, otherReimbursement - otherMedicalExpenses)  // 同様に他へは波及させない

totalCompensationApplied = shussanCompensationApplied + otherCompensationApplied
totalMedicalPaid         = otherMedicalExpenses + shussanHiyou
netMedicalExpense         = totalMedicalPaid - totalCompensationApplied   // 各バケットをminで相殺するため常に0以上
```

★出産育児一時金が出産費用を上回っても、余った分を子どもの歯科治療費など他の医療費から差し引かない（`shussanIchijikinExcess` として表示するのみで計算には使わない）★。出産手当金（`compensationDeduction.shussanTeatekin.value === false`）は差し引く対象に含めない（休業補償のため）。

### 3.2 足切り額と控除額の計算

所得税法第73条第1項は「総所得金額等の5%（その金額が10万円を超える場合は10万円）」という一本の式であり、`thresholdFixed`（10万円）と `thresholdRate`（5%）を次のように組み合わせる。`thresholdSwitchIncome`（200万円）＝ `thresholdFixed ÷ thresholdRate` がちょうど分岐点になる。

```
threshold = min(totalIncome × thresholdRate, thresholdFixed)
isLowIncomeBracket = totalIncome < thresholdSwitchIncome   // 表示用（5%基準が使われたかどうか）

deductionBeforeCap = max(0, netMedicalExpense - threshold)
deductionAmount     = min(deductionBeforeCap, maxDeduction)   // maxDeduction = 200万円
isCapped             = deductionBeforeCap > maxDeduction
```

### 3.3 セルフメディケーション税制（選択制・任意入力）

`selfMedication.isExclusiveChoice.value === true`（通常の医療費控除との併用不可）。`otcExpenses` が入力された場合のみ比較を表示する。

```
selfMedicationEligible  = otcExpenses > selfMedication.threshold.value   // 12,000円『を超える』。12,000円ちょうどは対象外
selfMedicationDeduction = selfMedicationEligible
  ? min(otcExpenses - selfMedication.threshold.value, selfMedication.maxDeduction.value)   // 上限88,000円
  : 0

recommendedChoice =
  deductionAmount === 0 && selfMedicationDeduction === 0 → "none"
  deductionAmount === selfMedicationDeduction            → "either"
  deductionAmount > selfMedicationDeduction              → "normal"
  それ以外                                                → "selfMedication"
```

セルフメディケーション税制の適用期間（`applicablePeriod`）は令和8年12月31日まで（`amendments` に `expires: 2026-12-31` として登録）。この期限を過ぎると `isDataExpired()` が真になり、計算全体を停止して「制度データ更新中」表示にする（既存ツールの共通パターンに合わせ、データセット単位で判定する）。

### 3.4 チェックリスト（対象/対象外）

`data/seido/iryouhi-koujo-kodomo.json` の以下のノードをそのまま構造化して提示する。計算には使わず、静的な判定情報として表示する。

- `eligibleExpenses.categories.items`（12類型。`relevance` が `high`/`medium` のものを優先表示）
- `kosodateTopics` のうち真偽値で表現できるもの9件（`shussanTeikikenshin`・`shussanTsuuinhi`・`shussanTaxi`・`jikkaKisei`・`nyuuinShokuji`・`minomawarihin`・`funinChiryou`・`tsukisoiKoutsuuhi`・`kenkoushindan`）
- `kosodateTopics` のうち条件文で表現される2件（`shiretsuKyousei`＝歯列矯正の判断基準、`shikaLoan`＝歯科ローンの扱い）
- `excludedExpenses`（`taxiOrdinary`・`gasolineParking`・`vitamins`・`familyTsukisoiRyou`）

## 4. データ表・出典

`data/seido/iryouhi-koujo-kodomo.json`（fiscalYear: 2026, asOf: 2026-07-17）より。

| ノード | 値 | 用途 |
|---|---|---|
| `data.calculation.maxDeduction.value` | 2,000,000円 | 医療費控除額の上限 |
| `data.calculation.thresholdFixed.value` | 100,000円 | 足切り額（原則） |
| `data.calculation.thresholdRate.value` | 0.05 | 総所得金額等200万円未満の場合の足切り率 |
| `data.calculation.thresholdSwitchIncome.value` | 2,000,000円 | 足切り基準が切り替わる総所得金額等 |
| `data.compensationDeduction.perExpenseLimitRule.value` | （本文） | 補てん額の個別対応の原則 |
| `data.compensationDeduction.shussanIchijikin.value` | （本文） | 出産育児一時金は差し引く必要があること |
| `data.compensationDeduction.shussanTeatekin.value` | false | 出産手当金は差し引く必要がないこと |
| `data.selfMedication.threshold.value` | 12,000円 | セルフメディケーション税制の足切り額 |
| `data.selfMedication.maxDeduction.value` | 88,000円 | セルフメディケーション税制の控除限度額 |
| `data.selfMedication.isExclusiveChoice.value` | true | 通常の医療費控除との選択制 |
| `data.procedure.*` | （本文） | 申告方法・提出書類・領収書保存5年・還付申告5年 |

出典: 国税庁 タックスアンサー No.1120・No.1122・No.1124・No.1128、質疑応答事例（不妊治療）、No.2030（還付申告）、e-Gov法令検索「所得税法」第73条。詳細・確認日は `data/seido/iryouhi-koujo-kodomo.json` の `sources` を参照。

## 5. エッジケース

- **総所得金額等の自動換算をしない**: 給与収入からの給与所得（総所得金額等）への換算には `data/seido/fuyou-kabe.json` の給与所得控除表（令和8・9年分限りの特例テーブルを含む複雑な段階表）が必要になるが、本ツールの唯一のデータソースは `iryouhi-koujo-kodomo.json` であり、別ファイルを二重に読み込んでSSOTを跨がない方針のため、総所得金額等は利用者自身に入力してもらう（年収ではなく総所得金額等を直接入力する設計）。UIのヒントで「年収から給与所得控除を引いた額が目安」であることのみ案内する。
- **出産育児一時金が出産費用を上回る（直接支払制度の差額精算等）**: 余りを他の医療費から差し引かない（§3.1）。逆に出産費用が出産育児一時金を上回る場合は、差額（自己負担の残り）がそのまま医療費控除の対象に残る。
- **出産費用以外への補てん額が対応する医療費を上回る場合**: 同様に他の医療費（出産費用を含む）には波及させない。
- **総所得金額等がちょうど200万円**: `threshold = min(2,000,000 × 0.05, 100,000) = min(100,000, 100,000) = 100,000`。境界値では5%基準・10万円基準のどちらで計算しても同じ結果になる（`isLowIncomeBracket` は `totalIncome < 2,000,000` で判定するため、ちょうど200万円は `false` 側＝10万円基準の扱いになるが、計算結果自体は変わらない）。
- **医療費控除額が200万円を超える場合**: 200万円で頭打ちにする（`isCapped: true`）。
- **総所得金額等が0円（所得税を納めていない）**: `threshold = 0` となり足切りなしで計算はできるが、還付は生じない（`REFUND_NOTE` で明記）。
- **セルフメディケーション税制の足切りちょうど12,000円**: 対象外（「12,000円を超える部分」であり、12,000円ちょうどは含まない）。
- **セルフメディケーション税制の適用期限（2026年12月31日）経過後**: `isDataExpired()` が真になり、計算全体を停止する。
- **自治体の子ども医療費助成金の扱い**: `data/seido/iryouhi-koujo-kodomo.json` の `compensationDeduction.kodomoIryouhiJyosei.value` は `null`（一次情報で確定できず）。本ツールは確定額を出さず、税務署への確認を案内する注記を常に表示する（入力項目としても持たない）。

## 6. YMYL配慮事項

- 医療費控除額はあくまで所得税法上の計算式に基づく「目安」であり、実際の還付額は「控除額×適用税率」であって「控除額と同額」ではないことを常に明記する（`REFUND_NOTE`）。所得税を納めていない場合は還付が生じない旨も明記する。
- 歯列矯正・不妊治療・通院費などは個々の事情により対象・対象外の判断が分かれるため、「対象になりそう」という表現にとどめ、断定しない。
- 出産育児一時金・保険金等の補てん額は必ず差し引く必要があること、その按分ルール（§3.1）を明確に示す。
- セルフメディケーション税制とは選択制であり併用できないことを明記する。
- 自治体の子ども医療費助成金の扱いは一次情報で確定できていないため、確定額を示さず税務署への確認を案内する。
- 個別の最終判断は所轄の税務署に確認するよう常に案内する（`data/seido/iryouhi-koujo-kodomo.json` の `disclaimer` をそのまま表示）。
- 制度データの準拠年度・次回改定予定（セルフメディケーション税制の令和8年12月31日期限到来を含む）・免責事項は `SeidoNotice` コンポーネントで機械的に表示する（`iryouhiKoujoDataset`）。

## 7. テストケース表（抜粋。全件は `tests/iryouhi-koujo-kodomo.test.ts` を参照）

| # | 入力の要点 | 検証対象 | 期待値 | 根拠 |
|---|---|---|---|---|
| 1 | 医療費30万円（出産費用なし）、補てんなし、総所得300万円 | `deductionAmount` | 200,000円 | 30万円 − 10万円（総所得200万円以上の固定足切り） |
| 2 | 総所得ちょうど200万円 | `threshold` | 100,000円 | min(200万×5%, 10万) = 10万円（境界値） |
| 3 | 総所得199万9,999円 | `isLowIncomeBracket` | true | 200万円未満は5%基準 |
| 4 | 総所得200万円 | `isLowIncomeBracket` | false | 200万円ちょうどは10万円基準側 |
| 5 | 出産費用45万円、出産育児一時金50万円 | `shussanCompensationApplied`/`shussanIchijikinExcess` | 450,000 / 50,000 | 出産費用を限度に相殺、余りは他へ波及しない |
| 6 | 上記に加え、出産費用以外の医療費20万円（補てんなし） | `netMedicalExpense` | 200,000円 | 出産費用は補てんで相殺済み（0円）、それ以外の20万円のみ残る |
| 7 | 医療費210万円、総所得300万円、補てんなし | `deductionAmount`/`isCapped` | 2,000,000 / true | 210万円−10万円=200万円→上限ちょうど。300万円で`isCapped`確認のため差分調整 |
| 8 | 負の医療費 | バリデーション | エラー | 0円以上でない入力を拒否 |
| 9 | NaN（非数値） | バリデーション | エラー | 有限数でない入力を拒否 |
| 10 | OTC購入費12,000円ちょうど | `selfMedicationEligible`/`selfMedicationDeduction` | false / 0 | 「12,000円を超える」に該当しない |
| 11 | OTC購入費12,001円 | `selfMedicationDeduction` | 1円 | 12,001−12,000 |
| 12 | OTC購入費20万円 | `selfMedicationDeduction` | 88,000円 | 上限で頭打ち |
| 13 | 通常控除0円・セルフメディケーション控除0円 | `recommendedChoice` | "none" | 両方0円 |
| 14 | 通常控除とセルフメディケーション控除が同額 | `recommendedChoice` | "either" | 同額 |
| 15 | 期限（2026-12-31）経過後の基準日 | `expired` | true | セルフメディケーション税制の適用期限到来 |
