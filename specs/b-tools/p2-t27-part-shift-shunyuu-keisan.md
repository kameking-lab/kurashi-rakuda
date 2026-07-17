# パートシフト収入計算（壁警告付き）（P2-T27）

## 概要

時給・週の勤務日数・1日の勤務時間（またはシフト表から分かる月収の直接入力）を入力すると、月収・年収の見込みを換算し、既存の「扶養の壁シミュレーター2026」（`lib/tools/impl/fuyo-kabe.ts`、Q3-18）の壁判定ロジックにそのまま渡して、103/106/130/150万円等の壁までの距離を表示するツール。

- docs/02 **#57**（カテゴリ4: お金、難易度B）。BACKLOG.md queueId: `P2-T27`。
- 依存データ: `data/seido/part-shift-shunyuu-kabe.json`（シフト制勤務特有の実務情報）・`data/seido/fuyou-kabe.json`（壁の金額・税額計算。`fuyo-kabe.ts` 経由）。
- **★車輪の再発明禁止★**: 103/106/130/150万円等の壁の金額・税額計算式・社会保険の加入判定式は、本ツールでは一切再実装しない。`lib/tools/impl/fuyo-kabe.ts` の `evaluateWalls` / `judgeShaho` / `judgeDependent` / `FuyoInput` をそのまま呼び出す。本ツール（`PartShiftShunyuuKeisan.calc.ts`）が担当するのは「時給・シフトから月収・年収を換算する」部分のみであり、壁判定に対しては薄いラッパーとして振る舞う。
- YMYL区分: 高（お金の壁は超えたときの実害〈扶養から外れる・社会保険料が発生する〉が大きい）。既存の検証済みロジックを信頼して呼び出すのみとし、独自の税・社保計算式を実装しない。

## fuyo-kabe.ts では扱っていない固有情報（part-shift-shunyuu-kabe.json から活用する点）

`fuyo-kabe.ts`（および Q3-18 のUI）は「年間の給与収入」を単一の値として受け取り、税・106万円・130万円のすべての判定にその1つの値を使う設計になっている。これはシフト制の実務においては不正確になりうる点があり、`part-shift-shunyuu-kabe.json` の `shiftWorkerPractice.socialInsuranceVsDependentDifference` が明記している。

> 106万円の壁（短時間労働者の適用）は所定内賃金のみで判定し残業代・賞与・通勤手当を除くが、130万円の壁（被扶養者認定）は通勤手当・賞与を含む全ての収入で判定する。

本ツールはこの区別を活かし、**通勤手当等（月額）を任意入力**として受け付ける。

- 106万円の壁（社会保険の加入判定）・所得税の壁（103/136/178万円等）: **通勤手当を含まない**所定内賃金ベースの年収換算（`annualBase`）を `fuyo-kabe.ts` に渡す（通勤手当は課税上も原則非課税、かつ106万円の壁の所定内賃金からも除外されるため）。
- 130万円の壁（被扶養者認定）: **通勤手当を含む**年収換算（`annualTotal`）で判定しなおす。`fuyo-kabe.ts` の `evaluateWalls` は単一の salary で計算するため、本ツールは `judgeDependent` を `annualTotal` で個別に呼び出し、`evaluateWalls(annualBase の入力)` が返す「扶養から外れる年収」の行の `status` のみを、この個別判定結果で上書きする（壁の金額＝しきい値は年齢・扶養区分のみで決まり収入に依存しないため、上書きが必要なのは status のみ）。

また、`part-shift-shunyuu-kabe.json` の `dependentCertificationMonthly.monthlyThreshold`（108,333円／月）を、シフト管理の実務上の目安として画面に表示する（`fuyo-kabe.ts`・Q3-18のUIは年間の壁しか見せていないため、月々の管理という視点を補う）。あわせて `temporaryIncomeException`（一時的な収入超過でも事業主の証明により原則連続2回まで扶養にとどまれる特例）をCalloutで案内する。これも`fuyo-kabe.ts`にはない情報である。

## 入力仕様

| フィールド名 | 型 | 必須/任意 | バリデーションルール |
|---|---|---|---|
| 収入の入力方法（incomeMode） | `"shift"` \| `"monthlyDirect"` | 必須 | どちらかを選択 |
| 時給（hourlyWage） | 数値（円） | shiftモード時必須 | 1円以上100,000円以下 |
| 週の勤務日数（daysPerWeek） | 数値（日） | shiftモード時必須 | 1以上7以下 |
| 1日の勤務時間（hoursPerDay） | 数値（時間） | shiftモード時必須 | 0より大きく24以下 |
| 月収（monthlyIncome） | 数値（円） | monthlyDirectモード時必須 | 0円以上10,000,000円以下 |
| 週の所定労働時間（weeklyHoursForMonthlyMode） | 数値（時間） | monthlyDirectモード時必須 | 0以上168以下。106万円の壁の週20時間要件の判定に使用 |
| 月あたりの通勤手当等（commuteAllowanceMonthly） | 数値（円） | 任意（既定0） | 0円以上 |
| 年齢（age） | 数値（歳） | 必須 | 1以上120以下 |
| 誰の扶養に入っているか（target） | `"spouse"` \| `"parent"` \| `"none"` | 必須 | fuyo-kabe.ts の `FuyoTarget` をそのまま使用 |
| 学生か（isStudent） | 真偽値 | 必須（既定false） | — |
| 勤務先の従業員数区分（employerSize） | `"51plus"` \| `"under51"` \| `"unknown"` | 必須（既定"unknown"） | fuyo-kabe.ts の `EmployerSize` をそのまま使用 |
| 2か月を超えて使用される見込みか（overTwoMonths） | 真偽値 | 必須（既定true） | — |
| 配偶者の年間給与収入（supporterSalary） | 数値（円） | target="spouse" のとき使用 | 0円以上 |
| 同一世帯か（sameHousehold） | 真偽値 | 必須（既定true） | — |
| 試算の基準月（baseMonth） | `YYYY-MM` | 必須 | fuyo-kabe.ts の `isWageRequirementActive` の判定に使用 |

shiftモードの場合、週の所定労働時間（社会保険の週20時間判定に使う値）は `hoursPerDay × daysPerWeek` から自動的に導出し、別途の入力は求めない（同じ勤務パターンを表す値のため、二重入力による矛盾を避ける）。

## ロジック仕様

### 1. 年収換算（月収→年収換算式）

```
# shiftモード
annualBase = hourlyWage × hoursPerDay × daysPerWeek × 52   # 週52週換算（365日≒52.14週の単純近似）
weeklyHours = hoursPerDay × daysPerWeek

# monthlyDirectモード
annualBase = monthlyIncome × 12
weeklyHours = weeklyHoursForMonthlyMode

annualTotal = annualBase + commuteAllowanceMonthly × 12
baseMonthly = annualBase ÷ 12    # 表示用
totalMonthly = annualTotal ÷ 12  # 表示用
```

★52週換算の理由★: 1か月あたりの週数は4〜5週で変動するため、「1週間の収入 × 週の勤務日数」を月ごとに単純に12倍すると、実際に4週の月と5週の月がある分だけ年間の実態とズレる。年52週（週次パターンがすべての月に均等に現れると仮定）で年収を出し、それを12で割って「月あたりの平均」を表示する方式のほうが、月による凸凹を均せるため実態に近い。エッジケース節に明記。

### 2. fuyo-kabe.ts への委譲

```
baseFuyoInput: FuyoInput = {
  salary: annualBase,       # 通勤手当を含まない
  age, target, isStudent, employerSize,
  weeklyHours, overTwoMonths, supporterSalary, sameHousehold, baseMonth,
}
totalFuyoInput: FuyoInput = { ...baseFuyoInput, salary: annualTotal }  # 通勤手当を含む

walls = evaluateWalls(baseFuyoInput)     # 税の壁・106万円の壁はこちらを採用
shaho = judgeShaho(baseFuyoInput)        # 106万円の壁（所定内賃金ベース）
dependentTotal = judgeDependent(totalFuyoInput)  # 130万円等の壁（通勤手当込み）

# walls配列のうち name === "扶養から外れる年収" の行だけ、
# dependentTotal の isDependent/failedHalfRule に基づいて status を上書きする
# （amount＝しきい値は年齢・扶養区分のみで決まり収入に依存しないため、上書き対象は status のみ）
```

金額・判定式そのものはすべて `fuyo-kabe.ts` の関数が計算する。本ロジックが独自に持つ数値は「週52週」という単位換算の定数のみで、税・社会保険の壁の金額・料率は一切保持しない。

### 3. 月々の目安との比較（part-shift-shunyuu-kabe.json 由来の付加情報）

```
monthlyDependentGuide = 108,333  # data/seido/part-shift-shunyuu-kabe.json の dependentCertificationMonthly.monthlyThreshold.value
monthlyDependentRemaining = monthlyDependentGuide - totalMonthly   # 正なら「あと◯円まで」、負なら「既に超えています」
```

この108,333円は `annualThreshold(130万円) ÷ 12` の値であり、`fuyou-kabe.json` の130万円としきい値・出典が同一であることを `part-shift-shunyuu-kabe.json` 自身が明記している（二重管理ではなく同一値の別ファイル記載）。年齢区分により130万円ではなく150万円・180万円が適用される場合は、月次目安としての108,333円は参考値にとどまり、その場合は年換算の壁（`dependentTotal.threshold`）を優先して表示する。

## データ表・出典

本ツールが直接参照する制度データは以下の2ファイル（数値の再定義は行わず import のみ）。

- `data/seido/fuyou-kabe.json`（`fuyo-kabe.ts` 経由。103/136/159/163/178/197/207万円・106/130/150/180万円の壁の金額と税額計算式の出典。国税庁・財務省・日本年金機構・厚生労働省・e-Gov法令検索）
- `data/seido/part-shift-shunyuu-kabe.json`（シフト制の実務情報。月額108,333円の実務目安・106万円と130万円の収入算入範囲の違い・一時的な収入超過の例外規定。日本年金機構・厚生労働省・e-Gov法令検索）

いずれも `checkedAt: 2026-07-17`時点の内容。次回確認日は両ファイルの `nextCheckDue`（`fuyou-kabe.json` 側・`part-shift-shunyuu-kabe.json` 側とも2026年10月の賃金要件撤廃予定に関する `amendments` を持つため、それぞれのファイルの更新に追随する）。

## エッジケース

- **時給0円・負数**: 入力エラー（「時給は1円以上の数値で入力してください」）。
- **週の勤務日数0・8日以上**: 入力エラー（1〜7日の範囲外）。
- **1日の勤務時間0・25時間以上**: 入力エラー（0より大きく24時間以下の範囲外）。
- **月収の直接入力が負数・極端に大きい（1,000万円超）**: 入力エラー。
- **週52週換算による年収の丸め**: 52週換算は近似であり、実際の勤務日数（祝日・有給・欠勤等）によって実態の年収は変動する。結果画面に「年52週で換算した目安です」と明記する。
- **通勤手当を入力しない場合**: `commuteAllowanceMonthly = 0` となり、`annualBase === annualTotal` となるため、106万円の壁と130万円の壁の判定に差は出ない（通勤手当がない、またはシフト表の月収に通勤手当が含まれていない前提の入力である場合はこれで正しい）。
- **monthlyDirectモードで通勤手当込みの月収をそのまま入力してしまった場合**: 106万円の壁の判定（所定内賃金ベースを要求）に通勤手当が混入し、実態より加入判定が厳しめ（安全側）に出る可能性がある。UIのヒント文で「通勤手当を除いた金額を入力してください（通勤手当は別欄で入力）」と明示することで対処する（機械的な自動判別はできないため、入力者への説明で対処する設計）。
- **賃金要件撤廃（2026年10月1日予定）をまたぐ試算**: `baseMonth` を2026-10以降に設定すると、`fuyo-kabe.ts` の `isWageRequirementActive` が自動的に賃金要件（月8.8万円以上）を判定から外す。本ツールはこの分岐ロジックを一切再実装せず、`fuyo-kabe.ts` の判定結果をそのまま表示する。
- **合計所得2,350万円超（基礎控除の区分外）**: `fuyo-kabe.ts` の `simulate`/`evaluateWalls` は課税所得の算出を断念し `outOfRange` 相当の扱いとなるが、壁との比較自体は可能なため、本ツールも壁の一覧表示は継続する（fuyo-kabe.tsの既存の挙動をそのまま踏襲）。

## YMYL配慮事項

- 壁の金額・判定式は一切自前で再定義せず、Q3-18で検収済みの `fuyo-kabe.ts` の関数をそのまま呼び出す。本ツール独自のロジックは「時給・シフトから年収を換算する」計算と「通勤手当の有無による106万円/130万円の算入範囲の違いを反映する」薄い委譲部分のみに限定する。
- 年52週換算はあくまで目安であることを常時表示する（不安を煽らず、しかし精度の限界を隠さない）。
- 通勤手当を含む/含まない判定の違いは、混乱しやすい実務上の落とし穴であるため、画面内で明示的に説明する（`part-shift-shunyuu-kabe.json` の `shiftWorkerPractice.socialInsuranceVsDependentDifference` を出典に用いる）。
- 一時的な収入超過（繁忙期のシフト増等）に対する事業主の証明による救済（`temporaryIncomeException`）を、扶養から外れる判定が出た場合にCalloutで案内する。断定はせず「勤務先にご相談ください」という案内にとどめる。
- 準拠年度（2026年度・令和8年度）・出典（国税庁・財務省・日本年金機構・厚生労働省）・最終確認日をSeidoNoticeで表示する（`fuyoKabeDataset` と `partShiftKabeDataset` の両方）。
- 賃金要件撤廃（2026年10月予定）はあくまで「予定」であり確定事項でないことを、`fuyo-kabe.ts`/`part-shift-shunyuu-kabe.json` の記述に従いそのまま表示する（本ツールで独自の断定は行わない）。

## テストケース表

| # | 入力概要 | 期待される結果 | 備考 |
|---|---|---|---|
| 1 | shiftモード: 時給1,250円・週5日・1日4時間 | annualBase = 1,250×4×5×52 = 1,300,000円 | 52週換算の基本ケース |
| 2 | shiftモード: 時給1,000円・週3日・1日3時間 | annualBase = 1,000×3×3×52 = 468,000円 | 小規模シフトの基本ケース |
| 3 | monthlyDirectモード: 月収108,000円 | annualBase = 1,296,000円 | 直接入力モードの年換算 |
| 4 | ケース1＋通勤手当月10,000円 | annualBase = 1,300,000円／annualTotal = 1,420,000円 | 通勤手当が年収換算に加算されることの確認 |
| 5 | ケース4で target="spouse"・age=30・sameHousehold=true・supporterSalary=6,000,000 | 106万円の壁（shaho）は annualBase=1,300,000 を根拠に判定／130万円の壁（dependent）は annualTotal=1,420,000≧130万円 のため isDependent=false | 通勤手当の有無で106万円と130万円の判定が別の収入を参照することの確認（本ツールの中核ロジック） |
| 6 | ケース1（通勤手当なし）で同条件 | annualBase === annualTotal = 1,300,000 のため、dependent.isDependent は annualTotal=1,300,000 に基づき false（130万円未満ではなく "未満"要件でちょうど130万は外れる） | 通勤手当0円時の整合性確認 |
| 7 | shiftモード: 時給0円 | エラー「時給は1円以上の数値で入力してください」 | 0円は入力エラー |
| 8 | shiftモード: 時給-500円 | エラー | 負数は入力エラー |
| 9 | shiftモード: 週の勤務日数8日 | エラー「週の勤務日数は7日以下で入力してください」 | 7日超は入力エラー |
| 10 | shiftモード: 1日の勤務時間25時間 | エラー「1日の勤務時間は24時間以下で入力してください」 | 24時間超は入力エラー |
| 11 | monthlyDirectモード: 月収-1円 | エラー「月収は0円以上の数値で入力してください」 | 負数は入力エラー |
| 12 | monthlyDirectモード: 月収20,000,000円 | エラー「月収が現実的な範囲を超えています」 | 非現実的に大きい値は入力エラー |
| 13 | 年齢0歳・年齢150歳 | エラー「年齢を正しく入力してください」 | 年齢の範囲外は入力エラー |
| 14 | ケース1で baseMonth="2026-06"（賃金要件撤廃前） | shaho.wageRequirementActive === true | fuyo-kabe.tsの既存ロジックへの委譲確認 |
| 15 | ケース1で baseMonth="2026-11"（賃金要件撤廃後） | shaho.wageRequirementActive === false | 賃金要件撤廃後の分岐が fuyo-kabe.ts 経由で反映される確認 |
| 16 | monthlyDirectモードで weeklyHoursForMonthlyMode 未指定（0未満やNaN） | エラー「週の所定労働時間は0以上の数値で入力してください」 | monthlyDirectモード固有の必須チェック |
| 17 | 月次目安（monthlyDependentRemaining）の算出 | ケース1（通勤手当なし・totalMonthly=108,333.33…）で monthlyDependentGuide(108,333) − totalMonthly がほぼ0（境界値） | 108,333円という月次目安が130万円÷12と整合すること |
