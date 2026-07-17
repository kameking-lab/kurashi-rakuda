# 作り置き 日持ち一覧（冷蔵/冷凍別）（P2-T24）

## 概要

作り置き（常備菜）の料理名またはカテゴリを検索・選択すると、そのカテゴリの冷蔵/冷凍それぞれの日持ちの目安を表示する早見ツール。

- docs/02_ツール一覧.md **#45**（カテゴリ「家事・料理」、優先度 中、難易度B、依存データ「#37 冷凍保存期間検索と部品共通」）。BACKLOG.md queueId `P2-T24`。
- 依存データ: `data/tables/tsukurioki-himochi.json`（新規作成）。参考: `data/tables/reito-hozon.json`（#37冷凍保存期間検索。構造・トーンの参考にしたが、収録範囲は生鮮食材の冷凍週数であり本ツールとは別データ）。
- YMYL区分: **低〜中**。食中毒予防に関わるため、目安値であり保存状態により変動する旨・怪しいと感じたら食べない旨を明記する。

## ★出典調査の結果と限界（最重要・正直な開示）★

実装前に、消費者庁（caa.go.jp）・農林水産省（maff.go.jp）・厚生労働省（mhlw.go.jp）のサイトを実際に調査した。結果は次の通り。

**公的機関が明記している内容（一次情報）**:

1. 厚生労働省「家庭でできる食中毒予防の６つのポイント」（購入→保存→下準備→調理→食事→残った食品）
   - 調理: 「中心部の温度が75℃で1分間以上加熱する」
   - 食事: 「温かい料理は65℃以上、冷やして食べる料理は10℃以下」「味噌汁やスープ等は沸騰するまで加熱しましょう」「調理前の食品や調理後の食品は、室温に長く放置してはいけません」
   - 残った食品: 「残った食品はきれいな器具、皿を使って保存しましょう」「残った食品は早く冷えるように浅い容器に小分けして保存しましょう」「時間が経ち過ぎたら、思い切って捨てましょう」
   - **料理ごとの具体的な保存可能日数の記載はない。**
2. 農林水産省「煮込み料理を楽しむために～ウェルシュ菌による食中毒にご注意を！！～」
   - 「ウェルシュ菌が増えることのできる温度帯は約12〜50℃とされており」
   - 「常温のまま放置せず、できるだけその日のうちに食べきる」（カレー・煮物等）
   - 「保存の際は、小分けするなどして、できるだけ早く冷ます」
   - 「再加熱の際は、おたまで鍋底までかき混ぜ、中心までしっかりと加熱する」
   - **カレー・煮込み料理について「その日のうちに」という具体的な推奨はあるが、「保存する場合に何日もつか」という日数の記載はない。**
3. 農林水産省「冷蔵庫のかしこい使い方～知ってお得な食品の保存～」
   - 「あら熱をとったら密閉容器に入れるかラップでぴったりと包み、早めに冷蔵庫や冷凍庫にいれましょう」
   - 「冷蔵庫に保存した調理済みの食品は、なるべく早く食べきってしまいましょう」
   - 「少しでも食品のにおいや見た目がおかしいと思ったら、思い切って捨てましょう」
   - 冷凍についても「早めに」という定性的な表現のみで、具体的な週数・日数の記載はない。

**結論**: 消費者庁・農林水産省・厚生労働省のいずれも、「きんぴらごぼうは冷蔵3日」「ひじき煮は冷蔵4日」のような**料理単位の具体的な保存日数を明記した一次情報は存在しない**。明記されているのは「早く冷やす」「小分けにする」「なるべく早く食べる」「時間が経ちすぎたら捨てる」「十分に再加熱する」という**定性的な原則**と、カレー・煮込み料理に限った「その日のうちに食べきる」という推奨のみである。

**本ツールの対応方針**: 料理単位の日数を捏造しない。代わりに、①上記の定性的な原則、②一般的な食品衛生の考え方（加熱の有無・塩分/糖分/酢の濃さで傷みやすさの傾向が変わる）を踏まえて、**カテゴリ単位**（生野菜系／加熱済み一般／塩分糖分酢の多いもの／カレー等の煮込み／汁物の5分類）で「広く一般的に言われている目安」を提示する。この目安は公的機関が直接その日数を保証したものではないことを、データ・UI・記事のすべてで明示する（`granularityLimitation` フィールド、画面の常時表示Callout、記事本文）。家庭料理レシピサイト等の非公的な出典は一切使用していない。

## 入力仕様

| フィールド名 | 型 | 必須/任意 | バリデーションルール |
|---|---|---|---|
| 料理名（query） | 文字列 | 任意 | 最大30文字。ひらがな⇄カタカナ・全角半角ゆれを吸収した部分一致でカテゴリのエイリアス（例:「きんぴらごぼう」「カレー」）に照合する |
| カテゴリID（categoryId） | 文字列（カテゴリのid） | 任意 | 5カテゴリのいずれかのid。指定時はqueryより優先し、直接そのカテゴリの詳細を表示する |

query・categoryIdともに未指定（初期状態）の場合は5カテゴリすべてを一覧表示する。

## ロジック仕様

計算ロジックは存在しない。`data/tables/tsukurioki-himochi.json` に定義した5カテゴリの固定データを検索・表示整形するのみ（`components/tools/impl/ReitoHozon.calc.ts` と同型のパターン）。

```
search(params):
  if params.categoryId:
    category = categories.find(c => c.id === categoryId)
    return category ? {kind: "single", item: category} : {kind: "notFound"}

  query = normalize(params.query ?? "")
  if query === "":
    return {kind: "list", items: すべてのカテゴリ}

  results = categories.filter(c =>
    normalize(c.name).includes(query) ||
    c.aliases.some(a => normalize(a).includes(query))
  )
  if results.length === 1: return {kind: "single", item: results[0]}
  if results.length === 0: return {kind: "notFound"}
  return {kind: "list", items: results}
```

`normalize` はNFKC正規化・前後空白除去・カタカナ→ひらがな変換のみで、`ReitoHozon.calc.ts` の `normalizeFoodQuery` と同じ実装。

日数表示は `formatDays(min, max)`（min===maxなら「約◯日」、それ以外は「約◯〜◯日」）、週数表示は `formatWeeks(min, max)` で同様に整形する。

## データ表・出典

`data/tables/tsukurioki-himochi.json` の5カテゴリ（`lastVerified: 2026-07-18`）。

| カテゴリ | 例 | 冷蔵目安 | 冷凍目安 | 備考 |
|---|---|---|---|---|
| 生野菜サラダ・浅漬け・和え物 | サラダ、浅漬け、ポテトサラダ | 約1〜2日 | 冷凍不可 | 生野菜・マヨネーズ系は水分分離・食感劣化のため冷凍非推奨 |
| 加熱調理した一般的なおかず | きんぴらごぼう、肉じゃが、から揚げ、卵焼き | 約2〜3日 | 約2〜4週間 | 加熱により菌が減っているため生野菜系より長め |
| 塩分・糖分・酢を多く使ったもの | 佃煮、酢の物、ピクルス | 約3〜4日 | 約2〜4週間 | 塩分・糖分・酢の静菌作用により他のおかずよりやや長め |
| カレー・シチュー・煮込み料理 | カレー、シチュー、おでん | 約1〜2日（当日中が理想） | 約2〜4週間 | ウエルシュ菌（12〜50℃で増殖）に特に注意。農水省が「その日のうちに食べきる」を推奨 |
| 汁物・スープ・みそ汁 | みそ汁、豚汁、スープ | 約2〜3日 | 約2〜4週間 | 食べる際は毎回沸騰するまで再加熱するのが基本 |

出典URL（すべて `factory/config/source-allowlist.json` 許可済みドメイン。追加不要）:

- 厚生労働省「家庭でできる食中毒予防の６つのポイント」 https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/shokuhin/syokuchu/01_00006.html
- 農林水産省「煮込み料理を楽しむために～ウェルシュ菌による食中毒にご注意を！！～」 https://www.maff.go.jp/j/syouan/seisaku/foodpoisoning/f_encyclopedia/clostridium.perfringens.html
- 農林水産省「冷蔵庫のかしこい使い方～知ってお得な食品の保存～」 https://www.maff.go.jp/j/syouan/seisaku/foodpoisoning/frige.html

次回確認: `data/tables/tsukurioki-himochi.json` の `nextCheckDue`（2027-01-18）を参照。

## エッジケース・注意事項

- **query・categoryIdともに未指定**: 5カテゴリすべてを一覧表示する（`kind: "list"`）。
- **queryが空文字列（trim後）**: 未指定と同じ扱い（全カテゴリ一覧）。
- **queryが1件のみヒット**: 詳細表示（`kind: "single"`）に自動的に切り替わる。
- **queryが複数ヒット**: 一覧から選択する形式（`kind: "list"`）。
- **queryが0件ヒット**: 「まだ登録がありません」ではなく「一致するカテゴリが見つかりませんでした」という案内＋全カテゴリへの誘導を表示する（`kind: "notFound"`）。5カテゴリしかないため未収録の食材は多いが、近いカテゴリを選ぶ導線を用意する。
- **categoryId指定時はqueryを無視**: `searchTsukuriokiHimochi` はcategoryIdが指定されていればqueryを見ない（`ReitoHozon.calc.ts` と同じ優先順位）。
- **ひらがな⇄カタカナ表記ゆれ**: 「サラダ」「さらだ」のいずれでも一致する（NFKC正規化＋カタカナ→ひらがな変換）。
- **freezable: falseのカテゴリ（生野菜サラダ系）**: 冷凍週数を表示せず、`freezeNote` の理由文のみ表示する。
- **idealSameDay: trueのカテゴリ（カレー・シチュー・煮込み料理）**: 冷蔵日数の範囲（約1〜2日）に加えて「できるだけその日のうちに食べきるのが理想です」という注記を必ず併記する。

## YMYL配慮事項

- 「公的機関は料理単位の具体的な冷蔵保存日数を明記していない」という限界を、根拠・計算式セクション・画面本文・記事本文のすべてで明示する（`granularityLimitation`）。
- カレー・シチュー・煮込み料理については、農林水産省の注意喚起どおり「ウエルシュ菌」「12〜50℃で増殖」という具体的な情報を隠さず提示し、家庭で見落とされがちなリスクを正直に伝える。
- 日数はあくまで目安であり、保存状態（清潔な容器・急冷・冷蔵庫内温度）により実際の日持ちは変動する旨、および「におい・見た目・味に異常を感じたら目安日数内でも廃棄する」という一般的な注意を常時表示する。
- 断定的な安全宣言（「◯日以内なら安全」等）は一切行わない。あくまで「目安」であることを一貫して強調する。
- 家庭料理レシピサイト等の非公的な出典は使用しない（`factory/config/source-allowlist.json` の許可ドメインの範囲内のみで収集）。

## テストケース表

| # | 入力 | 期待される結果 |
|---|---|---|
| 1 | query未指定 | `kind: "list"`、5件（全カテゴリ） |
| 2 | query="" | `kind: "list"`、5件（全カテゴリ） |
| 3 | query="きんぴらごぼう" | `kind: "single"`、id: "kanetsu-okazu" |
| 4 | query="カレー" | `kind: "single"`、id: "curry-nikomi" |
| 5 | query="みそ汁" | `kind: "single"`、id: "shirumono-soup" |
| 6 | query="サラダ" | `kind: "single"`、id: "seisai-salad" |
| 7 | query="佃煮" | `kind: "single"`、id: "enbun-tou-su" |
| 8 | query="かれー"（ひらがな） | `kind: "single"`、id: "curry-nikomi"（表記ゆれ吸収） |
| 9 | query="カレー"（カタカナ） | 上記#4と同じ結果になること（ゆれ吸収の対称性） |
| 10 | query="存在しない料理名xyz" | `kind: "notFound"` |
| 11 | categoryId="curry-nikomi" | `kind: "single"`、`idealSameDay: true`、`refrigDaysMin: 1, refrigDaysMax: 2` |
| 12 | categoryId="seisai-salad" | `kind: "single"`、`freezable: false` |
| 13 | categoryId="存在しないid" | `kind: "notFound"` |
| 14 | categoryIdとqueryを同時指定 | categoryIdが優先される |
| 15 | formatDays(2, 2) | "約2日" |
| 16 | formatDays(2, 3) | "約2〜3日" |
| 17 | formatWeeks(2, 4) | "約2〜4週間" |
| 18 | getAllCategories() | 5件、idの重複なし |
| 19 | getCategoryById("kanetsu-okazu") | `refrigDaysMin: 2, refrigDaysMax: 3` |
| 20 | getCategoryById("存在しないid") | `null` |
| 21 | query="  カレー  "（前後空白） | trimして"カレー"と同じ扱いになり `kind: "single"` |

全21件以上を `tests/tsukurioki-himochi-ichiran.test.ts` に実装する。
