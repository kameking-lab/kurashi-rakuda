# チャイルドシート適合チェック（P3-T01）

## 概要

子どもの年齢から、道路交通法上のチャイルドシート（幼児用補助装置）使用義務の有無を判定し、免除事由（該当する場合）・違反時の制裁・製品の安全基準・全国統計を案内する診断ツール。

- docs/02_ツール一覧.md **#30**（カテゴリ2: 子育て、優先度 低〜中、難易度B、YMYL 中）。BACKLOG.md queueId `P3-T01`。
- 依存データ: `data/seido/child-seat-kitei.json`（道路交通法・道路交通法施行令、警察庁・国土交通省の公表資料。既存・✔）。
- YMYL区分: **中**。法規の解釈（義務・免除・罰則）を扱うため、断定しすぎず、免除該当の最終判断は警察官が行う旨、免除は安全を保証しない旨を明示する。

★本ツールの最重要制約★: 本ツールは**金額計算をしない診断・チェック系ツール**である。数値計算は「年齢と、しきい値（6歳未満）の比較」のみであり、それ以外はすべて `child-seat-kitei.json` の値をそのまま出し分ける。特に、反則金（`data.penalty.fineAmount`）は値が `null` であり、これは「反則金が存在しない」ことを意味する（0円ではない）。**本ツールのどこにも反則金の金額を表示してはならない。**

## 入力仕様

| フィールド名 | 型 | 必須/任意 | バリデーションルール |
|---|---|---|---|
| 年齢（ageYears） | 整数（歳） | 必須 | 0〜20の範囲の整数であること。範囲外・非整数は入力エラー |
| 免除事由チェックリスト（selectedExemptions） | 施行令が定める全8号からの複数選択 | 任意 | 年齢が6歳未満（使用義務がある）の場合のみ表示・意味を持つ。6歳以上の場合は表示するが判定には使わない |

身長・体重は入力させない。道路交通法上の使用義務のしきい値は「年齢（6歳未満）」のみであり、身長・体重を基準にした法的な境界は存在しないため（★データの限界★参照）。

## ロジック仕様

### 1. 使用義務の判定

```
classifyObligation(ageYears) =
  ageYears < AGE_THRESHOLD(=6) ? "obligated"（使用義務あり） : "notObligated"（法的義務なし）
```

`AGE_THRESHOLD` は `data.obligation.ageThreshold.value`（6）から取得し、ハードコードしない。6歳ちょうどは「6歳未満」に含まれないため `notObligated`。

### 2. 免除事由の提示

使用義務がある場合（`obligated`）のみ、施行令第26条の3の2第3項が定める全8号のチェックリストを表示する。ユーザーが選択した号を `matchedExemptions` として返し、以下を必ず併記する。

- 該当する号の条文要旨（`data.exemptions.*.value`）
- `data.exemptions.description` に含まれる「免除は安全を保証しない」という趣旨
- 実際の該当可否の最終判断は警察官が行う旨

義務がそもそもない場合（`notObligated`）は、免除事由を判定する前提がないため `matchedExemptions` は常に空配列とし、免除チェックリストの選択自体を判定に使わない（`exemptionRelevant = false`）。

### 3. 罰則の提示

`data.penalty` の値をそのまま表示する。

- 違反の名称（`violationName`）: 「幼児用補助装置使用義務違反」
- 違反点数（`points`）: 1点
- 反則金の有無（`hasFine`）: false → 「反則金は定められていません」と案内し、**金額は一切書かない**（`fineAmount` は null）
- 刑事罰の有無（`hasCriminalPenalty`）: false → 懲役・罰金の規定がない旨
- 責任を負う者（`liablePerson`）: 運転者（保護者ではない）

### 4. 安全基準・使い方の注意（参考情報）

`data.safetyStandard` と `data.usage` から、Eマーク・型式指定マーク・未認証チャイルドシートへの注意・後付けISOFIX取付金具への注意・助手席使用の危険性・価格と安全性は無関係である旨を、判定結果とは独立した参考情報として表示する。

### 5. 統計（参考情報）

`data.statistics` から、使用率（全体82.4%・1歳未満93.2%・1〜4歳84.8%・5歳66.7%）、致死率（不使用者は適正使用者の5.3倍）、適切な取付率（74.8%）、適切な着座率（55.6%）、死傷者に占める使用者率（83.5%）を、判定結果とは独立した参考情報として表示する。

## データ表・出典

`data/seido/child-seat-kitei.json`（`fiscalYear: 2026`、`asOf: 2026-07-17`）より転記。

| 項目 | 値 | JSONパス |
|---|---|---|
| 使用義務の年齢しきい値 | 6歳未満 | `data.obligation.ageThreshold.value` |
| 対象となる車両 | 自動車（大型・普通自動二輪車を除く） | `data.obligation.targetVehicle.value` |
| 免除事由（全8号） | 座席構造上不可／座席数超過／負傷・障害／著しい肥満等／世話中／旅客運送／自家用有償旅客運送／緊急搬送 | `data.exemptions.structurallyImpossible`〜`.emergency` |
| 違反の名称 | 幼児用補助装置使用義務違反 | `data.penalty.violationName.value` |
| 違反点数 | 1点 | `data.penalty.points.value` |
| 反則金 | なし（`null`。反則行為に該当しないため） | `data.penalty.fineAmount.value` / `data.penalty.hasFine.value` |
| 刑事罰 | なし | `data.penalty.hasCriminalPenalty.value` |
| 責任を負う者 | 運転者 | `data.penalty.liablePerson.value` |
| 安全基準適合マーク | Eマーク | `data.safetyStandard.eMark.value` |
| 使用率（6歳未満全体） | 82.4% | `data.statistics.usageRate.value` |
| 使用率（5歳） | 66.7%（他年齢層より低い） | `data.statistics.usageRate5.value` |
| 不使用者致死率 | 適正使用者の約5.3倍 | `data.statistics.fatalityRatio.value` |
| 適切な着座率 | 55.6% | `data.statistics.properSeatingRate.value` |

出典URL:
- e-Gov法令検索「道路交通法」https://laws.e-gov.go.jp/law/335AC0000000105 （`checkedAt: 2026-07-17`）
- e-Gov法令検索「道路交通法施行令」https://laws.e-gov.go.jp/law/335CO0000000270 （`checkedAt: 2026-07-17`）
- 警察庁交通局「子供を守るチャイルドシート」https://www.npa.go.jp/bureau/traffic/anzen/childseat.html （`checkedAt: 2026-07-17`）
- 国土交通省物流・自動車局審査・リコール課「チャイルドシートコーナー」https://www.mlit.go.jp/jidosha/child/ （`checkedAt: 2026-07-17`）
- 国土交通省物流・自動車局審査・リコール課「チャイルドシートに関するよくあるご質問」https://renrakuda.mlit.go.jp/renrakuda/childfaq.html （`checkedAt: 2026-07-17`）

次回確認: `data/seido/child-seat-kitei.json` の `nextCheckDue`（2027-04-01）を参照。統計値は令和8年調査（例年秋公表）で更新される。

## エッジケース・注意事項

- **年齢境界値（5歳・6歳）**: 5歳は `obligated`、6歳は `notObligated`。「6歳未満」の文字は道路交通法第71条の3自体にはなく、第14条第3項の定義から導かれる点に注意（データの `note` を参照）。
- **6歳以上での免除チェックリスト選択**: 表示はするが、義務そのものがないため `matchedExemptions` は常に空配列にする（免除を論じる前提がないため）。
- **不正な年齢（負数・21歳以上・非整数）**: 入力エラーとして結果を表示しない。
- **免除事由に複数該当**: 複数選択を許可し、該当した号をすべて列挙する。
- **反則金の表示**: `fineAmount` が `null` であることを「金額情報なし」ではなく「反則金という概念が存在しない」として扱い、UI上のどこにも金額（円）を表示しない。
- **身長・体重の入力を求めない**: ツールの通称（ドキュメント上の「身長体重×法規」）にかかわらず、法規上の基準は年齢のみであるため、身長・体重の数値入力・数値判定はしない。

## ★データの限界★

1. **反則金（`penalty.fineAmount`）は `null`**: 道路交通法第71条の3には罰則（懲役・罰金）の規定が置かれていないため、交通反則通告制度上の「反則行為」に該当せず、反則金という概念自体が存在しない。他の交通違反（速度超過等）と同じ「青切符・反則金」の枠組みで説明すると誤りになるため、本ツールは反則金の金額を一切生成・表示しない。
2. **身長・体重による法的な境界は存在しない**: 道路交通法上の使用義務のしきい値は「年齢（6歳未満）」のみである。製品の分類（i-Size等）は身長を基準にした区分を用いるが、これは製品規格上の区分であって、道路交通法が定める着脱義務の法的境界ではない。そのため本ツールは身長・体重の具体的な数値入力・数値判定を行わない。
3. **`safetyStandard.regulation129Detail` は未確認（`null`）**: 国連協定規則第129号（R129）・旧基準（R44）の適用開始日や身長区分の具体的な数値は、国土交通省のチャイルドシートコーナー・FAQのいずれにも記載がなく、一次情報で確認できなかった。本ツールはEマーク・i-Size等の表示区分・未認証品への注意喚起という確認できた事実のみを案内し、R129/R44の適用時期や身長区分の数値を推定で表示しない。
4. **免除事由は法的な扱いを示すのみで安全を保証しない**: 免除に該当しても、それは「使用義務が免除される」という法的な扱いを示すのみであり、実際の事故時の被害を防ぐものではない。該当する免除事由を表示する箇所には、必ずこの旨を併記する。
5. **統計値は令和7年調査時点**: 使用率・致死率等の統計は令和7年5月10日〜6月14日の全国調査等に基づく値であり、次回調査（例年秋公表）で更新される。

## YMYL配慮事項

- 「6歳未満」という義務のしきい値と、免除事由・罰則・安全基準を分けて明確に提示し、断定的な法的助言（「あなたは違反です」等）は避け、「該当する可能性があります」「最終的な判断は警察官が行います」という表現にとどめる。
- 反則金の金額を一切表示しない（存在しないため）。
- 免除に該当する場合でも「安全を保証しない」旨を必ず併記し、煽り文言（「絶対に」「必ず事故になる」等）は使わない。
- 統計（5歳の使用率の低さ・不使用時の致死率・適切な着座率の低さ）は事実として提示しつつ、不安を煽るのではなく、正しい使い方の確認を促す文脈で提示する。
- 準拠年度（2026年度）・出典（e-Gov法令検索・警察庁・国土交通省）・最終確認日（2026-07-17）を画面内に表示する。

## テストケース表

| # | 入力 | 期待される結果 | 備考 |
|---|---|---|---|
| 1 | ageYears=5 | obligated | 境界値: 6歳未満の上限 |
| 2 | ageYears=6 | notObligated | 境界値: 6歳ちょうど（義務なし） |
| 3 | ageYears=0 | obligated | 下限 |
| 4 | ageYears=7 | notObligated | 通常ケース |
| 5 | ageYears=5.5 | validateAge: ok=false | 非整数 |
| 6 | ageYears=-1 | validateAge: ok=false | 範囲外（下限未満） |
| 7 | ageYears=21 | validateAge: ok=false | 範囲外（上限超） |
| 8 | ageYears=5, selectedExemptions=[] | matchedExemptions=[] | 免除選択なし |
| 9 | ageYears=5, selectedExemptions=["emergency"] | matchedExemptions=[emergency(第8号)] | 単一選択 |
| 10 | ageYears=5, selectedExemptions=["medical","commercialPassenger"] | matchedExemptionsに両方含む | 複数選択 |
| 11 | ageYears=6, selectedExemptions=["emergency"] | matchedExemptions=[]・exemptionRelevant=false | 義務がないため免除は無意味 |
| 12 | EXEMPTION_KEYS | 8件 | 全8号が定義されていること |
| 13 | PENALTY.fineAmount | null | 反則金が存在しないことの確認 |
| 14 | PENALTY.hasFine | false | 同上 |
| 15 | PENALTY.points | 1 | 違反点数 |
| 16 | STATISTICS.usageRate | 82.4 | データソースと一致 |
| 17 | STATISTICS.usageRate5 | 66.7 | データソースと一致 |
| 18 | isDataExpired(childSeatDataset, "2026-07-18") | false | データ鮮度 |

全28件を `tests/child-seat-kitei.test.ts` に実装済み。
