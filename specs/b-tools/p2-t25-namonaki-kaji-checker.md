# 名もなき家事 分担チェッカー（P2-T25）

## 概要

「名もなき家事」（ゴミの分別ルール把握、日用品の在庫管理、子どもの体調管理連絡など、名前のついていない細かい家事・育児・介護のタスク）を自前のチェックリスト（4カテゴリ・30項目）として提示し、各項目について「自分がやっている」「パートナーがやっている」「ふたりでやっている」「やっていない・対象外」のいずれかをその場で選ぶと、分担の内訳をその場で集計して可視化する診断型チェッカー。

- docs/02 **#46**（カテゴリ「家事・料理」、難易度B）。BACKLOG.md queueId: `P2-T25`。
- 依存データ: なし（自前リスト）。項目リスト自体は制度データ・自治体データに依存しない、サイト独自の一覧。
- 送信・保存は一切行わない。入力（チェック状態）はReactのコンポーネント状態のみで保持し、ページを離れる・再読み込みすると消える（localStorage等の永続化は行わない）。
- 参考情報として、総務省統計局「令和3年社会生活基本調査」等に基づく家事関連時間の男女差（`data/tables/kaji-jikan-toukei-danjyosa.json`）を、本ツールの診断結果とは明確に区別した「参考情報」として併記する。出典ドメイン`stat.go.jp`は`factory/config/source-allowlist.json`に既に許可済み（2026-07-17時点で追加済みであることを確認済み。P2-T28食費の目安計算で同ドメインの出典を使用しゲート通過実績あり）。
- YMYL区分: 低。ただし「相手を責める」トーンにならないよう配慮が必要な領域（家庭内の家事分担）のため、docs/09_マスコット.md の口調（煽らない・断定しない・「ぼく」口調・感嘆符は1文に1個まで）を厳守する。

## 入力仕様（項目リストの設計・チェック方式）

### 項目リスト

4カテゴリ・合計30項目の固定リスト（`CHORE_ITEMS`、`components/tools/impl/NamonakiKajiChecker.calc.ts` に定義）。

| カテゴリキー | カテゴリ名 | 項目数 |
|---|---|---|
| `kaji` | 家事全般 | 12 |
| `kosodate` | 子育て | 8 |
| `kaigo` | 介護 | 5 |
| `sonota` | その他 | 5 |

各項目は `{ id, category, label }` の構造を持つ。`id` はカテゴリ内で連番（例: `kaji-01`）。項目文言は「名もなき家事」の典型例（在庫管理・スケジュール調整・連絡窓口など、成果物としては見えにくい調整・管理系のタスク）を自前で作成したもので、特定の制度・統計の出典を持たない（自前リストのため、項目文言自体の出典は表示しない）。

### チェック方式

各項目について、次の4択から1つを選ぶ（未選択も許容する。未選択のまま結果を見ることができる）。

| 値 | 表示ラベル | 意味 |
|---|---|---|
| `self` | 自分がやっている | 主にユーザー自身が担っている |
| `partner` | パートナーがやっている | 主にパートナーが担っている |
| `both` | ふたりでやっている | どちらかに偏らず分担している、または一緒に行っている |
| `none` | やっていない・対象外 | 誰もやっていない、またはこの項目自体が世帯に当てはまらない（例: ペットがいない世帯の「ペットの世話」相当項目） |

未選択（4択のどれも選んでいない）の項目は「未回答」として扱う。未回答は上記4値のいずれにも属さない、独立した第5の状態である（内部的には `undefined`）。全項目が未選択のままでも結果表示は可能（すべて0件として集計される）。

### 入力の永続化

行わない。送信ボタン・保存ボタンは設けない。すべての集計はチェック状態が変わるたびにその場（クライアント内）で再計算する。

## ロジック仕様（集計方法）

集計は純関数 `calcChoreSummary(statuses, items = CHORE_ITEMS)` で行う（`statuses` は `itemId → ステータス` のレコード。未回答の項目はキーを持たないか値が `undefined`）。

### 1. 基本カウント

項目リストを1件ずつ走査し、次を集計する。

- `totalItems`: 項目リストの総数（既定では30）
- `answeredItems`: 4択のいずれかが選ばれている項目数
- `unansweredItems`: `totalItems - answeredItems`
- `counts`: `{ self, partner, both, none }` の4つのバケツごとの件数（未回答はどのバケツにも加算しない）

### 2. 割合（percentages）

`percentages` は **回答済み件数（answeredItems）を分母** にした割合（%、小数点以下四捨五入）である。全体件数（totalItems）を分母にしないのは、未回答が多い状態で全体分母にすると「まだ答えていないだけ」なのに割合が低く出てしまい、誤解を招くため。

```
if answeredItems == 0:
    percentages = { self: 0, partner: 0, both: 0, none: 0 }
else:
    percentages[status] = round(counts[status] / answeredItems * 100)  # status ごと
```

四捨五入により、4つの割合の合計が100%からずれる場合がある（例: 33/33/34ではなく33/33/33=99になるケース）。これは表示上の丸め誤差として許容し、補正は行わない（各バケツの割合はそれぞれ独立に丸めた値をそのまま表示する）。

### 3. 自分とパートナーの比率（selfPartnerBalance）

「ふたり」「やっていない・対象外」「未回答」を除いた、`self` と `partner` の相対比率を別途計算する。これは「偏りの可視化」のメイン表示に使う。

```
selfPlusPartner = counts.self + counts.partner
if selfPlusPartner == 0:
    selfPartnerBalance = null   # 比較できるデータがない
else:
    selfShare = round(counts.self / selfPlusPartner * 100)
    partnerShare = 100 - selfShare   # 合計が必ず100になるよう補数で算出（丸め誤差の吸収）
    selfPartnerBalance = { selfShare, partnerShare }
```

`partnerShare` を独立に丸めず `100 - selfShare` で算出するのは、円グラフ・横棒グラフ等の表示で合計が100%を超えたり下回ったりする表示崩れを避けるため。

### 4. カテゴリ別集計（byCategory）

4カテゴリそれぞれについて、`totalItems`・`answeredItems`・`counts` を同じロジックで集計し、配列で返す（`CHORE_CATEGORY_ORDER` の順）。該当項目が0件のカテゴリ（カスタム項目リストを渡した場合など）は配列に含めない。

## エッジケース

- **0件の回答（初期表示）**: `statuses` が空オブジェクト。`answeredItems=0`、`percentages` はすべて0、`selfPartnerBalance` は `null`。エラーにはせず、「まだ回答がありません」という趣旨の表示にとどめる。
- **全項目が同じ選択（例: 全項目「自分」）**: 該当バケツが `totalItems` 件、他バケツは0件。`selfPartnerBalance` は `{ selfShare: 100, partnerShare: 0 }`（全項目「パートナー」なら逆）。
- **全項目が「ふたり」または「やっていない・対象外」**: `counts.self` と `counts.partner` がともに0のため `selfPartnerBalance` は `null`（自分とパートナーを比較する材料がないことを明示し、0%/0%のような誤解を招く数字は出さない）。
- **未回答が混在するケース**: 一部の項目だけ回答し、残りは未回答のまま結果を見る。`percentages` は回答済み件数のみを分母にするため、未回答分によって割合が薄まらない。
- **空の項目リスト（`items: []`）を渡した場合**（テスト用途）: `totalItems=0`、`answeredItems=0`、`unansweredItems=0`、`percentages` はすべて0、`selfPartnerBalance` は `null`、`byCategory` は空配列。0除算エラーを起こさない。
- **`statuses` に項目リストへ存在しない `id` のキーが含まれる場合**: 無視する（項目リストの走査ベースで集計するため、余分なキーはカウントに影響しない）。

## YMYL配慮事項

- 「診断」という言葉が持つ断定的な響きを避け、画面には常時「これは診断ではなく、気づきのきっかけ」という趣旨のCalloutを表示する。
- 結果の数字がどちらかに偏っていても、「パートナーが分担していない」「不公平だ」といった断定・非難のニュアンスの文言は一切使わない。docs/09_マスコット.md の口調（「〜だよ」「〜かも」、感嘆符は1文に1個まで、急かさない）を厳守する。
- 「自分」「パートナー」という主観的な自己申告であり、実際の負荷・時間・難易度を測るものではないことを明示する（同じ1項目でも所要時間・頻度は家庭ごとに大きく異なる）。
- 参考情報として掲載する総務省統計局の統計（社会全体の男女差データ）は、本ツールの診断結果（個々の家庭のチェック結果）とは完全に独立した「公的統計の紹介」であることを明記し、あたかも「この統計と比べてあなたの家庭は◯◯だ」という個別評価であるかのような表現をしない。
- 送信・保存を行わないことを画面上に明示し、途中でやめても記録が残らないことを伝える（安心して離脱できるようにするための配慮）。

## テストケース表

対象: `calcChoreSummary`（`components/tools/impl/NamonakiKajiChecker.calc.ts`）。

| # | 入力（statuses概要） | 期待される主な結果 | 備考 |
|---|---|---|---|
| 1 | 空オブジェクト（回答なし） | `answeredItems=0`、`percentages`全て0、`selfPartnerBalance=null` | 初期表示 |
| 2 | 全30項目が `self` | `counts.self=30`、他0、`selfPartnerBalance={selfShare:100,partnerShare:0}` | 全件自分 |
| 3 | 全30項目が `partner` | `counts.partner=30`、`selfPartnerBalance={selfShare:0,partnerShare:100}` | 全件パートナー |
| 4 | 全30項目が `both` | `counts.both=30`、`counts.self=0`、`counts.partner=0`、`selfPartnerBalance=null` | 比較材料なし |
| 5 | 全30項目が `none` | `counts.none=30`、`selfPartnerBalance=null` | 比較材料なし |
| 6 | 一部のみ回答（例: 5件`self`・5件`partner`・残り20件未回答） | `answeredItems=10`、`unansweredItems=20`、`percentages.self=50`、`percentages.partner=50` | 未回答混在。分母は回答済み10件 |
| 7 | `self`1件・`partner`2件のみ回答、残り未回答 | `selfPartnerBalance={selfShare:33,partnerShare:67}` | 四捨五入・補数計算の確認（1/3=33.33→33、残り67） |
| 8 | カスタム項目リスト `items=[]` を渡す | `totalItems=0`、`answeredItems=0`、`selfPartnerBalance=null`、`byCategory=[]` | 0件エッジケース。0除算しない |
| 9 | `statuses` に項目リストに存在しない `id` のキーを含める | 存在しないキーは無視され、通常どおり集計される | 余剰キーの無害化 |
| 10 | カテゴリ別集計（`kaji`カテゴリのみ全件`self`、他カテゴリ未回答） | `byCategory` の `kaji` エントリで `counts.self=12`、他カテゴリは `answeredItems=0` | カテゴリ別集計の独立性 |
| 11 | `CHORE_ITEMS` の総数・カテゴリ内訳の確認 | 総数30、`kaji`12・`kosodate`8・`kaigo`5・`sonota`5、`id`はすべて一意 | 定数データの健全性チェック |
| 12 | 全項目「ふたり」1件・「やっていない」1件・残り「自分」「パートナー」半々 | `percentages`の合計が100に近い値（丸め誤差以内）であることを確認 | 割合計算の一般ケース |

## 参考情報の出典（診断結果には使わない）

`data/tables/kaji-jikan-toukei-danjyosa.json`（総務省統計局「令和3年社会生活基本調査」生活時間及び生活行動に関する結果〈結果の概要、令和4年8月31日公表〉、統計Today No.190「我が国における家事関連時間の男女の差」〈令和5年2月8日公表〉）より、次の数値をツール画面内の参考情報Calloutに表示する。

- 10歳以上人口全体（2021年）: 男性51分・女性204分（1日あたり家事関連時間、週全体平均）
- 6歳未満の子を持つ夫婦と子の世帯（2021年）: 夫114分・妻448分

出典URL:
- 総務省統計局「令和3年社会生活基本調査」 https://www.stat.go.jp/data/shakai/2021/index.html
- 結果の概要（PDF） https://www.stat.go.jp/data/shakai/2021/pdf/gaiyoua.pdf
- 統計Today No.190（PDF） https://www.stat.go.jp/info/today/pdf/190.pdf

次回確認: `data/tables/kaji-jikan-toukei-danjyosa.json` の `next_check_due`（2026-10-01）を基準に更新する。
