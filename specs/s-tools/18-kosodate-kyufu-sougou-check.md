# 子育て世帯の給付金・助成金 総ざらいチェッカー（P2-T02）

簡易仕様書（数式・境界値・出典のみ）。

- **docs/02**: #58（カテゴリ「お金」）
- **queueId**: P2-T02
- **slug**: `kosodate-kyufu-sougou-check`
- **category**: `money`
- **難易度**: S（多制度の横断照合・非金額の設計判断）
- **YMYL区分**: 中（気づきと道案内。支給可否・金額は判定しない）
- **SSOT**: `data/seido/kosodate-kyufu-sougou-check.json`（8制度の存在・所管・対象・申請先のみ。★金額・所得制限は持たない★）。

## 概要

★金額計算をしない気づき系ツール★。子どものライフステージ（妊娠／出産・育児／未就学／小学生／中学生／高校生）から、関係しうる子育て支援の制度（8件）を横断的に洗い出し、対象の概要・所管・申請先へ道案内する。各制度の詳細計算はサイト内の個別ツールに委ねる（内部リンク）。ひとり親の場合は児童扶養手当を強調。

## 入力仕様

| フィールド | 型 | 必須 | ルール |
|---|---|---|---|
| `lifeStage`（子の時期） | enum | 必須 | 妊娠／出産・育児／未就学／小学生／中学生／高校生 |
| `singleParent`（ひとり親） | boolean | 任意 | true で児童扶養手当を強調 |

## ロジック仕様

```
matched = ALL_PROGRAMS.filter(p => p.lifeStage.includes(lifeStage))
          .sort(isUniversal を先に)   // 全世帯対象を上、条件付きを下

universalCount   = matched の isUniversal=true の数
conditionalCount = matched の isUniversal=false の数
emphasizedKeys   = singleParent かつ matched に jidou-fuyou-teate があれば [jidou-fuyou-teate]
```

`relatedToolSlug(key)`: 制度キー→サイト内の対応ツール slug（jido-teate/ikukyu-kyufu→sankyu-ikukyu-money/youji-kyouiku-mushouka→youji-mushouka-checker/jidou-fuyou-teate/kodomo-iryouhi-jyosei）。対応がなければ null（外部送客はしない）。

## テストケース表（tests/kosodate-kyufu-sougou-check.test.ts）

| # | 入力 | 期待 |
|---|---|---|
| 6 | 妊娠 | 産休育休給付・妊婦支援給付が該当 |
| 7 | 高校生 | 児童手当・高校就学支援金・こども医療費が該当 |
| 8 | 高校生 | 就学援助（小中）は非該当 |
| 11 | 高校生 | isUniversal が先頭に並ぶ |
| 13 | 小学生＋ひとり親 | 児童扶養手当を強調 |
| 15 | 妊娠＋ひとり親 | 児童扶養手当が非該当なので強調しない |

## このツールが行わないこと

- 金額・所得制限・給付率の計算（データが持たない＝個別ツール/窓口に委ねる）。
- 支給可否の確定判定（気づきに徹する）。
- 自治体独自の給付の網羅（一次情報のある国の制度のみ。注意書きで明示）。

## 出典

`data/seido/kosodate-kyufu-sougou-check.json` の `sources`（こども家庭庁・文部科学省・厚生労働省の各制度案内）。
