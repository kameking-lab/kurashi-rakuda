# 資格・学び直し 費用と給付金（教育訓練給付）チェック（P3-T03）

## 概要

雇用保険の被保険者期間・在職/離職の別（離職している場合は離職からの経過期間）・受講予定/受講中の講座の種類を選ぶと、雇用保険の教育訓練給付に関する5区分（①一般教育訓練給付金②特定一般教育訓練給付金③専門実践教育訓練給付金④教育訓練支援給付金⑤教育訓練休暇給付金）について、被保険者期間などの支給要件を満たす見込みかどうかを一覧でチェックできるツール。受講費用の見込み額を入力すると、一般・特定一般教育訓練の概算給付額（給付率×費用、上限額あり）も計算する。

- docs/02_ツール一覧.md **#88**（カテゴリ6: 仕事・キャリア、難易度B）。
- 制度データ: `data/seido/kyouiku-kunren-kyufukin.json`（厚生労働省・ハローワークインターネットサービス、`fiscalYear: 2026`, `asOf: 2026-07-17`）を単一の情報源（SSOT）とする。給付率・上限額・支給要件期間・暫定措置の期限などの数値・プロースはすべて同JSONを参照し、本ツール・本仕様書に直接ハードコードしない。
- YMYL区分: **中**（給付金の受給可否・見込み額に関わる判定であり、誤った案内は「対象外なのに申請してしまう／対象なのに申請を諦める」という実害につながるため出典を正確に扱う）。
- 各区分の判定は「被保険者期間・離職状況・講座の種類という簡単な入力に基づく大まかなチェック」にとどめ、断定的な「必ず支給される」という表現は用いない（複雑な判定ロジックは持たない。§0〜§7参照）。

## 入力仕様

| フィールド名 | 型 | 必須/任意 | バリデーションルール |
|---|---|---|---|
| 雇用保険の被保険者期間（insuredYears） | 数値（年、小数可） | 必須 | 0以上。転職などで通算した期間の目安 |
| 初めて教育訓練給付金を受給するか（isFirstTime） | 真偽値 | 必須（既定値: false） | 過去に教育訓練給付金を受給したことがないか |
| 在職中か離職しているか（employmentStatus） | 列挙値（"employed"\|"leftJob"） | 必須 | |
| 離職してからの経過期間（monthsSinceLeaving） | 数値（月） | employmentStatus="leftJob"の場合のみ必須 | 0以上 |
| 受講予定・受講中の講座の種類（courseType） | 列挙値（"ippan"\|"tokuteiIppan"\|"senmonJissen"\|"unsure"） | 必須 | 分からない場合は"unsure"（わからない）を選択 |
| 受講費用の見込み（trainingCost） | 数値（円） | 任意 | 0以上。入力があれば一般・特定一般教育訓練の概算給付額を計算する |

## ロジック仕様

### 0. 共通の判定ヘルパー

```
meetsInsuredPeriod(insuredYears, isFirstTime, normalYears, firstTimeYears):
    insuredYears >= normalYears  または (isFirstTime かつ insuredYears >= firstTimeYears)

isLeaverExpired(employmentStatus, monthsSinceLeaving):
    employmentStatus === "leftJob" かつ monthsSinceLeaving > LEAVER_GRACE_YEARS(1) * 12
```

★離職者の受講開始猶予期間（`data.senmonJissen.leaverGracePeriod.value` = 1年）は、JSON上は専門実践の項目だが、その `note` に「3種類すべてに共通の要件」と明記されているため、一般・特定一般・専門実践の3区分すべてにこの値を適用する★。

### 1. 一般教育訓練給付金（ippan）

```
courseMismatch = courseType !== "unsure" かつ courseType !== "ippan"
meetsPeriod = meetsInsuredPeriod(insuredYears, isFirstTime, eligibilityPeriod(3), eligibilityPeriodFirstTime(1))
leaverExpired = isLeaverExpired(employmentStatus, monthsSinceLeaving)

if courseMismatch:      status = "notApplicable"
elif not meetsPeriod:   status = "notTarget"
elif leaverExpired:     status = "notTarget"
else:                   status = "target"
```

表示する数値: `benefitRate.value`（20%）・`benefitCap.value`（上限10万円）・`eligibilityPeriod.value`（3年）・`eligibilityPeriodFirstTime.value`（1年）。申請期限は `applicationDeadline.value`（訓練修了日の翌日から1か月以内）を原文で表示。一般教育訓練は特定一般・専門実践と異なり事前のキャリアコンサルティング・受給資格確認の手続きが不要である旨（`careerConsultingRequired.note`）を常時表示する。

**概算給付額（受講費用の入力がある場合）**: `min(受講費用 × benefitRate, benefitCap)`。計算額が `data.overview.minimumBenefitAmount.value`（4,000円）以下の場合は0円とし、その旨（`minimumBenefitAmount.note`）を表示する。

### 2. 特定一般教育訓練給付金（tokuteiIppan）

```
courseMismatch = courseType !== "unsure" かつ courseType !== "tokuteiIppan"
meetsPeriod = meetsInsuredPeriod(insuredYears, isFirstTime, eligibilityPeriod(3), eligibilityPeriodFirstTime(1))
leaverExpired = isLeaverExpired(employmentStatus, monthsSinceLeaving)

if courseMismatch:      status = "notApplicable"
elif not meetsPeriod:   status = "notTarget"
elif leaverExpired:     status = "notTarget"
else:                   status = "target"
```

表示する数値: 基本の給付率 `benefitRate.value`（40%、上限20万円）と、資格取得＋就職した場合の給付率 `benefitRateAfterQualification.value`（50%、上限25万円）の両方。★令和6年10月1日創設の50%は差額精算方式（`benefitRateAfterQualification.note`）であり、基本給付40%に別枠で上乗せされる額ではなく、最終的な支給総額を指す★。事前手続き（`priorProcedureDeadline`。受講開始日の2週間前までに受給資格確認）を常時表示する（見落とされやすい期限のため）。

**概算給付額（受講費用の入力がある場合）**: 基本給付 = `min(受講費用 × benefitRate, benefitCap)`。資格取得＋就職した場合の見込み合計額 = `min(受講費用 × benefitRateAfterQualification, benefitCapAfterQualification)`。両者を合算しない（差額精算のため合計額として提示）。

### 3. 専門実践教育訓練給付金（senmonJissen）

```
courseMismatch = courseType !== "unsure" かつ courseType !== "senmonJissen"
meetsPeriod = meetsInsuredPeriod(insuredYears, isFirstTime, eligibilityPeriod(3), eligibilityPeriodFirstTime(2))
leaverExpired = isLeaverExpired(employmentStatus, monthsSinceLeaving)

if courseMismatch:      status = "notApplicable"
elif not meetsPeriod:   status = "notTarget"
elif leaverExpired:     status = "notTarget"
else:                   status = "target"
```

★専門実践のみ初めて受給する場合の要件が2年（一般・特定一般は1年）★。表示する数値: `stages.rows`（3段階: 50%/年間上限40万円・70%/56万円・80%/64万円とそれぞれの条件）、`maxYears.value`（最大3年）、`maxTotalBenefit.value`（受給総額の上限192万円）。事前手続き（`priorProcedureDeadline`）を常時表示する。

★**概算給付額の計算はしない**★。専門実践は①6か月ごとの分割支給②3段階の差額精算方式③段階ごとの年間上限④最大3年間の複数年度合算、という4つの要素が絡むため、受講費用から単純な掛け算で見込み額を出すと実態と大きく乖離する恐れがある。本ツールは率・上限額・段階条件を提示するにとどめ、その旨を明記した注記（`senmonJissen.notes` 内の固定文言）を必ず表示する。詳しい見込み額はハローワークへの相談を促す。

### 4. 教育訓練支援給付金（shienKyufukin）

```
courseMismatch = courseType !== "unsure" かつ courseType !== "senmonJissen"
provisionalExpired = isShienKyufukinProvisionalExpired(today)
   # data.amendments のうち summary に「教育訓練支援給付金」を含み status="expires" の
   # 項目の expiresOn（2027-03-31）と today を比較。日付をハードコードしない。
senmonMeetsPeriod = meetsInsuredPeriod(insuredYears, isFirstTime, 専門実践のeligibilityPeriod(3), eligibilityPeriodFirstTime(2))
leaverExpired = isLeaverExpired(employmentStatus, monthsSinceLeaving)

if courseMismatch:                          status = "notApplicable"
elif provisionalExpired:                    status = "notTarget"
elif employmentStatus !== "leftJob":        status = "notTarget"
elif not senmonMeetsPeriod or leaverExpired: status = "notTarget"
else:                                        status = "target"
```

教育訓練支援給付金は専門実践教育訓練を受講する**失業状態**の方のみが対象のため、`employmentStatus === "employed"`（在職中）は常に対象外とする。表示する数値: `benefitRate.value`（基本手当日額の60%。★令和7年4月1日に80%→60%へ引下げ済み★）、暫定措置の期限（`provisionalMeasureUntil.value`）。年齢要件（`ageLimit.value`=45歳未満）・対象外訓練形態（`excludedTrainingTypes.value`。通信制・夜間制は対象外）・失業認定の頻度（`certificationInterval.value`）は本ツールの入力では判定できないため、常に注記として提示する（年齢は入力項目にないため個別確認を促す）。

### 5. 教育訓練休暇給付金（kyuukaKyufukin）

```
meetsRequirement1Approx = insuredYears >= requirementInsuredMonths(12) / 12
meetsRequirement2 = insuredYears >= requirementEnrollmentYears(5)
meetsEither = meetsRequirement1Approx or meetsRequirement2

if employmentStatus !== "employed": status = "notTarget"
elif not meetsEither:               status = "notTarget"
else:                                status = "target"
```

教育訓練休暇給付金は、受講予定の講座の種類（courseType）に依存しない独立した給付であり、courseMismatchによる `notApplicable` は発生しない。在職中に就業規則等に基づく連続30日以上の無給の教育訓練休暇を取得する方向けの給付のため、離職者は対象外とする。

★近似判定であることの明記★: 要件①（`requirementInsuredMonths.value`=12か月。休暇開始前**2年間**の被保険者期間）は本来「直近2年間の実績」を問うが、本ツールの入力は通算の被保険者期間のみのため、12か月を1年に換算した近似値で判定する。要件②（`requirementEnrollmentYears.value`=5年。休暇開始前の通算加入期間）とは粒度が異なるため、要件①の判定結果は目安であることを注記に明記する。

★給付率・給付日数は未確認★: `benefitRate.value` と `benefitDays.value` はJSON上 `null`（2026-07-17時点で厚生労働省の公開資料から一次情報で確認できなかった項目）。本ツールはこれらの金額・日数を計算せず、JSONの `note`（未確認である理由の説明）をそのまま表示する。

## データ表・出典

`data/seido/kyouiku-kunren-kyufukin.json`（厚生労働省・ハローワークインターネットサービス、`fiscalYear: 2026`, `asOf: 2026-07-17`）より転記。

| 項目 | 値 | JSONパス |
|---|---|---|
| 一般教育訓練の給付率・上限 | 20%・上限10万円 | `data.ippan.benefitRate`・`data.ippan.benefitCap` |
| 一般教育訓練の支給要件期間 | 通算3年（初めて受給する場合は1年） | `data.ippan.eligibilityPeriod`・`data.ippan.eligibilityPeriodFirstTime` |
| 特定一般教育訓練の給付率・上限（基本） | 40%・上限20万円 | `data.tokuteiIppan.benefitRate`・`data.tokuteiIppan.benefitCap` |
| 特定一般教育訓練の給付率・上限（資格取得＋就職） | 50%・上限25万円（令和6年10月1日創設） | `data.tokuteiIppan.benefitRateAfterQualification`・`benefitCapAfterQualification` |
| 専門実践教育訓練の給付率（3段階） | 50%（年間上限40万円）→70%（56万円）→80%（64万円） | `data.senmonJissen.stages.rows` |
| 専門実践教育訓練の最大受給年数・総額上限 | 3年・192万円 | `data.senmonJissen.maxYears`・`maxTotalBenefit` |
| 専門実践教育訓練の支給要件期間 | 通算3年（初めて受給する場合は2年） | `data.senmonJissen.eligibilityPeriod`・`eligibilityPeriodFirstTime` |
| 離職者の受講開始猶予期間（3区分共通） | 1年以内 | `data.senmonJissen.leaverGracePeriod` |
| 教育訓練支援給付金の給付率 | 基本手当日額の60%（令和7年4月1日に80%から引下げ） | `data.shienKyufukin.benefitRate` |
| 教育訓練支援給付金の暫定措置の期限 | 令和8年度末（2027年3月31日） | `data.shienKyufukin.provisionalMeasureUntil`／`amendments`（`expiresOn: "2027-03-31"`） |
| 教育訓練支援給付金の年齢上限 | 45歳未満 | `data.shienKyufukin.ageLimit` |
| 教育訓練休暇給付金の創設日 | 令和7年（2025年）10月1日 | `data.kyuukaKyufukin.establishedOn` |
| 教育訓練休暇給付金の対象休暇日数 | 連続30日以上・無給 | `data.kyuukaKyufukin.minimumLeaveDays` |
| 教育訓練休暇給付金の要件①・② | 直近2年に12か月以上／通算5年以上 | `data.kyuukaKyufukin.requirementInsuredMonths`・`requirementEnrollmentYears` |
| 教育訓練休暇給付金の給付率・給付日数 | **未確認（value: null）** | `data.kyuukaKyufukin.benefitRate`・`benefitDays` |
| 支給されない下限額（5区分中3区分に共通） | 4,000円以下 | `data.overview.minimumBenefitAmount` |
| 再受給の制限 | 前回受給から3年以内は不可 | `data.overview.reReceiptInterval` |

出典URL:
- ハローワークインターネットサービス「教育訓練給付金」https://www.hellowork.mhlw.go.jp/insurance/insurance_education.html （`checkedAt: 2026-07-17`。★本データの中核出典★）
- 厚生労働省「教育訓練給付金」https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/jinzaikaihatsu/kyouiku.html （`checkedAt: 2026-07-17`）
- 厚生労働省「令和６年10月から教育訓練給付金を拡充します」https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000160564_00042.html （`checkedAt: 2026-07-17`）
- 厚生労働省「教育訓練休暇給付金」https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyou/koyouhoken/kyukakyufukin.html （`checkedAt: 2026-07-17`）
- 厚生労働省WEBマガジン「令和７年１０月から『教育訓練休暇給付金』が創設されます」https://www.mhlw.go.jp/stf/web_magazine/closeup/06.html （`checkedAt: 2026-07-17`）

次回確認: `data/seido/kyouiku-kunren-kyufukin.json` の `nextCheckDue`（2027-04-01）を基準とする。

## エッジケース

- **被保険者期間が全区分の要件を満たさない**: 一般・特定一般・専門実践がいずれも `notTarget`、教育訓練休暇給付金も要件①・②を満たさず `notTarget` となる場合、`anyTarget=false` となり、画面上部に「現在の入力では対象になる区分が確認できない」旨のCalloutを表示する。
- **講座の種類が「わからない」**: 一般・特定一般・専門実践の3区分すべてを通常どおり判定する（`notApplicable` にしない）。ユーザーがどの講座に該当するか未確定な段階でも、要件を満たしうる区分を漏れなく提示するため。
- **講座の種類を明示的に選択**: 選択した種類以外の課程連動区分（一般・特定一般・専門実践）は `notApplicable`（対象区分外）として参考表示にとどめ、`notTarget`（要件を満たさない）と区別する。教育訓練支援給付金は専門実践選択時のみ判定対象とし、それ以外は `notApplicable`。
- **離職者の猶予期間ちょうど1年（12か月）**: 猶予期間内として `target` 側に倒す（`monthsSinceLeaving > 12` のときのみ期限切れとする、境界値は対象に含める）。
- **専門実践教育訓練給付金は概算計算をしない**: 6か月ごとの分割支給・3段階の差額精算・年間上限・複数年度の合算という複雑さがあるため、受講費用を入力しても金額計算は行わない。率と上限額の提示にとどめ、その理由を明記する。
- **教育訓練支援給付金は在職中は常に対象外**: 専門実践教育訓練の受講要件を満たしていても、失業状態でなければ教育訓練支援給付金は対象にならない。専門実践教育訓練給付金本体（受講費用の補助）とは別判定である旨を明記する。
- **教育訓練支援給付金の暫定措置期限**: `data/seido/kyouiku-kunren-kyufukin.json` の `amendments` から動的に期限（2027-03-31）を読み取り判定する。期限を過ぎた場合、他の要件を満たしていても `notTarget` とし、暫定措置が終了した旨を明記する。
- **教育訓練休暇給付金は要件①の近似判定**: 「休暇開始前2年間に12か月」という期間限定の要件を、本ツールの通算被保険者期間の入力で近似判定しているため、実際の直近2年間の実績と異なる場合がある旨を必ず注記する。
- **教育訓練休暇給付金の給付率・給付日数は未確認**: JSON上 `value: null` のため、金額・日数を一切計算・表示せず、未確認である理由（JSONの `note`）をそのまま提示する。
- **再受給の3年ルール・支給下限4,000円**: 前回受給日・受講開始日などの時系列情報を入力項目に持たないため、これらは全区分共通の一般的な注記として常時表示するにとどめ、個別の判定はしない。

## YMYL配慮事項

- 結果画面には常時、`data/seido/kyouiku-kunren-kyufukin.json` の `disclaimer` フィールド（受講開始日の2週間前までの受給資格確認手続き、暫定措置の期限、支給の保証をするものではない旨など）をそのまま表示する。
- 「支給要件を満たす見込み」という表現を用い、「必ず支給される」「対象確定」という断定は行わない。実際の支給可否は個別の講座指定・手続き期限などの追加要件に依存するため。
- 専門実践教育訓練給付金の概算給付額は複雑さゆえに計算せず、率・上限額の提示にとどめる（過大／過小な見込み額を提示するリスクを避ける）。
- 教育訓練休暇給付金の給付率・給付日数は未確認のため金額計算を一切行わない（不確かな数値を断定的に見せない）。
- 教育訓練支援給付金は暫定措置であり期限があること、専門実践教育訓練給付金本体（恒久制度）とは別判定であることを明確に区別する。
- 準拠年度（2026年度）・出典（ハローワークインターネットサービス・厚生労働省）・最終確認日（2026-07-17）を画面内に表示する。

## テストケース表

| # | insuredYears | isFirstTime | employmentStatus | monthsSinceLeaving | courseType | today | 検証する区分 | 期待されるstatus | 備考 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 3 | false | employed | - | unsure | 既定 | ippan/tokuteiIppan/senmonJissen | target | 通常ケース：全区分の被保険者期間要件を満たす |
| 2 | 0.5 | false | employed | - | unsure | 既定 | 全5区分 | notTarget（anyTarget=false） | 被保険者期間が短く全区分対象外 |
| 3 | 1 | true | employed | - | unsure | 既定 | ippan/tokuteiIppan=target, senmonJissen=notTarget | 境界値 | 初回特例1年は一般・特定一般のみ有効 |
| 4 | 2 | true | employed | - | unsure | 既定 | senmonJissen | target | 専門実践の初回特例は2年 |
| 5 | 2 | false | employed | - | unsure | 既定 | tokuteiIppan | notTarget | 初回でなければ2年では届かない |
| 6 | 3 | false | leftJob | 12 | unsure | 既定 | ippan/tokuteiIppan/senmonJissen | target | 猶予期間ちょうど12か月は対象内 |
| 7 | 3 | false | leftJob | 13 | unsure | 既定 | ippan/tokuteiIppan/senmonJissen | notTarget | 猶予期間超過で対象外 |
| 8 | 3 | false | employed | - | ippan | 既定 | tokuteiIppan/senmonJissen/shienKyufukin | notApplicable | 講座指定時は対象区分外を明示 |
| 9 | 3 | false | leftJob | 3 | senmonJissen | 2026-07-18 | senmonJissen/shienKyufukin | target | 専門実践＋失業状態で支援給付金も対象 |
| 10 | 3 | false | employed | - | senmonJissen | 2026-07-18 | shienKyufukin | notTarget | 在職中は支援給付金は常に対象外 |
| 11 | 3 | false | leftJob | 3 | senmonJissen | 2027-03-31→2027-04-01 | shienKyufukin | target→notTarget | 暫定措置期限の前後で切り替わる |
| 12 | - | - | - | - | - | 2027-03-31/2027-04-01 | isShienKyufukinProvisionalExpired | false/true | 期限判定関数の単体確認 |
| 13 | 10 | false | leftJob | 1 | unsure | 既定 | kyuukaKyufukin | notTarget | 離職者は休暇給付金の対象外 |
| 14 | 5 | false | employed | - | unsure | 既定 | kyuukaKyufukin | target | 要件②（5年）のみ満たす場合も対象 |
| 15 | 0.9 | false | employed | - | unsure | 既定 | kyuukaKyufukin | notTarget | 要件①・②いずれも未達 |
| 16 | 3 | false | employed | - | ippan（費用100万円） | 既定 | ippan | 概算給付額=10万円 | 給付率20%・上限10万円がJSON値と一致 |
| 17 | 3 | false | employed | - | ippan（費用1万円） | 既定 | ippan | 概算給付額=0円 | 下限4,000円以下は不支給 |
| 18 | 3 | false | employed | - | tokuteiIppan（費用50万円） | 既定 | tokuteiIppan | 基本20万円・資格取得後25万円 | 給付率40%/50%・上限20万/25万円がJSON値と一致 |
| 19 | 3 | false | employed | - | senmonJissen（費用100万円） | 既定 | senmonJissen | 概算給付額なし | 複雑な精算方式のため計算しない |
| 20 | 3 | false | employed | 0 | unsure | 既定 | 全5区分 | - | 常に同じ順序・キーで返る |
| 21〜25 | - | - | - | - | - | - | 入力バリデーション | エラー | 被保険者期間・在職離職・経過期間・講座種類・負の値の各未入力/不正値を検証 |
