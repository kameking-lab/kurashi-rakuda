# 妊婦健診スケジュール生成（P2-T14）

簡易仕様書（BACKLOG.md の規約に基づき、数式・境界値・出典のみを記載する）。

- **docs/02**: #5（カテゴリ「妊娠・出産」）
- **queueId**: P2-T14
- **slug**: `ninshin-kenshin-schedule`
- **category**: `pregnancy`
- **難易度**: B（テンプレ量産可能）
- **YMYL区分**: 中〜高（健診の受診間隔という医学寄りの目安を扱うため、docs/03 §4.1 の「医療判断系は作らない」原則を適用し、あくまで制度上の標準スケジュール表示に徹する）

## 概要

出産予定日（または最終月経開始日）を入力すると、妊婦健康診査の標準的な受診間隔に基づく受診スケジュール（各回のおおよその受診日・妊娠週数）を一覧生成する。標準受診間隔は厚生労働省が示す「望ましい基準」に基づく目安（妊娠23週まで4週間に1回・24〜35週まで2週間に1回・36週以降1週間に1回、合計14回程度）であり、実際の受診間隔は妊婦・赤ちゃんの状態や医療機関の判断で前後する。あわせて、各回が公費助成の目安回数内であるかどうか（自治体差がある旨とセットで）、および産後の産婦健康診査（2週間・1か月目安）の参考日も表示する。

## 入力仕様

| フィールド名 | 型 | 必須/任意 | バリデーションルール |
|---|---|---|---|
| `dueDate`（出産予定日） | 日付（YYYY-MM-DD） | 実質必須（`lmp` があれば省略可） | 実在する日付。基準日（今日）から −70日〜+320日の範囲外はエラー |
| `lmp`（最終月経開始日） | 日付（YYYY-MM-DD） | 任意 | 実在する日付。`dueDate` が未入力の場合、`dueDate = lmp + 280日` として概算する。`dueDate` も入力されている場合は `dueDate` を優先し、`lmp` は「入力LMPと出産予定日から逆算したLMPとの差」を注意表示にのみ使う |
| `baseDate`（基準日） | 日付（YYYY-MM-DD） | 内部使用のみ | UIでは常にマウント後にクライアント側で取得した「今日」を使う（SSR/SSGとのずれ防止。Getsurei.tsx と同じ方式） |

`dueDate` と `lmp` のどちらも未入力の場合は結果を計算しない。

## ロジック仕様

### 実効LMP・出産予定日の決定（`resolveDates`）

```
if dueDate が入力されている:
    effectiveLmp = dueDate − 280日          # 40週0日を1周期とする逆算
    mismatchDays = lmp入力があれば (lmp − effectiveLmp) の日数差、なければ null
else if lmp が入力されている:
    effectiveDueDate = lmp + 280日
else:
    結果なし
```

280日（40週0日）は出産予定日・妊娠週数計算ツール（Q3-01、`ShussanYoteibi.calc.ts`）の `GESTATION_DAYS` と同じ基準値（ネーゲレ概算法の基本日数）。

### 受診間隔の区分（`intervalWeeksForGestationalWeek`）

妊娠週数 `w`（LMPからの経過週、0日時点）に対して、次回受診までの目安間隔（週）は以下のとおり。

```
w <= 23  → 4週間に1回
24 <= w <= 35 → 2週間に1回
w >= 36  → 1週間に1回
```

出典: data/seido/ninshin-kenshin-jyosei.json の `data.schedule.intervalDescription`（「妊娠初期から妊娠23週まで4週間に1回、妊娠24週から妊娠35週まで2週間に1回、妊娠36週から出産まで1週間に1回」）。

### スケジュール生成（`generateSchedule`）

1回目の目安は妊娠8週（`FIRST_VISIT_WEEK`。出典は下記データ表を参照）。以降は「現在の週数が属する区分の間隔」を積算して次回の週数を決め、目安日 = LMP + 週数×7日 を計算する。次回の目安日が出産予定日以降になる回は生成しない（出産予定日を過ぎた分の受診は本ツールの対象外。エッジケース参照）。

```
week = FIRST_VISIT_WEEK (既定8)
index = 1
loop:
    date = LMP + week*7日
    if date >= dueDate: 終了
    出力: { index, week, date, interval = このweekの区分の間隔 }
    week = week + intervalWeeksForGestationalWeek(week)
    index += 1
```

LMPと出産予定日がちょうど280日離れている標準的な入力では、この計算により妊娠8・12・16・20・24・26・28・30・32・34・36・37・38・39週の**14回**が生成される（下記データ表の厚生労働省リーフレット例示と完全一致）。

### 公費助成の目安回数との照合

各回について `index <= standardVisitCount`（データ由来。2026-07-17時点で14）であれば「公費助成の目安回数内」とみなす。standardVisitCount は `data/seido/ninshin-kenshin-jyosei.json` の `data.schedule.standardVisitCount.value` から読み、コードに直書きしない。

助成の**実施の有無・金額・検査項目は自治体ごとに異なる**（`data.publicFunding.isMunicipalityDiscretion = true`）。2026-07-17時点のこども家庭庁調査（令和6年4月1日現在）では全1,741市区町村（100%）が14回以上を助成しているが、これは「目安回数内なら必ず自己負担なしで受けられる」ことを意味しない。金額・検査項目は自治体差があるため、本ツールは「目安回数内である」という事実のみを表示し、金額は断定しない。

### 産後の産婦健康診査（参考表示）

`data/seido/sanpu-kenshin-jyosei.json` の `data.eligibility.firstCheckupTiming`（産後2週間）・`secondCheckupTiming`（産後1か月）を、出産予定日を起点にした目安日付に変換して参考表示する。

```
産後2週間の目安日 = dueDate + 14日
産後1か月の目安日 = dueDate + 暦1か月（応当日方式・月末クランプ）
```

暦1か月の加算は `Getsurei.calc.ts` の `addMonths` と同じ月末クランプ方式（`addCalendarMonths`）。国の補助対象は2回分（`data.eligibility.timesCovered`）、2026-07-17時点で1,741市区町村中1,445市区町村が実施（`data.implementationStatus.municipalitiesFY2024`）であり、全国一律に受けられるとは断定しない。

## データ表・出典

| 項目 | 値 | 出典 |
|---|---|---|
| 標準受診回数 | 14回程度 | data/seido/ninshin-kenshin-jyosei.json（`schedule.standardVisitCount`）／厚生労働省「“妊婦健診”を受けましょう（リーフレット）」（標準的な“妊婦健診”の例） |
| 受診間隔 | 〜23週:4週に1回／24〜35週:2週に1回／36週〜:1週に1回 | data/seido/ninshin-kenshin-jyosei.json（`schedule.intervalDescription`）／厚生労働省「“妊婦健診”を受けましょう（リーフレット）」 |
| 1回目の目安週数 | 妊娠8週 | 厚生労働省「“妊婦健診”を受けましょう（リーフレット）」（"標準的な"妊婦健診"の例"の表。「1回目が妊娠8週頃とした場合、受診回数は合計14回くらいになりますね」） URL: https://www.mhlw.go.jp/bunya/kodomo/boshi-hoken13/dl/02.pdf （案内ページ: https://www.mhlw.go.jp/bunya/kodomo/boshi-hoken13/） |
| 望ましい基準の根拠告示 | 妊婦に対する健康診査についての望ましい基準（平成27年3月31日厚生労働省告示第226号） | 母子保健法第13条第2項。data/seido/ninshin-kenshin-jyosei.json（`legalBasis.desirableStandardNotice`） |
| 公費助成が自治体ごとに異なる旨 | true | data/seido/ninshin-kenshin-jyosei.json（`publicFunding.isMunicipalityDiscretion`）／こども家庭庁「妊婦健診に関する取組み」 https://www.cfa.go.jp/policies/boshihoken/nimpukenshin |
| 14回以上助成する市区町村数 | 1,741（全市区町村。令和6年4月1日現在） | data/seido/ninshin-kenshin-jyosei.json（`publicFunding.municipalitiesFunding14OrMore`）／こども家庭庁「妊婦健康診査の公費負担の状況に係る調査結果について（令和6年4月1日現在）」 |
| 産婦健診の対象時期 | 産後2週間・産後1か月など | data/seido/sanpu-kenshin-jyosei.json（`eligibility.firstCheckupTiming` / `secondCheckupTiming`） |
| 産婦健診の国庫補助対象回数 | 2回分 | data/seido/sanpu-kenshin-jyosei.json（`eligibility.timesCovered`） |
| 産婦健診の実施市町村数 | 1,445（令和6年度、全1,741市区町村中） | data/seido/sanpu-kenshin-jyosei.json（`implementationStatus.municipalitiesFY2024`） |
| 妊娠期間の基準日数 | 280日（40週0日） | 出産予定日・妊娠週数計算ツール（Q3-01）`ShussanYoteibi.calc.ts` の `GESTATION_DAYS` と共通（ネーゲレ概算法） |

出典ドメインはいずれも `factory/config/source-allowlist.json` の許可リスト内（`mhlw.go.jp`・`cfa.go.jp`・`e-gov.go.jp`）。

## エッジケース

- 出産予定日のみ入力（最も一般的な使い方）: LMPは出産予定日から逆算する
- 最終月経開始日のみ入力: 出産予定日はLMP+280日で概算する（周期補正は行わない。Q3-01と異なり平均月経周期日数の入力欄は持たない簡易実装）
- 出産予定日とLMPの両方入力かつ食い違いがある場合: 出産予定日を優先して計算し、食い違いの日数を注意表示する（エラーにはしない。超音波検査等で確定した出産予定日を優先する一般的な考え方に基づく）
- 出産予定日が基準日より70日超前、または320日超先: 入力エラーとして結果を出さない（誤入力対策のゆるいガード。妊娠期間の実測範囲＋ゆとりを見た値であり、医学的な上限・下限を意味する値ではない）
- 出産予定日をすでに過ぎている場合（基準日が出産予定日の直後など）: スケジュール自体は出産予定日基準で計算されるため通常どおり表示されるが、生成される14回はすべて基準日から見て過去（`visitStatus` が `past`）になりうる
- 産後1か月の目安日で月末をまたぐ場合（例: 1/31出産予定 → 2/28が目安）は月末クランプする
- 標準受診回数（データ由来）が将来的に変わった場合でも、`isWithinStandardVisitCount` はデータの値を参照して判定するためコード修正は不要

## YMYL配慮事項

- 本ツールが表示するのは「制度上の標準的な受診間隔から機械計算した目安スケジュール」であり、医学的な受診指示・診断ではない。結果画面に固定文言で明記する:
  > 「この結果は、厚生労働省が示す標準的な受診間隔（妊娠週数に応じた目安）から日付を計算した参考スケジュールです。実際に何回・いつ受診するかは、妊娠経過・体調・医療機関の方針によって異なります。必ず担当医の指示を優先してください。」
- 公費助成については金額を断定しない。「目安回数内」であることのみを示し、実際の助成額・検査項目・受診券の方式はお住まいの市区町村で確認するよう案内する（data/seido の disclaimer をそのまま踏襲）
- 産後の産婦健康診査は全市区町村で実施されているわけではない（令和6年度で1,741市区町村中1,445市区町村）ため、「受けられます」と断定せず「お住まいの市区町村で実施されているかご確認ください」と案内する

## テストケース表（14件、基準日は特記なき限り 2026-07-17 とする）

| # | 入力 | 期待される出力（主な該当項目） |
|---|---|---|
| 1 | `dueDate=2027-01-01`（単独） | `ok:true`。実効LMP=2026-03-27。受診14回。1回目=index1・妊娠8週・2026-05-22。14回目=index14・妊娠39週・2026-12-25 |
| 2 | `dueDate=2027-03-01`（単独） | 実効LMP=2026-05-25。受診14回。1回目=2026-07-20（8週）。14回目=2027-02-22（39週） |
| 3 | `lmp=2026-08-01`（単独、`dueDate`未入力） | 実効出産予定日=2027-05-08（lmp+280日）。受診14回。1回目=2026-09-26（8週）。14回目=2027-05-01（39週） |
| 4 | `dueDate=2027-01-01`, `lmp=2026-03-01`（両方入力・食い違いあり） | 出産予定日を優先。実効LMP=2026-03-27。`lmpDueDateMismatchDays = -26`（入力LMPの方が26日早い） |
| 5 | `intervalWeeksForGestationalWeek(23)` / `(24)` | 4 / 2（23週と24週の境界） |
| 6 | `intervalWeeksForGestationalWeek(35)` / `(36)` | 2 / 1（35週と36週の境界） |
| 7 | `phaseLabelForGestationalWeek(23)` / `(24)` / `(36)` | 「妊娠初期〜23週…」/「妊娠24週〜35週…」/「妊娠36週〜出産まで…」 |
| 8 | `dueDate=2027-01-01` の産後健診目安 | 産後2週間目安=2027-01-15（due+14日）、産後1か月目安=2027-02-01（due+暦1か月） |
| 9 | `addCalendarMonths("2027-01-31", 1)` | `"2027-02-28"`（2027年は平年、1月31日の応当日が存在しないため月末クランプ） |
| 10 | `dueDate=2026-05-08`（基準日2026-07-17からちょうど70日前） | 境界値OK。`ok:true` |
| 11 | `dueDate=2026-05-07`（基準日から71日前） | `ok:false`。「出産予定日が基準日より70日以上前です。入力内容をご確認ください」 |
| 12 | `dueDate=2027-06-02`（基準日からちょうど320日後） | 境界値OK。`ok:true` |
| 13 | `dueDate=2027-06-03`（基準日から321日後） | `ok:false`。「出産予定日が基準日より320日以上先です。入力内容をご確認ください」 |
| 14 | `dueDate`・`lmp`ともに未入力 | `ok:false`。「出産予定日（または最終月経開始日）を入力してください」 |

（上記に加え、`isValidDateString` の不正形式判定・`visitStatus` の過去/当日/今後判定・`isWithinStandardVisitCount` の境界（`visitCount`を明示的に小さくした場合に一部の回がfalseになること）を `tests/ninshin-kenshin-schedule.test.ts` の補助関数テストで別途カバーする。）
