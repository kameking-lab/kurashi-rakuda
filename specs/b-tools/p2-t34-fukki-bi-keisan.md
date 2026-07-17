# P2-T34 復帰日計算（産休育休の各期限・保育園入園から逆算）

BACKLOG.md P2-T34（docs/02 #79、難易度B）の実装仕様書。「簡易」仕様＝数式・境界値・出典のみ。

- slug: `fukki-bi-keisan`
- category: `career`
- 実装: `components/tools/impl/FukkiBiKeisan.calc.ts`（ロジック）／`components/tools/impl/FukkiBiKeisan.tsx`（UI）
- テスト: `tests/fukki-bi-keisan.test.ts`
- SSOT: `data/seido/ikukyu-kyufu.json`・`data/seido/ikukyu-encho-youken.json`

## 1. 概要

出産日（または出産予定日）と「育休を延長する意向」を入力すると、産休・育休の各期限（産後休業終了日・育休の原則終了日・延長後の各期限）と、それぞれに対応する複数の「復帰候補日」を一覧で提示するツール。各候補日について、育児休業給付金の給付率（67%→50%）の切り替わりや、延長に必要な手続き・要件を、data/seido の制度データに基づいて注記する。金額計算は行わない（金額は既存の「産休育休まるごとお金シミュレーター」の範囲）。

## 2. 入力仕様

| 項目 | 型 | 必須 | 説明 |
|---|---|---|---|
| 出産日（または出産予定日） | date (YYYY-MM-DD) | 必須 | 実際の出産日が未定なら出産予定日を入力する。1900-01-01以降、当日から365日を超えて未来の日付は不可（`validateBirthDate`） |
| 育休を延長する意向 | enum: `none` / `until18m` / `until24m` | 必須（初期値 `none`） | 「延長しない（1歳まで）」「1歳6か月まで延長したい」「2歳まで延長したい」。候補一覧の`matchesIntent`フラグに反映するのみで、他候補の表示は妨げない |

## 3. ロジック仕様

### 3.1 暦の基本関数（`components/tools/impl/Getsurei.calc.ts` の UTC epoch day パターンをISO文字列で踏襲）

- `addDays(iso, n)`: `n`日後（負なら前）の日付。UTC epoch day を `Date.UTC` 経由で加算する。
- `addMonths(iso, months)`: `months`か月後の日付。応当日方式・月末クランプ（応当日が存在しない月はその月の末日）。
- `attainDay(birthDateIso, monthsFromBirth)` = `addDays(addMonths(birthDateIso, monthsFromBirth), -1)`。
  「Nか月に達する日」＝応当日の前日（年齢計算ニ関スル法律・民法143条の一般原則）。

### 3.2 産後休業終了日の目安

```
postnatalEnd = addDays(birthDate, POSTNATAL_LEAVE_DAYS)   // POSTNATAL_LEAVE_DAYS = 56（ikukyu-kyufu.json #periodAfterBirth）
ikukyuStart  = addDays(postnatalEnd, 1)                    // 育休開始日（産後休業の翌日）
```

参考情報（計算には使用しない・注記のみ）:
```
postnatalSixWeekDate = addDays(birthDate, 42)   // 労働基準法第65条第2項ただし書き。本人請求＋医師の許可があれば産後6週間経過後は就業させて差し支えないという特例
```
★この42日はdata/seido両ファイルに数値ノードが存在しない一般的な法律知識であり、SSOT外の参考情報として扱う（4.3参照）。

### 3.3 育休の各期限

```
principalEnd    = attainDay(birthDate, 12)   // 育休の原則終了日＝1歳に達する日
extension18End  = attainDay(birthDate, 18)   // 育休延長①の期限＝1歳6か月に達する日
extension24End  = attainDay(birthDate, 24)   // 育休延長②の期限＝2歳に達する日（LEAVE_EXTENSION_2_MONTHS = maxAge(2年) × 12）
```

いずれも「終了日」＝到達日そのもの（対象期間に含む）。復帰日はその翌日。

### 3.4 復帰候補日と育休給付率の内訳

4つの復帰候補（`afterPostnatal` / `principal` / `extension18` / `extension24`）を常にすべて算出する。`extensionIntent` は各候補の `matchesIntent` フラグにのみ反映し、表示自体は絞り込まない。

| 候補 | 復帰日 | 育休取得 |
|---|---|---|
| 産休明けすぐに復帰 | `ikukyuStart` | なし（`leave = null`） |
| 原則1歳まで | `addDays(principalEnd, 1)` | あり |
| 1歳6か月まで延長 | `addDays(extension18End, 1)` | あり（延長手続き必要） |
| 2歳まで延長 | `addDays(extension24End, 1)` | あり（延長手続き必要） |

育休を取得する候補について、給付率67%/50%の日数内訳（`leaveRateBreakdown`）:
```
totalDays = diffDays(ikukyuStart, endDateInclusive) + 1
days67    = min(totalDays, RATE_SWITCH_DAYS)          // RATE_SWITCH_DAYS = 180（ikukyu-kyufu.json #rateSwitchDays）
days50    = max(0, totalDays - RATE_SWITCH_DAYS)
rateSwitchDate = days50 > 0 ? addDays(ikukyuStart, RATE_SWITCH_DAYS) : null   // 181日目の日付
```

### 3.5 保育園入園の申込を検討し始める目安

```
nurseryCheckWindow(deadlineDate) = { from: addMonths(deadlineDate, -4), to: addMonths(deadlineDate, -2) }
```
自治体名・締切日を断定しないための一般的な目安（4か月前〜2か月前）としてのみ表示する。data/seido由来ではなく、UI文言も「自治体により異なります」を必ず添える。

### 3.6 延長の要件・注記（UI表示のみ・計算に影響しない）

延長候補（`extension18`・`extension24`）を表示する際は、以下をSSOTからそのまま引用して注記する:

- 育休そのものの延長要件: `EX.leaveExtension.nurseryUnavailableRule.firstExtension/secondExtension`、その他の事由 `otherReasons`
- 育児休業給付金の支給対象期間延長の3要件: `EX.benefitExtension.requirements.requirement1/2/3`
- 「休業の延長」と「給付金の延長」は別制度: `EX.keyPoints.twoSeparateSystems`
- 申込時点でのコピー保管必須: `EX.keyPoints.copyBeforeApplying`
- 不正受給の警告: `EX.benefitExtension.fraudWarning`

## 4. データ表・出典

### 4.1 `data/seido/ikukyu-kyufu.json`（fiscalYear: 2026, asOf: 2026-07-17）

| ノード | 値 | 用途 |
|---|---|---|
| `data.shussanTeateKin.periodAfterBirth.value` | 56（日） | 産後休業終了日の起算 |
| `data.ikujiKyugyoKyufuKin.rateSwitchDays.value` | 180（日） | 給付率切替の通算日数 |
| `data.ikujiKyugyoKyufuKin.rateFirst180Days.value` | 0.67 | 180日目までの給付率 |
| `data.ikujiKyugyoKyufuKin.rateAfter180Days.value` | 0.5 | 181日目以降の給付率 |

出典: e-Gov法令検索「健康保険法」（https://laws.e-gov.go.jp/law/211AC0000000070）、「雇用保険法」（https://laws.e-gov.go.jp/law/349AC0000000116）、厚生労働省「育児休業等給付の内容と支給申請手続」（https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000135090_00001.html）。

### 4.2 `data/seido/ikukyu-encho-youken.json`（fiscalYear: 2026, asOf: 2026-07-17）

| ノード | 用途 |
|---|---|
| `data.leaveExtension.secondExtension.maxAge.value`（= 2, unit: year） | 育休の上限年齢（2歳）。`LEAVE_EXTENSION_2_MONTHS` の根拠 |
| `data.leaveExtension.nurseryUnavailableRule.firstExtension/secondExtension` | 延長事由（保育所等に入所できない場合） |
| `data.leaveExtension.nurseryUnavailableRule.otherReasons` | 保育所等以外の延長事由 |
| `data.benefitExtension.requirements.requirement1/2/3` | 育児休業給付金の支給対象期間延長の3要件 |
| `data.keyPoints.twoSeparateSystems` | 休業の延長と給付金の延長は別制度という最重要論点 |
| `data.keyPoints.copyBeforeApplying` | 保育所等申込書の写しの保管必須 |
| `data.benefitExtension.fraudWarning` | 不正受給の警告 |

出典: 育児・介護休業法（https://laws.e-gov.go.jp/law/403AC0000000076）、雇用保険法施行規則（https://laws.e-gov.go.jp/law/350M50002000003）、厚生労働省「育児休業給付金の支給対象期間延長手続き」（https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000160564_00040.html）、同リーフレット（https://www.mhlw.go.jp/content/001269748.pdf）。

### 4.3 SSOT外の参考情報

「産後6週間経過後、本人請求＋医師の許可があれば就業可能」（労働基準法第65条第2項ただし書き）は、上記2ファイルのいずれにも数値ノードとして収録されていない。本ツールでは `POSTNATAL_SIX_WEEK_DAYS = 42` を参考日数として表示するが、復帰候補日・給付金の計算には使用しない。将来この特例をSSOT化する場合は、労働基準法の該当条文を出典に持つ `data/seido/*.json` を新設し、本ツールを差し替えること。

## 5. エッジケース

- **早産・予定日超過・多胎（双子等）**: 考慮しない。入力欄は単一の「出産日（出産予定日）」のみで、実際の出産日が確定した場合はユーザーが入力し直す前提。多胎による産前・産後期間の違いは本ツールの計算対象外（本ツールは産後56日以降のみを扱うため、多胎でも産後期間は56日で変わらず影響なし）。
- **うるう日（2/29）生まれ**: `addMonths` の月末クランプにより、非うるう年の応当日は2/28として扱う（例: 2024-02-29生まれの1歳到達日は2025-02-27）。既存の `Getsurei.calc.ts` の `addMonths` と同じ規則。
- **月末生まれ（例: 1/31）**: 応当日が存在しない月はその月の末日にクランプする（1/31生まれの1か月後の応当日は2/28または2/29）。
- **育休の延長要件を満たさない場合**: `extension18`・`extension24` の候補は常に表示するが、延長には保育所等に入所できない等の要件（4.2）を満たす必要があることをCalloutで明記し、要件を満たさなければ延長できない旨を必ず案内する（YMYL配慮）。
- **`extensionIntent` と候補表示の関係**: 意向は`matchesIntent`フラグにのみ影響し、候補自体の非表示・グレーアウトは行わない（延長するかどうかは保育園の入所結果等の後発事情に左右されるため、選択肢を狭めない）。

## 6. YMYL配慮事項

- 育休延長は「保育園に入れなかった」等の法定要件（`nurseryUnavailableRule`・`otherReasons`）を満たす場合に限られ、単に希望するだけでは延長できないことをCalloutで明記する。
- 「育児休業そのものの延長」（育児・介護休業法、勤務先への申出）と「育児休業給付金の支給対象期間の延長」（雇用保険法、ハローワークへの申請）は別制度であり、要件が異なることを`TWO_SEPARATE_SYSTEMS_NOTE`で明記する。
- 2025年4月以降、育児休業給付金の延長審査が厳格化されており（「速やかな職場復帰のための申込みか」等）、保育所等の利用申込書の写しを申込時点で保管しておく必要があることを`COPY_BEFORE_APPLYING_NOTE`で明記する。
- 申込内容と実際の申込内容が異なる場合は不正受給に該当しうることを`FRAUD_WARNING`で明記する。
- 勤務先の規定（育児・介護休業法を上回る独自の育休制度等）により本ツールの結果と異なる場合があることをCalloutで明記する。
- 保育園入園の申込時期は自治体により大きく異なるため、具体的な自治体名・締切日は断定せず、「一般的な目安」であることを明記する。
- 産後6週間の就業特例（4.3）はSSOT外の参考情報であり、実際に就業する場合は必ず勤務先・医師に確認する必要があることを明記する。
- 制度データの準拠年度・次回改定予定・免責事項は `SeidoNotice` コンポーネントで機械的に表示する（`ikukyuKyufuDataset`・`ikukyuEnchoDataset`）。

## 7. テストケース表

基準日は各テストで固定の出産日を用いる（`today` はバリデーションのみに使用）。

| # | 入力（出産日） | 検証対象 | 期待値 | 根拠 |
|---|---|---|---|---|
| 1 | 2026-01-01 | `postnatalEnd` | 2026-02-26 | +56日（1/1+56日=2/26。1月31日分＋2月26日分） |
| 2 | 2026-01-01 | `ikukyuStart` | 2026-02-27 | postnatalEndの翌日 |
| 3 | 2026-01-01 | `principalEnd`（1歳到達日） | 2026-12-31 | addMonths(+12)=2027-01-01の前日 |
| 4 | 2026-01-01 | `extension18End`（1歳6か月到達日） | 2027-06-30 | addMonths(+18)=2027-07-01の前日 |
| 5 | 2026-01-01 | `extension24End`（2歳到達日） | 2027-12-31 | addMonths(+24)=2028-01-01の前日 |
| 6 | 2026-01-01 | `principal`候補の`leave.totalDays`/`days67`/`days50` | 308 / 180 / 128 | ikukyuStart〜principalEndの日数、180日で67%→50%切替 |
| 7 | 2026-01-01 | `principal`候補の`rateSwitchDate` | 2026-08-26 | ikukyuStart + 180日 |
| 8 | 2026-01-01 | `afterPostnatal`候補の`returnDate`/`leave` | 2026-02-27 / null | 育休を取らず産休明けすぐ復帰 |
| 9 | 2024-02-29（うるう日生まれ） | `principalEnd` | 2025-02-27 | addMonths(+12)は非うるう年2025年2月28日にクランプ、その前日 |
| 10 | 2026-01-31（月末生まれ） | `attainDay(birthDate, 1)` | 2026-02-27 | addMonths(+1)=2026-02-28（月末クランプ）の前日 |
| 11 | 2026-06-15 | `nurseryCheckWindow`（principal候補、期限=2027-06-14） | from 2027-02-14 / to 2027-04-14 | 期限の4か月前・2か月前 |
| 12 | 2026-01-01 | `postnatalSixWeekDate` | 2026-02-12 | 出産日+42日（参考情報） |
| 13 | "2026-13-01"（不正日付） | `validateBirthDate` | `ok: false` | 存在しない月 |
| 14 | 2026-01-01, `extensionIntent: "until18m"` | `extension18`候補の`matchesIntent` | true（他候補は false） | 意向フラグの反映 |
