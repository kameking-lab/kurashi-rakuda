# factory/ — G4 記事工場パイプライン

kameking-lab/safe-ai-site（旧anzen-ai-portal、read-only参照。改変していない）の記事生成パイプラインを、くらしのラクダ向けに移植したもの。移植元の詳細な構成調査は本PRの完了報告を参照。

## 移植元との対応関係

safe-ai-site には実は2系統のパイプラインがあった。

- **系統A（SEOテンプレ記事、`scripts/generate-seo-articles.mjs`）**: 官公庁一次データをテンプレへ機械的に流し込む非LLM生成。`TRUSTED_DOMAINS` による出典許可リストの仕組みはここから移植。
- **系統B（現場ことば版、`web/src/lib/plain/fidelity.ts`）**: AIエージェントが平易文を執筆し、原文との数値・主体・参照条番号を機械照合する「生成→機械検証→自己修正」ループ。**本サイトが「CI忠実性ゲート」と呼んでいるものの実体はこちら**。

本サイトはB系統の「AIが書き、機械が忠実性を保証する」設計を踏襲しつつ、対象を「原文条文との照合」から「本文中の数値 ⇔ frontmatter.facts[] ⇔ data/seido/ の一次データ」の三者照合に組み替えている（記事は条文の言い換えではなく制度解説のため）。

## 変更点（ミッション指定の3点）

1. **ソース許可リスト差し替え**: `config/source-allowlist.json`。safe-ai-siteの労働安全衛生ドメインから、こども家庭庁・厚労省・消費者庁・自治体(`*.lg.jp`)等に総入れ替え。
2. **YMYL数値の機械照合ゲート**: `scripts/lib/fidelity.mjs`。本文中の「数値+単位」トークンをすべて抽出し、frontmatterの`facts[]`宣言と突合、さらに`facts[].seido_ref`経由で`data/seido/*.json`の一次データと突合する。未整備の制度データは`facts[].status = "stub"`（`stub_reason`必須）で先行させ、ビルドは落とさず警告のみとする（safe-ai-siteのstale許容パターンを踏襲）。
3. **3記事型テンプレ**: `templates/{seido-kaisetsu,tool-narisou,dandori}.md`。型ごとの必須見出し・必須frontmatterは`config/article-types.json`で定義。

## ディレクトリ構成

```
factory/
  README.md                    このファイル
  config/
    source-allowlist.json      出典として認める一次情報ドメイン
    article-types.json         3記事型の定義（必須見出し・必須frontmatter等）
  schema/
    article-frontmatter.schema.json
    job.schema.json
  templates/                   3記事型のテンプレ雛形
  data/seido/                  制度データ（機械照合の正本）。未整備分はファイル自体を作らずfacts側をstub扱いにする
  queue/                       記事60本のジョブ定義（1ジョブ=1JSON）
  scripts/
    check-fidelity.mjs         忠実性ゲートのCLI本体
    validate-queue.mjs         キューの構造・カテゴリ配分検査
    lib/
      frontmatter.mjs          JSON frontmatterパーサ
      fidelity.mjs             ゲートのロジック本体
```

## 記事フォーマット

Markdownの先頭を `---\n{ JSON }\n---\n` で囲んだ **JSON frontmatter** を採用する（YAML/TS混在だったsafe-ai-siteと異なり、依存ゼロ・パース事故ゼロを優先した設計判断）。フィールド定義は `schema/article-frontmatter.schema.json` を参照。

## 使い方

```bash
# 忠実性ゲートを実行（content/articles/ 配下の全記事、またはファイル/globを指定）
node factory/scripts/check-fidelity.mjs content/articles

# キューの構造・カテゴリ配分を検査
node factory/scripts/validate-queue.mjs
```

## 生成ワークフロー（人間/エージェント向け）

safe-ai-site系統Bと同じく、平易文の執筆そのものはコードでは自動化しない。次の手順で「生成→機械検証→自己修正」のループを回す。

1. `factory/queue/*.json` から1件ジョブを選ぶ
2. `type` に対応する `factory/templates/*.md` を雛形として執筆する。本文に登場する金額・日数・条件の数値は必ず frontmatter の `facts[]` に事前宣言し、可能な限り `data/seido/*.json` の値と一致させる（一次データが未整備なら `status: "stub"` + `stub_reason` で明示）
3. `node factory/scripts/check-fidelity.mjs <生成した記事>` を実行し、違反(✗)がゼロになるまで本文かfacts[]を修正する
4. 通過したら `content/articles/` に配置し、対応する `factory/queue/*.json` の `status` を `gated_pass` に更新する

## data/seido/ の位置づけ

本来は全社共通の `data/seido/` を想定しているミッション記述だが、本タスクの変更許可範囲（factory/・content/・specs/b-tools/のみ）に合わせ `factory/data/seido/` に配置している。サイト実装フェーズでルート直下の `data/seido/` に昇格させる場合は参照パスの置き換えのみで済むよう、ファイル形式・キー構造をそのまま踏襲できる設計にしてある。
