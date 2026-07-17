# 介護施設タイプ別 費用早見（紹介送客なし）（P2-T39）

簡易仕様書（BACKLOG.md の規約に基づき、数式・境界値・出典のみを記載する）。

- **docs/02**: #95（カテゴリ「介護」）
- **queueId**: P2-T39
- **slug**: `kaigo-shisetsu-hiyou-hayami`
- **category**: `care`
- **難易度**: B（テンプレ量産可能）
- **YMYL区分**: 中（費用目安を正確に扱うが、個別の見積り・入所可否の判定は一切行わない）
- **★紹介送客なし★**: [docs/06_紹介ポリシー.md](../../docs/06_紹介ポリシー.md) の対象。特定の施設・事業者への誘導リンク、比較サイトへの送客は一切行わない。民間施設（有料老人ホーム・サ高住等）の費用は公的な一次情報が存在しないため数値を表示せず、個々の施設の情報を確認できる公的な仕組み（介護サービス情報公表システム）の名称のみをテキストで案内し、クリック可能なリンクや特定事業者名は一切出さない。

## 概要

特別養護老人ホーム（特養）・介護老人保健施設（老健）・介護医療院・特定施設入居者生活介護（有料老人ホーム等）の4つの施設タイプから1つを選ぶと、①施設の法令上の定義・性格 ②（特養のみ）入所要件（原則要介護3以上・特例入所）③食費・居住費の基準費用額と、選んだ部屋タイプ・補足給付の所得段階に応じた負担限度額 ④1か月（30日）あたりの食費・居住費の目安、を表示する早見ツール。有料老人ホーム等（特定施設入居者生活介護）を選んだ場合は、公的な費用相場データが存在しない旨と、施設サービスの位置づけ（補足給付の対象外）を表示する。

**このツールが計算しないもの**: 施設サービス費の自己負担（1〜3割）の金額、高額介護サービス費による払い戻し、日常生活費・各種加算。これらは要介護度・利用単位数・所得区分など追加の入力が必要であり、「介護保険 自己負担シミュレーター」（`kaigo-jikofutan`）で計算できる旨をテキストで案内する（内部の別ツールへの言及であり、送客リンクではない）。

## 入力仕様

| フィールド名 | 型 | 必須/任意 | バリデーションルール |
|---|---|---|---|
| `shisetsuKey`（施設タイプ） | `"tokuyo" \| "roken" \| "iryoin" \| "tokutei-shisetsu"` | 必須（既定値 `"tokuyo"`） | 上記4値以外はエラー |
| `roomType`（部屋タイプ） | 文字列 | 任意（施設タイプに応じた選択肢の先頭を既定値とする） | `tokutei-shisetsu` 選択時は無視（費用データがないため）。他の3施設タイプでは、その施設タイプに存在しない部屋タイプ文字列が来た場合は既定値にフォールバックする（エラーにはしない） |
| `isShortStay`（短期入所） | 真偽値 | 任意（既定 `false`） | 食費の負担限度額のみ、短期入所（ショートステイ）用の額に切り替える。居住費・基準費用額は変わらない |
| `today`（基準日） | 日付（YYYY-MM-DD） | 内部使用のみ | UIは常にクライアント側で取得した「今日」を使う（`todayJst()`）。2026年8月1日以降かどうかで参照する負担限度額表を自動的に切り替える |

出力は「補足給付の所得段階（第1〜第4段階）」ごとの食費・居住費・合計・1か月目安（30日換算）を**すべて**一覧表示する（早見表であり、利用者の所得を聞いて段階を判定する機能は持たない。段階が分からない場合は一覧から自分の段階を選んでもらう設計）。

## ロジック仕様

### 施設タイプ別の説明

`data/seido/kaigo-shisetsu-hiyou-souba.json` の `data.shisetsuTypes.types`（key/label/serviceName/lawRef/definition/character/note）をそのまま表示する。

### 特養の入所要件（`shisetsuKey === "tokuyo"` のときのみ表示）

`data.tokuyoAdmissionRequirement` の `requiredLevel`（原則要介護3・4・5）・`requiredLevelMin`（数値3）・`tokureiNyusho`（要介護1・2の特例入所）をそのまま表示する。他の3施設タイプには入所要件の法令上の定めがないため表示しない。

### 基準日による参照テーブルの切替（2026年8月1日）

```
switchDate = kaigo-shisetsu-hiyou-souba.json の amendments のうち
             sourceId === "mhlw-kaigokensaku" かつ status === "scheduled" かつ
             summary に「食費の基準費用額」を含むものの effectiveFrom
             （データから導出。コードに "2026-08-01" を直書きしない。ただし該当amendmentが
             見つからない場合のみフォールバックとして "2026-08-01" を使う）

period = today >= switchDate ? "fromAug2026" : "beforeAug2026"
```

- `period === "beforeAug2026"`: `kaigo-shisetsu-hiyou-souba.json` の `data.hojokyufu.beforeAug2026`（`shokuhi` / `kyojuhiTokuyo.rooms` / `kyojuhiRoken.rooms`）を参照する。
- `period === "fromAug2026"`: `data/seido/kaigo-hoken.json` の `data.hojokyufu.fromAug2026`（`shokuhi` / `kyojuhi[]`）を参照する（★重複を避けるため2026年8月以降の値は kaigo-hoken.json 側にのみ収録されている★ kaigo-shisetsu-hiyou-souba.json の amendments.impact に明記）。

### 部屋タイプの選択肢と行の対応づけ

特養（`tokuyo`）: `["ユニット型個室", "ユニット型個室的多床室", "従来型個室", "多床室"]`
老健・医療院（`roken` / `iryoin`。★同じ基準費用額表を共有する★ `kyojuhiRoken` 参照）: `["ユニット型個室", "ユニット型個室的多床室", "従来型個室", "多床室（室料を徴収する場合）", "多床室（室料を徴収しない場合）"]`

`period === "beforeAug2026"` は上記の部屋タイプ文字列が `kyojuhiTokuyo.rooms[].type` / `kyojuhiRoken.rooms[].type` とそのまま一致する（`rooms.find(r => r.type === roomType)`）。

`period === "fromAug2026"` は `kaigo-hoken.json` の `kyojuhi[]` が施設種別ごとに `type` 文字列の末尾に注記が付くフラットな1つの配列のため、下記の対応表で変換してから検索する（`ユニット型個室` と `ユニット型個室的多床室` は特養・老健・医療院で共通のため変換不要）。

| 部屋タイプ（共通ラベル） | 施設 | `kyojuhi[].type`（fromAug2026） |
|---|---|---|
| 従来型個室 | tokuyo | 従来型個室（特養等） |
| 従来型個室 | roken/iryoin | 従来型個室（老健・医療院等） |
| 多床室 | tokuyo | 多床室（特養等） |
| 多床室（室料を徴収する場合） | roken/iryoin | 多床室（老健・医療院／室料を徴収する場合） |
| 多床室（室料を徴収しない場合） | roken/iryoin | 多床室（老健・医療院等／室料を徴収しない場合） |

### 段階ごとの金額の算出

食費・居住費のいずれも、行データは `{ kijunHiyou, stage1, stage2, stage3a, stage3b }` の形（基準費用額＋第1〜第3段階②の負担限度額）で、**第4段階の列は存在しない**（第4段階＝補足給付の対象外＝基準費用額を全額負担するため）。

```
stageAmount(row, stageKey) =
  stageKey === "stage4" ? row.kijunHiyou : row[stageKey]
```

食費はさらに `isShortStay` が真のとき、`shokuhi.shortStay`（`stage1〜stage3b` のみ。ショートステイにも第4段階の列はなく同様に `kijunHiyou` を使う）を参照する。居住費（部屋タイプ別の行）にショートステイ専用の列は存在しない（基準費用額表の `kyojuhiTokuyo`/`kyojuhiRoken`/`kyojuhi` はショートステイと入所で共通）。

第1〜第4段階のそれぞれについて、次を計算し一覧に並べる（`stageKey` は `stage1, stage2, stage3a, stage3b, stage4` の固定順）。

```
shokuhiPerDay = stageAmount(shokuhiRow, stageKey)
kyojuhiPerDay = stageAmount(roomRow, stageKey)
totalPerDay = shokuhiPerDay + kyojuhiPerDay
monthlyTotal30Days = totalPerDay * 30
```

### 特定施設入居者生活介護（`tokutei-shisetsu`）を選んだ場合

`data.minkanShisetsu` を参照する。

- `cost.value` は `null`（公的な一次情報が存在しないため）。金額は一切表示せず、`cost.note` の趣旨（事業者ごとに大きく異なり公的な相場がない）をそのまま案内する。
- `hojokyufuNotApplicable.value` は `false`（＝「補足給付を受けられるか」の答えが false）。「居宅サービス扱いのため補足給付（特定入所者介護サービス費）の対象にならない」ことを明示する。
- `publicInfoSource.value`（介護サービス情報公表システム）は**施設名・事業者名を含まないテキストとしてのみ**表示し、クリック可能なリンクにはしない（★紹介送客なしの方針を厳密に守るため★）。

## データ表・出典

一次出典はすべて `data/seido/kaigo-shisetsu-hiyou-souba.json`（e-Gov法令検索・厚生労働省「介護サービス情報公表システム」・社会保障審議会介護保険部会資料）に集約されている。2026年8月1日以降の負担限度額表のみ `data/seido/kaigo-hoken.json`（介護保険最新情報Vol.1481）を参照する（重複回避のため、当該ファイル側の方針に従う）。

| 項目 | 値 | 出典（データノード） |
|---|---|---|
| 施設サービスの定義（3種類） | 介護福祉施設サービス・介護保健施設サービス・介護医療院サービス | `data.shisetsuTypes.shisetsuServiceDefinition`／介護保険法第8条第26項 |
| 特養に入所できる要介護状態区分 | 原則要介護3・4・5 | `data.tokuyoAdmissionRequirement.requiredLevel`／介護保険法施行規則第17条の9 |
| 要介護1・2の特例入所 | やむを得ない事由がある場合に入所可 | `data.tokuyoAdmissionRequirement.tokureiNyusho`／同施行規則第17条の10 |
| 食費・居住費の基準費用額・負担限度額（〜2026年7月31日） | 段階別・部屋タイプ別の全額 | `data.hojokyufu.beforeAug2026` |
| 食費・居住費の基準費用額・負担限度額（2026年8月1日〜） | 段階別・部屋タイプ別の全額 | `data/seido/kaigo-hoken.json` の `data.hojokyufu.fromAug2026` |
| 特養の月額目安2例（多床室／ユニット型個室・第4段階） | 約106,930円／約143,980円（食費・居住費以外の内訳含む） | `data.costComponents.monthlyExampleTokuyo` / `monthlyExampleUnit` |
| 民間施設の費用相場 | 公的な一次情報なし（`null`） | `data.minkanShisetsu.cost` |
| 有料老人ホーム等の補足給付対象可否 | 対象外（`false`） | `data.minkanShisetsu.hojokyufuNotApplicable` |

## エッジケース

- `shisetsuKey` が4値以外: `ok:false` を返す
- `roomType` がその施設タイプに存在しない文字列: 既定の部屋タイプにフォールバックする（エラーにしない）
- `today` が2026年7月31日（境界の前日）: `beforeAug2026` を使う
- `today` が2026年8月1日ちょうど（境界日）: `fromAug2026` を使う
- `isShortStay=true` かつ `stageKey="stage4"`: ショートステイの列を使わず `kijunHiyou`（基準費用額）を使う（第4段階はショートステイでも入所でも同額）
- `tokutei-shisetsu` を選んだときに `roomType` や `isShortStay` を渡しても無視される（費用データが存在しないため）
- 老健とサ高住は施設サービスではない（介護医療院・老健は施設サービス、特定施設入居者生活介護は居宅サービス）ことを明示し、混同を避ける

## YMYL配慮事項

- 表示する金額は法令・告示に基づく「基準費用額」「負担限度額」の目安であり、施設サービス費の自己負担（1〜3割）・日常生活費・各種加算は含まない合計ではないことを常時明示する。
- 補足給付（負担限度額）の適用には市区町村への申請（負担限度額認定）が必要であり、申請しなければ基準費用額の全額を負担することを明示する（`data.hojokyufu.applicationRequired`）。
- 民間施設（有料老人ホーム・サ高住等）の費用は事業者ごとに大きく異なり公的な相場が存在しないため、推測値や「相場」を一切表示しない。
- **★紹介送客なし★** 特定の施設名・事業者名・比較サイトへのリンクは一切表示しない。個々の施設の費用確認手段として「介護サービス情報公表システム」という制度名のみをテキストで案内する（リンクなし・事業者名なし）。
- 免責は `data.disclaimer`（改正時期・申請要件・自己負担割合等が別途かかる旨）をそのまま表示する。

## テストケース表（20件以上、基準日は特記なき限り 2026-07-17 とする）

| # | 入力 | 期待される出力（主な該当項目） |
|---|---|---|
| 1 | `shisetsuKey="tokuyo"`, `roomType="多床室"`, `stage1` の行 | 食費300円/日・居住費0円/日・合計300円/日・月9,000円 |
| 2 | `shisetsuKey="tokuyo"`, `roomType="ユニット型個室"`, `stage4` の行 | 食費1,445円/日・居住費2,066円/日・合計3,511円/日・月105,330円（`monthlyExampleUnit` の食費・居住費部分と一致） |
| 3 | `shisetsuKey="tokuyo"`, `roomType="多床室"`, `stage4` の行 | 食費1,445円/日・居住費915円/日・合計2,360円/日・月70,800円（`monthlyExampleTokuyo` の食費・居住費部分と一致） |
| 4 | `shisetsuKey="roken"`, `roomType="多床室（室料を徴収しない場合）"`, `stage2` の行 | 食費390円/日・居住費430円/日・合計820円/日・月24,600円 |
| 5 | `shisetsuKey="iryoin"`, `roomType="従来型個室"`, `stage1` の行 | 食費300円/日・居住費550円/日・合計850円/日・月25,500円（iryoinは`kyojuhiRoken`を共有） |
| 6 | `shisetsuKey="tokutei-shisetsu"` | `hasCostData=false`。`cost` は表示せず、`hojokyufuNotApplicable=false`（補足給付の対象外）。`admissionRequirement` は `undefined` |
| 7 | `shisetsuKey="tokuyo"` | `admissionRequirement` が定義され、`requiredLevelMin=3` |
| 8 | `shisetsuKey="roken"` / `"iryoin"` / `"tokutei-shisetsu"` | `admissionRequirement` は `undefined`（特養のみの要件） |
| 9 | `shisetsuKey="invalid"` | `ok:false` |
| 10 | `shisetsuKey="tokuyo"`, `roomType="多床室"`, `isShortStay=true` の `stage2` の行 | 食費600円/日（ショートステイ用の`shortStay.stage2`）・居住費430円/日（居住費にショートステイ専用の列はないため通常と同じ`stage2`）・合計1,030円/日・月30,900円 |
| 11 | 上記#10で `stage4` の行 | 食費1,445円/日（ショートステイでも`kijunHiyou`）・居住費915円/日 |
| 12 | `today="2026-08-01"`、`shisetsuKey="tokuyo"`, `roomType="多床室"`, `stage3b` の行 | 食費1,420円/日・居住費530円/日・合計1,950円/日・月58,500円（`kaigo-hoken.json` の `fromAug2026` を参照） |
| 13 | `today="2026-08-01"`、`shisetsuKey="roken"`, `roomType="従来型個室"`, `stage3a` の行 | 食費680円/日・居住費1,370円/日・合計2,050円/日・月61,500円 |
| 14 | `today="2026-07-31"` | `period="beforeAug2026"`（境界の前日） |
| 15 | `today="2026-08-01"` | `period="fromAug2026"`（境界日） |
| 16 | `roomType` に存在しない文字列を渡す（例: `"和室"`） | 既定の部屋タイプにフォールバックし、エラーにならない |
| 17 | `lines` 配列の長さと順序 | 常に5件、`["stage1","stage2","stage3a","stage3b","stage4"]` の順 |
| 18 | 段階のラベル | `stage1〜stage3b`は`data.hojokyufu.userStages.stages`由来の「第◯段階」、`stage4`は「第4段階」 |
| 19 | `shisetsuKey`未指定 | 既定値 `"tokuyo"` として計算される |
| 20 | `roomType`未指定（tokuyo） | 既定の部屋タイプ（`ユニット型個室`）にフォールバックする |
| 21 | 老健とサ高住/有料老人ホームの区別 | `roken`/`iryoin`は`data.shisetsuTypes.types`の`character`に「施設サービス」である旨、`tokutei-shisetsu`は「居宅サービス」である旨がそれぞれ含まれる |
| 22 | `switchDate` の導出 | `kaigo-shisetsu-hiyou-souba.json` の amendments から `"2026-08-01"` が導出されること（ハードコードでないことの回帰テスト） |
