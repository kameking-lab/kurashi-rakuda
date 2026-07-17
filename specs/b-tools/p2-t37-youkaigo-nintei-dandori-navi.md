# 要介護認定 申請段取りナビ（P2-T37）

## 概要

要介護認定の「申請 → 認定調査 → 主治医意見書 → 一次判定 → 介護認定審査会（二次判定）→ 認定結果の通知 →（必要ならケアプラン作成）→ サービス利用開始」という一連の流れを、申請日（または申請予定日）から、今どの段階にいるか・次に何をすべきかの目安として提示するチェックリスト／タイムラインツール。

- docs/02 **#92**（カテゴリ7: 介護、優先度 B、難易度 B）。BACKLOG.md queueId `P2-T37`。
- 依存データ: `data/seido/kaigo-hoken.json`（既存）＋ `data/seido/kaigo-nintei-shori-kikan.json`（**本タスクで新規追加**。BACKLOG.md P2-D05「要介護認定の標準処理期間の data/seido 追加」を解消）。
- YMYL区分: **中**。処理期間は法律上の「原則」であり実際の期日を保証しない。断定的な期日表示を避け、原則と実態（全国平均は原則の30日を超える）の両方を必ず示す。

## 入力仕様

| フィールド名 | 型 | 必須/任意 | バリデーションルール |
|---|---|---|---|
| 申請日／申請予定日（applicationDate） | 日付（YYYY-MM-DD） | 必須 | 実在する日付であること。未入力時は結果を表示しない。今日より1年以上先はソフト警告（`isApplicationFarInFuture`）。今日より2年以上前はソフト警告（`isApplicationVeryOld`） |
| 基準日（today） | 日付（YYYY-MM-DD） | クライアント側で自動取得 | 端末の今日の日付。SSR/SSGのキャッシュとずれないよう、マウント後にクライアント側で取得する（Getsurei.tsx と同じパターン） |

## ロジック仕様

### 1. 原則の処理期間（法定・確定値）

介護保険法第27条第11項（`data/seido/kaigo-nintei-shori-kikan.json` の `legalPeriod.principle`）より、申請のあった日から**30日以内**に処分（認定または非該当の通知）をするのが原則。

```
legalDeadlineDate = addDays(applicationDate, 30)
isPastLegalDeadline = daysElapsedSinceApplication > 30
```

同項ただし書（`legalPeriod.extension`）により、認定調査等に時間を要する等の特別な理由があるときは、市区町村が「処理見込期間」と理由を書面で通知したうえで延期できる。この延期は制度上想定された正規の手続であり、断定的に「異常事態」と表示しない。

同第12項（`legalPeriod.deemedRejection`）は、30日を超えても処分・延期通知がない場合等に、被保険者側が「市区町村が却下したものとみなす」ことができる旨を定める。本ツールはこの権利の行使を助言せず、条文の紹介にとどめる。

### 2. 手続の流れ（法定の順序）

`data/seido/kaigo-nintei-shori-kikan.json` の `processSteps.steps`（介護保険法第27条第1項〜第9項に基づく6ステップ）をそのまま順に表示する。数値のハードコードをしない（`levels[]`/`brackets[]` と同じく配列からループ生成する）。

1. 申請（第27条第1項）
2. 認定調査（第27条第2項）
3. 主治医意見書（第27条第3項）
4. 一次判定（第27条第4項）
5. 介護認定審査会による審査判定＝二次判定（第27条第4項・第5項）
6. 認定結果の通知（第27条第7項・第8項・第9項）

認定後の手続（ケアプラン作成・サービス利用開始）は、処理期間の一次データを持たないため、`YoukaigoNinteiDandoriNavi.calc.ts` 内に日数を伴わない静的な2ステップ（`POST_DECISION_STEPS`）として順序のみを示す。断定的な日数を出さない。

### 3. 目安のタイムライン（参考値・非確定）

`actualProcessingTime.suggestedTargets`（厚生労働省が令和7年2月20日時点で示した「対応（案）」）に基づき、認定調査・主治医意見書は**並行して依頼される**という実務上の前提（社保審・介護保険部会第117回資料2 p.7の業務フロー図）で、以下のとおり合成する。

```
ninteiChosaByDay   = round(suggestedTargets.ninteiChosa.value)     # 7
shujiiIkenshoByDay = round(suggestedTargets.shujiiIkensho.value)   # 13
bothReadyByDay      = max(ninteiChosaByDay, shujiiIkenshoByDay)     # 13（★7+13=20の直列にしない★）
shinsakaiByDay       = bothReadyByDay + round(suggestedTargets.shinsakaiJimu.value)  # 25
```

★この目安は「30日以内を達成できている一部（全体の約4.2%）の保険者の実績値を踏まえた案」であり、全国一律の確定基準ではない。★ 画面には必ずこの限定を明記する。

### 4. 現在地の推定（申請済みの場合のみ）

```
daysElapsedSinceApplication = diffDays(applicationDate, today)   # today >= applicationDate の場合のみ

estimateStage(daysElapsed, timeline):
    if daysElapsed is null:                         → before_application（未申請）
    elif daysElapsed <= 0:                           → shinsei（申請当日）
    elif daysElapsed < ninteiChosaByDay:              → chosa_and_ikensho（認定調査・意見書とも準備中の目安）
    elif daysElapsed < bothReadyByDay:                → ikensho_machi（認定調査は目安上完了、意見書入手待ちの目安）
    elif daysElapsed < shinsakaiByDay:                → shinsakai（審査判定中の目安）
    elif daysElapsed <= 30:                           → kekka_machi（結果通知待ち。原則の期限内）
    else:                                              → over_deadline（原則の期限超過）
```

現在地の推定は「経過日数からの概算」であり、実際の進捗（自治体からの連絡・書類）と異なる場合がある旨を必ず併記する。

### 5. 実態の開示（YMYL上の必須表示）

`actualProcessingTime.nationalAverage`（全保険者平均の認定審査期間＝39.8日）と `within30DaysShare`（申請から30日以内に認定された割合＝平均25.1%）を、原則の30日と並べて必ず表示する。「30日以内」はあくまで法律上の原則であり、実際には過半数の申請で30日を超えていることを利用者に隠さない。

## データ表・出典

### 新規追加データ（P2-D05 解消）: `data/seido/kaigo-nintei-shori-kikan.json`

| 項目 | 値 | 出典 |
|---|---|---|
| 原則の処理期間 | 申請のあった日から**30日以内** | 介護保険法（平成九年法律第百二十三号）**第27条第11項**本文。e-Gov法令検索 <https://laws.e-gov.go.jp/law/409AC0000000123>（法令API `?response_format=xml` で条文全文を取得し照合済み） |
| 延期の手続 | 特別な理由があるときは、30日以内に処理見込期間と理由を書面で通知して延期できる | 同法第27条第11項ただし書 |
| みなし却下 | 30日以内に処分・延期通知がない等の場合、被保険者は却下とみなすことができる | 同法第27条第12項 |
| 手続の各段階 | 申請（第1項）／認定調査（第2項）／主治医意見（第3項）／認定審査会への審査判定依頼（第4項）／審査・判定（第5項）／結果通知（第7項・第9項）／遡及効（第8項） | 同法第27条第1〜9項 |
| 全国平均の認定審査期間 | 39.8日（令和5年度4月〜令和6年3月申請分、n=1,559） | 厚生労働省老健局「要介護認定の認定審査期間について」社会保障審議会介護保険部会（第117回）資料2（令和7年2月20日）<https://www.mhlw.go.jp/content/12300000/001415212.pdf>（landingUrl: <https://www.mhlw.go.jp/stf/newpage_50085.html>） |
| 申請から30日以内に認定された割合 | 平均25.1% | 同上 |
| 30日以内を達成した保険者（66保険者）の各段階平均 | 認定調査6.6日／主治医意見書12.7日／審査会等事務処理12.3日（審査期間そのものは27.7日） | 同上 |
| 保険者に示された目安（案） | 認定調査「依頼から7日以内」／主治医意見書「依頼から13日以内」／審査会「調査票・意見書が揃ってから12日以内」 | 同上（令和6年6月21日閣議決定の規制改革実施計画に基づく「対応（案）」。確定基準ではない） |

★重要な訂正記録★: BACKLOG.md起票時点では根拠条文を「介護保険法施行規則」と推測していたが、施行規則（411M50000100036）を条文全文検索した結果、「処理見込期間」「延期」を含む条項は存在せず、30日ルールは**介護保険法本体（第27条）**にのみ規定されていることを確認した（`data/seido/kaigo-nintei-shori-kikan.json` の `sources[0].note` に記録）。

### 既存データ（SSOTとして再利用）: `data/seido/kaigo-hoken.json`

- `data.yokaigoNintei.process`：一次判定・二次判定の仕組み（本ツールの手続フローと重複させず、認定後の要介護度説明のCalloutでのみ参照）
- `data.yokaigoNintei.noStateDefinition`：要介護度の「状態像」は法令上定義されていない旨。認定後のCalloutで再利用し、状態像の説明を新規に書かない鉄則を維持する。

## エッジケース・注意事項

- **未入力**: 申請日／申請予定日が未入力の場合は結果を表示しない（プレースホルダのみ）。
- **申請予定日が未来**: `applicationDate > today` の場合は「申請前」として、申請予定日までの残り日数と、申請した場合の原則の期限日を示す。現在地の推定（`estimateStage`）は行わない。
- **申請日＝今日**: 経過0日として `shinsei` 段階を返す。
- **境界値（30日ちょうど）**: `daysElapsed === 30` は `kekka_machi`（超過ではない）。`daysElapsed === 31` から `over_deadline`。
- **極端な未来日／過去日**: 1年以上先の申請予定日、2年以上前の申請日はソフト警告（入力ミスの可能性を示唆するのみで、計算は継続する）。
- **うるう年をまたぐ30日後の計算**: `addDays`（`lib/tools/seido.ts`）のUTC日付演算に委譲し、独自のうるう年判定コードを書かない。
- **制度データの期限切れ**: `isDataExpired` が真を返す場合（両データセットいずれか）は結果を表示せず、更新中である旨を表示する。
- **認定後の手続**: ケアプラン作成・サービス利用開始は一次データに日数の定めがないため、日数を伴わない順序リストとしてのみ表示し、断定的な期間を書かない。
- **具体的な自治体窓口・個別の遅延理由には踏み込まない**: 「原則の目安」であることを常に明示し、正確な見込みは市区町村窓口に確認するよう案内する。

## YMYL配慮事項

- 「30日以内」を保証と誤読されないよう、原則である旨と、延期の正規手続（処理見込期間の書面通知）が存在する旨を必ず併記する。
- 全国平均の認定審査期間（39.8日）と30日以内達成率（25.1%）を必ず表示し、「原則どおりに終わるとは限らない」という実態を隠さない。
- 目安のタイムライン（7日／13日／12日）は「30日以内を達成できている一部の保険者の実績を踏まえた案」であり、全国一律の確定基準でない旨を明記する。
- 要介護度の「状態像」（法令・告示に根拠がない）を一切説明しない（`kaigo-hoken.json` の `noStateDefinition` の鉄則を継承）。
- 最終更新日／出典（介護保険法第27条・厚生労働省資料）を画面下部の出典表示に含める。

## テストケース（27件実装、代表例を抜粋）

| # | 入力 | 期待される出力 |
|---|---|---|
| 1 | applicationDate=2026-07-17, today=2026-07-17 | 経過0日・段階=shinsei |
| 2 | applicationDate=2026-08-01, today=2026-07-17 | 申請前・残り15日・段階=before_application |
| 3 | applicationDate=2026-07-01, today=2026-07-04（経過3日） | 段階=chosa_and_ikensho |
| 4 | applicationDate=2026-07-01, today=2026-07-08（経過7日） | 段階=ikensho_machi |
| 5 | applicationDate=2026-07-01, today=2026-07-14（経過13日） | 段階=shinsakai |
| 6 | applicationDate=2026-07-01, today=2026-07-26（経過25日） | 段階=kekka_machi |
| 7 | applicationDate=2026-06-17, today=2026-07-17（経過30日） | isPastLegalDeadline=false・段階=kekka_machi |
| 8 | applicationDate=2026-06-16, today=2026-07-17（経過31日） | isPastLegalDeadline=true・段階=over_deadline |
| 9 | applicationDate=2026-07-01 | legalDeadlineDate=2026-07-31（addDaysで30日後） |
| 10 | applicationDate=2028-01-15, today=2028-01-15 | legalDeadlineDate=2028-02-14（うるう年をまたぐ） |
| 11 | applicationDate="2026-02-30"（実在しない日付） | validateDate.ok=false |
| 12 | applicationDate="2026/07/17"（形式不正） | validateDate.ok=false |
| 13 | 目安のタイムライン（2026-07-01起点） | ninteiChosaByDay=7・shujiiIkenshoByDay=13・bothReadyByDay=13（max）・shinsakaiByDay=25（13+12） |
| 14 | isApplicationFarInFuture(2027-08-01, 2026-07-17) | true（1年以上先） |
| 15 | isApplicationVeryOld(2024-01-01, 2026-07-17) | true（2年以上前） |

全27件は `tests/youkaigo-nintei-dandori-navi.test.ts` に実装済み。
