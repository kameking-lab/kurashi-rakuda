# 介護と仕事の両立制度チェッカー（P2-T38）

## 概要

対象家族との続柄・要介護状態の見込み・雇用形態（勤続年数／週の所定労働日数／有期契約か）・深夜に代わって介護できる同居家族の有無を選ぶと、育児・介護休業法が定める介護関係の両立支援制度6本（①介護休業②介護休暇③所定外労働の制限④時間外労働の制限⑤深夜業の制限⑥所定労働時間の短縮等の措置）について、対象／条件付き対象（要確認）／対象外を一覧でチェックできるツール。あわせて令和7年（2025年）4月の改正で新設された事業主の義務（個別周知・意向確認、40歳等での情報提供、雇用環境整備、テレワーク導入の努力義務）も表示する。

- docs/02_ツール一覧.md **#94**（カテゴリ7: 介護、難易度B）。
- 制度データ: `data/seido/kaigo-shigoto-ryouritsu-seido.json`（e-Gov法令検索「育児休業、介護休業等育児又は家族介護を行う労働者の福祉に関する法律」、`fiscalYear: 2026`, `asOf: 2026-07-17`）を単一の情報源（SSOT）とする。日数・回数・時間・年数などの数値、対象家族の範囲、除外要件のプロース（原文引用）はすべて同JSONを参照し、本ツール・本仕様書に直接ハードコードしない（可読性のため転記している数値は「データ表」節を参照）。
- YMYL区分: **中**（休業・休暇・残業免除等の取得可否に関わる制度判定であり、誤った案内は実害＝休業取得の可否判断ミスにつながるため出典を正確に扱う）。
- 各制度の適用可否の判定は「大まかなチェック」にとどめ、労使協定の有無など本人が把握していない情報が必要な場合は、断定せず「条件付き（要確認）」として人事への確認を促す（複雑な判定ロジックは持たない）。

## 入力仕様

| フィールド名 | 型 | 必須/任意 | バリデーションルール |
|---|---|---|---|
| 対象家族との続柄（relation） | 列挙値 | 必須 | `data.definitions.taishoKazoku.value` の7分類（配偶者・父母・子・配偶者の父母・祖父母・兄弟姉妹・孫）のいずれか、または「上記以外の親族（対象外）」 |
| 要介護状態の見込み（careNeedLikely） | 列挙値（"yes"\|"no"\|"unsure"） | 必須 | `data.definitions.yoKaigoJotai`（負傷・疾病等により2週間以上常時介護を必要とする状態）に該当する見込みかどうか |
| 勤続1年未満か（lessThanOneYear） | 真偽値 | 必須（既定値: false） | 当該事業主に引き続き雇用された期間が1年未満かどうか |
| 週の所定労働日数が2日以下か（twoOrFewerDaysPerWeek） | 真偽値 | 必須（既定値: false） | 週の所定労働日数が2日以下かどうか |
| 有期契約で雇用されているか（fixedTermContract） | 真偽値 | 必須（既定値: false） | 期間を定めて雇用されているかどうか（介護休業のみ追加要件に関係） |
| 深夜に代わって介護できる同居家族がいるか（nightCareSubstitute） | 列挙値（"yes"\|"no"\|"unsure"） | 必須（既定値: "no"） | 深夜（午後10時〜午前5時）に常態として対象家族を介護できる同居の家族がいるか（深夜業の制限のみに影響） |

## ロジック仕様

### 0. 前提（対象家族・要介護状態の判定）

```
relationOk = relation !== "other"
careNeedOk = careNeedLikely !== "no"
baseEligible = relationOk and careNeedOk
```

- `relation === "other"`（対象家族の範囲外。例: おじ・おば、配偶者の祖父母・配偶者の兄弟姉妹）→ 6制度すべて `notTarget`。
- `careNeedLikely === "no"` → 6制度すべて `notTarget`（要介護状態の要件を満たさない）。
- `careNeedLikely === "unsure"` → 判定は続行するが、`data.definitions.yoKaigoJotai.value` を用いた注記（介護保険の要介護認定とは別の基準であること）を全制度に付す。

`baseEligible = false` の場合、以降の制度別ロジックはすべてスキップし `notTarget` を返す。

### 1. 介護休業（kaigoKyugyo）

```
excludable = lessThanOneYear or twoOrFewerDaysPerWeek   # data.kaigoKyugyo.laborAgreementExclusion
status = excludable ? "conditional" : "target"
if fixedTermContract:
    status = "conditional"（既に conditional でも据え置き）
    notes += data.kaigoKyugyo.fixedTermWorker.value（有期契約労働者の追加要件を原文で提示）
if excludable:
    notes += data.kaigoKyugyo.laborAgreementExclusion.value（原文）＋ 労使協定の有無で結果が変わる旨の定型文
```

表示する数値: `maxDays.value`（93日）・`maxCount.value`（3回）。申出期限は `requestMethod.note`（2週間前）を原文で表示。

### 2. 介護休暇（kaigoKyuka）

```
excludable = twoOrFewerDaysPerWeek   # ★2025年4月改正で「継続雇用期間6か月未満」の除外要件は廃止済み。1年未満要件はそもそも存在しない
status = excludable ? "conditional" : "target"
if excludable:
    notes += data.kaigoKyuka.laborAgreementExclusion.value（原文。2025年4月改正後の内容）
```

表示する数値: `daysPerYear.value`（5日）・`daysPerYearMultiple.value`（10日、対象家族2人以上）・`hourlyUnit.value`（時間単位取得可）。事業主は正当な理由なく拒めない旨（`employerCannotRefuse.value`）を常時表示。

### 3. 所定外労働の制限（shoteigaiRodoSeigen）

```
excludable = lessThanOneYear or twoOrFewerDaysPerWeek   # data.shoteigaiRodoSeigen.laborAgreementExclusion
status = excludable ? "conditional" : "target"
```

表示する数値: `periodRange.value`（1か月以上1年以内、回数制限なし）。申出期限は `periodRange.note`（1か月前）を原文で表示。

### 4. 時間外労働の制限（jikangaiRodoSeigen）★法律による直接除外（労使協定不要）★

```
excluded = lessThanOneYear or twoOrFewerDaysPerWeek   # data.jikangaiRodoSeigen.exclusion（法律が直接定める。労使協定の有無を問わない）
status = excluded ? "notTarget" : "target"
```

★実装上の要点★ 所定外労働の制限・介護休業等が「労使協定により除外**できる**」のに対し、時間外労働の制限・深夜業の制限は法律が直接除外者を定めるため、該当すれば労使協定の有無にかかわらず確定的に `notTarget` とする（`conditional` にしない）。

表示する数値: `monthlyLimit.value`（24時間）・`yearlyLimit.value`（150時間）・`periodRange.value`。申出期限は `periodRange.note`（1か月前）を原文で表示。

### 5. 深夜業の制限（shinyaGyoSeigen）★法律による直接除外＋独自の除外要件★

```
if lessThanOneYear:
    status = "notTarget"
elif nightCareSubstitute === "yes":
    status = "notTarget"   # data.shinyaGyoSeigen.exclusion（深夜に代わって介護できる同居家族がいる場合）
elif nightCareSubstitute === "unsure":
    status = "conditional"
else:
    status = "target"
```

★週の所定労働日数2日以下は、`data.shinyaGyoSeigen.exclusion` に明記がないため判定に用いない（介護休業・所定外労働の制限等と条件が異なる点に注意）★。

表示する数値: `periodRange.value`（1か月以上6か月以内。他制度より短い）。申出期限は `periodRange.note`（1か月前）を原文で表示。

### 6. 所定労働時間の短縮等の措置（shoteiRodoJikanTanshuku）

```
excludable = lessThanOneYear or twoOrFewerDaysPerWeek   # data.shoteiRodoJikanTanshuku.laborAgreementExclusion
status = excludable ? "conditional" : "target"
```

表示する数値: `periodYears.value`（3年以上）・`minCount.value`（2回以上。介護費用助成の方法のみ2回以上を要しない旨は `methods` の4番目の記述で原文表示）・`methods.value`（事業主が選べる4つの方法）。常時、「介護休業をしていない方が対象（介護休業中は対象外）」の注記（`employerObligation.value` 由来）を付す。

### 7. 令和7年（2025年）4月改正・事業主の義務（入力に依存しない静的情報）

判定結果とは独立して、以下を常に表示する（`data.kaisei2025` を参照）。

- 個別の周知・意向確認の義務（`kobetsuShuchi.value`）: 介護に直面した旨を伝えると、会社は制度内容・申出先・介護休業給付金に関することを個別に説明し、利用意向を確認する義務がある。
- 40歳等での情報提供の義務（`johoTeikyo40.value`、対象年齢 `johoTeikyoAge.value`=40）。
- 介護離職防止のための雇用環境整備の義務（`koyoKankyoSeibi.value`、4つのいずれか）。
- 介護のためのテレワーク導入（`telework.value`）: ★義務ではなく努力義務★である点を明記する（労働者に請求権はない）。

## データ表・出典

`data/seido/kaigo-shigoto-ryouritsu-seido.json`（e-Gov法令検索「育児休業、介護休業等育児又は家族介護を行う労働者の福祉に関する法律」、`fiscalYear: 2026`, `asOf: 2026-07-17`）より転記。

| 項目 | 値 | JSONパス |
|---|---|---|
| 対象家族の範囲 | 配偶者・父母・子・配偶者の父母・祖父母・兄弟姉妹・孫の7分類 | `data.definitions.taishoKazoku.value` |
| 要介護状態と認められる期間の下限 | 2週間以上 | `data.definitions.yoKaigoPeriodWeeks.value` |
| 介護休業の日数 | 対象家族1人につき通算93日 | `data.kaigoKyugyo.maxDays.value` |
| 介護休業の分割回数 | 3回まで | `data.kaigoKyugyo.maxCount.value` |
| 介護休暇の日数（対象家族1人） | 1年度に5日 | `data.kaigoKyuka.daysPerYear.value` |
| 介護休暇の日数（対象家族2人以上） | 1年度に10日 | `data.kaigoKyuka.daysPerYearMultiple.value` |
| 時間外労働の制限（月） | 24時間 | `data.jikangaiRodoSeigen.monthlyLimit.value` |
| 時間外労働の制限（年） | 150時間 | `data.jikangaiRodoSeigen.yearlyLimit.value` |
| 深夜業の制限の制限期間 | 1か月以上6か月以内 | `data.shinyaGyoSeigen.periodRange.value` |
| 所定労働時間の短縮等の措置の利用期間 | 利用開始日から連続3年以上 | `data.shoteiRodoJikanTanshuku.periodYears.value` |
| 同措置の利用回数 | 2回以上（介護費用助成の方法を除く） | `data.shoteiRodoJikanTanshuku.minCount.value` |
| 40歳等での情報提供の対象年齢 | 40歳 | `data.kaisei2025.johoTeikyoAge.value` |
| 介護休暇の労使協定除外要件（2025年4月改正） | 継続雇用期間6か月未満の除外を廃止、週所定労働日数2日以下のみ除外可 | `data.kaigoKyuka.laborAgreementExclusion` |

出典URL:
- e-Gov法令検索「育児休業、介護休業等育児又は家族介護を行う労働者の福祉に関する法律」https://laws.e-gov.go.jp/law/403AC0000000076 （`checkedAt: 2026-07-17`）
- e-Gov法令検索「同法施行規則」https://laws.e-gov.go.jp/law/403M50002000025 （`checkedAt: 2026-07-17`）
- 厚生労働省・都道府県労働局雇用環境・均等部（室）「育児・介護休業法 改正ポイントのご案内」https://www.mhlw.go.jp/content/11900000/001259367.pdf （`checkedAt: 2026-07-17`）

次回確認: `data/seido/kaigo-shigoto-ryouritsu-seido.json` の `nextCheckDue`（2027-04-01）を基準とする。

## エッジケース

- **対象家族の範囲外（relation="other"）**: 6制度すべて対象外。おじ・おば・配偶者の祖父母・配偶者の兄弟姉妹は対象外である旨を明記する。
- **要介護状態の見込みが「いいえ」**: 6制度すべて対象外。「わからない」の場合は判定を続行しつつ、育児・介護休業法の「要介護状態」は介護保険の要介護認定とは別の基準であることを必ず注記する（`data.definitions.yoKaigoJotai.note` の趣旨）。
- **時間外労働の制限・深夜業の制限は労使協定によらず法律で直接除外**: 介護休業・所定外労働の制限・所定労働時間の短縮等の措置・介護休暇（週2日以下のみ）は「労使協定があれば除外できる」規定のため `conditional`（要確認）とするが、時間外労働の制限・深夜業の制限（勤続1年未満）は労使協定の有無を問わず法律上除外されるため `notTarget`（確定）とする。両者を同じ表示にしない。
- **深夜業の制限の「深夜に代わって介護できる同居家族」**: この要件は深夜業の制限に固有で、他の5制度には存在しない。誤って他制度の判定に流用しない。
- **有期契約労働者の介護休業**: 週2日以下・勤続1年未満に加えて「介護休業開始予定日から起算して93日を経過する日から6か月を経過する日までに労働契約が満了することが明らかでない」という独自の要件があるため、`fixedTermContract=true` の場合は必ずこの原文注記を添える（該当するかどうかは断定しない）。
- **介護休暇の労使協定除外は週2日以下のみ**: 2025年4月の改正で「継続雇用期間6か月未満」の除外要件が廃止されたため、勤続1年未満・6か月未満であることは介護休暇の除外理由にならない。介護休業（1年未満で除外されうる）と混同しない。
- **所定労働時間の短縮等の措置は「介護休業をしていないもの」が対象**: 介護休業を取得中の期間はこの措置の対象にならない旨を常に注記する（入力では判定しない）。
- **令和7年改正の事業主義務は労働者の請求権ではない**: 個別周知・意向確認・40歳等情報提供・雇用環境整備は事業主の義務であり、テレワークは努力義務（請求権なし）。労働者側からの「申請」を促す文言にしない。

## YMYL配慮事項

- 結果画面には常時、`data/seido/kaigo-shigoto-ryouritsu-seido.json` の `disclaimer` フィールド（勤務先の就業規則が法定基準を上回る場合はそちらが適用、労使協定による除外の可能性、有期契約労働者の追加要件、公務員は別制度、介護休業給付金は別判定など）をそのまま表示する。
- 労使協定の有無は本ツールの入力だけでは判定できないため、除外要件に該当しうる場合は断定的に「対象外」とせず「条件付き（要確認）」とし、必ず人事担当への確認を促す文言を添える。
- 時間外労働の制限・深夜業の制限のように法律が直接除外を定める制度と、労使協定があって初めて除外されうる制度を明確に区別し、判定の確度（確定／要確認）を混同しない。
- 準拠年度（2026年度）・出典（e-Gov法令検索）・最終確認日（2026-07-17）を画面内に表示する。

## テストケース表

| # | relation | careNeedLikely | lessThanOneYear | twoOrFewerDaysPerWeek | fixedTermContract | nightCareSubstitute | 検証する制度 | 期待される status | 備考 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | haigusha | yes | false | false | false | no | 全6制度 | target（時間外・深夜は法律除外なしなのでtarget、他は労使協定条件非該当でtarget） | 基本ケース：全制度が対象 |
| 2 | other | yes | false | false | false | no | 全6制度 | notTarget | 対象家族の範囲外 |
| 3 | fubo | no | false | false | false | no | 全6制度 | notTarget | 要介護状態の要件を満たさない |
| 4 | ko | unsure | false | false | false | no | kaigoKyugyo | target（ただし要介護状態の注記あり） | 「わからない」でも判定は続行 |
| 5 | fubo | yes | true | false | false | no | kaigoKyugyo | conditional | 勤続1年未満は労使協定次第 |
| 6 | fubo | yes | true | false | false | no | jikangaiRodoSeigen | notTarget | 勤続1年未満は時間外労働の制限では法律により確定除外 |
| 7 | fubo | yes | true | false | false | no | shinyaGyoSeigen | notTarget | 勤続1年未満は深夜業の制限でも法律により確定除外 |
| 8 | fubo | yes | false | true | false | no | kaigoKyuka | conditional | 週2日以下は介護休暇でも労使協定次第（2025年4月改正後も残る唯一の除外要件） |
| 9 | fubo | yes | false | false | false | no | kaigoKyuka | target | 除外要件に該当しなければ対象 |
| 10 | fubo | yes | false | false | true | no | kaigoKyugyo | conditional | 有期契約は追加要件の注記付きで条件付き対象 |
| 11 | fubo | yes | false | false | false | yes | shinyaGyoSeigen | notTarget | 深夜に代わって介護できる同居家族がいる場合は除外 |
| 12 | fubo | yes | false | false | false | unsure | shinyaGyoSeigen | conditional | 同居家族の有無が不明な場合は要確認 |
| 13 | mago | yes | false | false | false | no | 全6制度 | target系（除外要件非該当） | 孫も対象家族に含まれることの確認 |
| 14 | fubo | yes | false | true | false | no | shinyaGyoSeigen | target | 週2日以下は深夜業の制限の除外要件に含まれない（他制度との違い） |
| 15 | fubo | yes | false | false | false | no | shoteiRodoJikanTanshuku | target（介護休業をしていない方が対象という注記付き） | 常時注記の確認 |
