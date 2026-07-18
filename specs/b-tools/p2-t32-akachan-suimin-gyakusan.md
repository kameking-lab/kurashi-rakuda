# 赤ちゃん連動 睡眠逆算（P2-T32）

## 概要

赤ちゃん（またはお子さま）の年齢区分と、就寝予定時刻・起床予定時刻を入力すると、厚生労働省「健康づくりのための睡眠ガイド2023」の年齢別推奨睡眠時間を参考情報として示しつつ、保護者自身が必要な睡眠時間を確保するための「保護者の就寝時刻の目安」を逆算するツール。寝かしつけ・夜泣き対応にかかる時間も入力に含め、保護者の就寝時刻の目安に反映する。

- docs/02 **#69**（カテゴリ: 健康、難易度B）。BACKLOG.md queueId: `P2-T32`。
- スラッグ: `akachan-suimin-gyakusan`。カテゴリ: `health`。
- 依存データ: `data/tables/suimin-guide-2023.json`（新規作成。厚生労働省「健康づくりのための睡眠ガイド2023」本文PDF＋要約リーフレットを一次情報として収録）。
- YMYL区分: 低。医療的な診断・治療の判断は一切含まない。時刻の逆算と、公的ガイドラインの推奨レンジの引用が中心。断定的な「〜すべき」という指導表現は避け、あくまで目安として提示する。

## データの確認結果（★重要★）

一次情報（厚生労働省「健康づくりのための睡眠ガイド2023」本文PDF `https://www.mhlw.go.jp/content/001305530.pdf` および要約リーフレット `https://www.mhlw.go.jp/content/001288006.pdf`）を実際に取得し、こども版の記載を確認した。

- 本ガイドが時間数で明記している「こども」の推奨睡眠時間の区分は、**1〜2歳（11〜14時間）・3〜5歳（10〜13時間）・小学生（9〜12時間）・中学高校生（8〜10時間）の4区分のみ**。これは米国睡眠医学会（AASM）の consensus statement（Paruthi et al. 2016）をガイドが紹介する形で示している。
- ガイド本文の正式な「推奨事項」欄（p.7「図２：睡眠の推奨事項一覧」）では、こども区分は「小学生は9〜12時間、中学・高校生は8〜10時間を参考に確保する」がメインの推奨として明記され、1〜2歳・3〜5歳はAASM推奨の紹介という位置づけ。
- **1歳未満（乳児・新生児）については、時間数で表した推奨睡眠時間の記載が本ガイド・リーフレットのいずれにも存在しない**。したがって、架空の数値（「12〜16時間」等、AASMの原論文にはあるがガイド本文では紹介されていない数値）は収録していない。1歳未満を選んだ場合は、推奨レンジとの比較を行わず、ガイドが実際に記載している定性的情報（数時間おきの睡眠・覚醒、SIDS予防の仰向け寝、産後うつリスク等）のみを表示する。
- 成人（保護者自身）については「6時間以上を目安として必要な睡眠時間を確保する」という記載があり、これを保護者の必要睡眠時間の初期値（編集可能）として使う。

## 入力仕様

| フィールド名 | 型 | 必須/任意 | バリデーションルール |
|---|---|---|---|
| 赤ちゃん・お子さまの年齢区分（ageBracket） | 選択式 | 必須 | `INFANT_UNDER_1`（1歳未満）/ `TODDLER_1_2`（1〜2歳）/ `PRESCHOOL_3_5`（3〜5歳）/ `ELEMENTARY`（小学生）/ `JUNIOR_SENIOR_HIGH`（中学・高校生）のいずれか。不明な値はエラー |
| 就寝予定時刻（nesetsukeJikoku） | 時刻文字列 `HH:mm` | 必須 | `00:00`〜`23:59`形式。不正形式はエラー |
| 起床予定時刻（kishouJikoku） | 時刻文字列 `HH:mm` | 必須 | 同上。就寝予定時刻と全く同じ時刻はエラー（睡眠時間0のため） |
| 保護者自身の必要睡眠時間（oyaHitsuyouJikanH） | 数値（時間、0より大きく24以下） | 必須 | 初期値6（ガイドの成人推奨「6時間以上」に基づく）。0以下・24超・非数値はエラー |
| 寝かしつけ・夜泣き対応等にかかる時間（bufferMin） | 数値（分、0以上） | 必須 | 初期値30分。負数・非数値はエラー。0を許容する |

## ロジック仕様（時刻逆算式）

すべての時刻は `HH:mm` を「0時0分からの経過分数（0〜1439）」に変換して計算する（`parseHHMM`）。就寝から起床までは日をまたぐ（深夜0時を越える）ことを前提とし、次のルールで「絶対分数（就寝日の0:00を基準とした通し番号）」に正規化する。

```
nesetsukeMin = parseHHMM(nesetsukeJikoku)   // 就寝予定時刻の分数（0〜1439）
kishouMinRaw = parseHHMM(kishouJikoku)      // 起床予定時刻の分数（0〜1439）

crossesMidnight = kishouMinRaw <= nesetsukeMin
kishouAbsMin = crossesMidnight ? kishouMinRaw + 1440 : kishouMinRaw
nesetsukeAbsMin = nesetsukeMin

akachanSuiminMin = kishouAbsMin - nesetsukeAbsMin   // 赤ちゃんの推定睡眠時間（分）。常に正
```

- `kishouMinRaw <= nesetsukeMin` の場合（起床予定時刻の分数が就寝予定時刻の分数以下）は「日をまたぐ」とみなし、起床側に1440分（24時間）を加算する。これにより、就寝21:00→起床7:00（翌日）のような一般的な夜間睡眠だけでなく、就寝13:00→起床15:00（同日内の昼寝的な入力）のようなケースも矛盾なく扱える。
- `kishouMinRaw === nesetsukeMin`（起床予定時刻が就寝予定時刻と完全に一致）の場合は睡眠時間0分となり、意味のある結果を返せないためエラーとする。

### 1. 赤ちゃんの推定睡眠時間と年齢区分の推奨レンジとの比較（参考情報）

```
if ageBracket === INFANT_UNDER_1:
    比較は行わない。「本ガイドに時間数の記載がない年齢区分」である旨と定性的情報のみ表示する。
else:
    category = suimin-guide-2023.json の childRecommendations.categories から ageBracket に対応するものを取得
    akachanSuiminHours = akachanSuiminMin / 60
    if akachanSuiminHours < category.hoursFrom:
        classification = "SHORT"（目安より短め）
    else if akachanSuiminHours > category.hoursTo:
        classification = "LONG"（目安より長め）
    else:
        classification = "WITHIN"（目安の範囲内）
```

分類はあくまで参考情報であり、「短いから問題」「長いから問題」という断定はしない（個人差がある旨を必ず併記）。

### 2. 保護者の就寝時刻の目安（メインの逆算結果）

保護者は赤ちゃんの起床予定時刻に合わせて自身も起床する（＝赤ちゃん対応のため）という前提に立ち、そこから保護者に必要な睡眠時間と、寝かしつけ・夜泣き対応にかかる時間を差し引いて、保護者の就寝時刻の目安を逆算する。

```
oyaHitsuyouMin = round(oyaHitsuyouJikanH * 60)
oyaShuushinAbsMin = kishouAbsMin - oyaHitsuyouMin - bufferMin

dayOffset = floor(oyaShuushinAbsMin / 1440)   // 就寝予定日（day 0）を基準とした日付のずれ
oyaShuushinMinOfDay = ((oyaShuushinAbsMin % 1440) + 1440) % 1440
oyaShuushinLabel = formatHHMM(oyaShuushinMinOfDay)

sufficientWindow = (oyaHitsuyouMin + bufferMin) <= akachanSuiminMin
```

- `dayOffset` は結果表示の補足に使う。`0`なら「赤ちゃんの就寝予定日と同じ日」、`1`以上なら「日付が変わったあと（未明・早朝）」、負の値なら「赤ちゃんの就寝予定時刻より前日側」であることを示す注記を付ける（実運用では`0`か`1`がほとんどだが、極端な入力にも対応できるよう一般化してある）。
- `sufficientWindow` が `false` の場合（保護者の必要睡眠時間＋バッファが、赤ちゃんの就寝〜起床までの時間枠を超える場合）は、計算結果自体は表示しつつ、「この時間枠では目安の睡眠時間を確保するのが難しい可能性がある」という注意書きを表示する（エラーにはしない。就寝時刻をずらす・パートナーと分担する等の工夫を促す文言に留め、断定的な指導は行わない）。

### 3. 時刻・分数フォーマット関数

```
parseHHMM(s): "HH:mm" 形式（時00〜23・分00〜59の2桁ゼロ埋め）に一致しなければ null。一致すれば 時*60+分 を返す。
formatHHMM(min): 0〜1439の整数を "HH:mm" のゼロ埋め文字列に変換する。
formatHours(min): 分を「◯時間◯分」形式に変換する（0時間・0分は省略）。
```

## エッジケース

- **就寝予定時刻＝起床予定時刻**: 睡眠時間0分となり意味をなさないためエラー（「起床予定時刻が就寝予定時刻と同じです」）。
- **同日内の入力（起床予定時刻の分数が就寝予定時刻の分数より大きい）**: 日をまたがない睡眠として扱う（例: 昼寝的な入力にも対応）。
- **日をまたぐ入力（起床予定時刻の分数が就寝予定時刻の分数以下）**: 24時間を加算して扱う（最も一般的な夜間睡眠のケース）。
- **1歳未満を選択した場合**: 推奨レンジとの比較を行わず、定性的情報のみ表示する（架空の数値を出さない）。
- **赤ちゃんの推定睡眠時間が年齢区分の推奨レンジを下回る／上回る場合**: 「目安より短め／長め」という中立的な表現に留め、「危険」「異常」等の不安を煽る表現は使わない。
- **保護者の必要睡眠時間＋寝かしつけ・夜泣き対応時間が、赤ちゃんの睡眠時間枠を超える場合**: `sufficientWindow=false`。エラーにはせず、時間枠が窮屈である旨を注意書きとして表示する。
- **保護者の就寝時刻の目安が日付をまたいで算出される場合（dayOffset ≠ 0）**: 「日付が変わったあと」等の補足を表示する。
- **不正な時刻文字列**（`25:00`、`9:60`、`abc`、空文字等）: いずれも入力エラー。
- **保護者の必要睡眠時間が0以下・24超**: 入力エラー。
- **寝かしつけ・夜泣き対応時間が負数**: 入力エラー（0は許容）。
- **不明な年齢区分コード**: 入力エラー。

## YMYL配慮事項

- 本ツールはYMYL低区分。医療的な診断・治療方針の提示は一切行わない。
- 推奨睡眠時間との比較は「目安」「参考」という表現に留め、断定的な指導（「〜時間眠らせるべき」等）は行わない。
- 1歳未満について、ガイドに時間数の記載がないことを隠さず正直に表示する（データの限界を明示）。
- 睡眠の乱れが長引く場合・保護者自身の心身の不調（産後うつのリスク等）がある場合は、小児科・自治体の保健師・かかりつけ医への相談を促す注記を常時表示する（Callout）。
- 出典3点セット（厚労省ガイド本文PDF・要約リーフレット・data/tables/suimin-guide-2023.json）をregistry.jsonのsourcesに記載する。

## テストケース表

以下は `calcAkachanSuiminGyakusan` の実装値で検算済み（分単位の計算を手計算・スクリプトの両方で突合）。

| # | ageBracket | nesetsukeJikoku | kishouJikoku | oyaHitsuyouJikanH | bufferMin | 期待される結果 | 備考 |
|---|---|---|---|---|---|---|---|
| 1 | TODDLER_1_2 | "20:00" | "07:00" | 7 | 30 | akachanSuiminMin=660(11h)、classification=WITHIN（11〜14hの下限ちょうど）、oyaShuushin=23:30・dayOffset=0 | 標準ケース・日をまたぐ・下限境界値 |
| 2 | PRESCHOOL_3_5 | "21:00" | "06:30" | 6 | 30 | akachanSuiminMin=570(9.5h)、classification=SHORT（10〜13h未満）、oyaShuushin=00:00・dayOffset=1 | 目安より短め・日付が変わったあと |
| 3 | ELEMENTARY | "19:00" | "08:00" | 7 | 15 | akachanSuiminMin=780(13h)、classification=LONG（9〜12h超）、oyaShuushin=00:45・dayOffset=1 | 目安より長め |
| 4 | JUNIOR_SENIOR_HIGH | "23:00" | "07:00" | 8 | 0 | akachanSuiminMin=480(8h)、classification=WITHIN（8〜10h）、oyaShuushin=23:00・dayOffset=0 | バッファ0分 |
| 5 | INFANT_UNDER_1 | "20:00" | "06:00" | 6 | 30 | akachanSuiminMin=600(10h)、classification=比較なし（1歳未満）、oyaShuushin=23:30・dayOffset=0 | 1歳未満は推奨レンジ比較なし |
| 6 | TODDLER_1_2 | "13:00" | "15:00" | 1 | 0 | akachanSuiminMin=120(2h)、同日内（日をまたがない）、classification=SHORT、oyaShuushin=14:00 | 昼寝的な同日内入力 |
| 7 | TODDLER_1_2 | "20:00" | "22:00" | 10 | 30 | akachanSuiminMin=120(2h)、sufficientWindow=false（必要600分+30分がakachanSuiminMin=120分を超える）、oyaShuushin=11:30 | 時間枠不足の警告ケース（エラーにはしない） |
| 8 | ELEMENTARY | "21:00" | "06:00" | 9 | 0 | akachanSuiminMin=540(9h)、classification=WITHIN（9〜12hの下限ちょうど）、oyaShuushin=21:00・dayOffset=0、sufficientWindow=true（9h+0=540<=540の境界） | 下限境界値＋sufficientWindow境界（等号） |
| 9 | PRESCHOOL_3_5 | "20:00" | "09:00" | 6 | 30 | akachanSuiminMin=780(13h)、classification=WITHIN（10〜13hの上限ちょうど）、oyaShuushin=02:30・dayOffset=1 | 上限境界値 |
| 10 | JUNIOR_SENIOR_HIGH | "22:00" | "08:00" | 8 | 0 | akachanSuiminMin=600(10h)、classification=WITHIN（8〜10hの上限ちょうど）、oyaShuushin=00:00・dayOffset=1 | 上限境界値 |
| 11 | TODDLER_1_2 | "20:00" | "20:00" | 7 | 30 | エラー（睡眠時間0分） | 就寝＝起床 |
| 12 | TODDLER_1_2 | "25:00" | "07:00" | 7 | 30 | エラー（不正な時刻文字列） | 時が24以上 |
| 13 | TODDLER_1_2 | "20:00" | "9:60" | 7 | 30 | エラー（不正な時刻文字列） | 分が60以上 |
| 14 | TODDLER_1_2 | "20:00" | "abc" | 7 | 30 | エラー（数値でない時刻文字列） | 起床予定時刻が不正 |
| 15 | TODDLER_1_2 | "20:00" | "07:00" | 0 | 30 | エラー（必要睡眠時間は0より大きい必要） | 必要睡眠時間0 |
| 16 | TODDLER_1_2 | "20:00" | "07:00" | 25 | 30 | エラー（必要睡眠時間は24以下） | 必要睡眠時間の上限超え |
| 17 | TODDLER_1_2 | "20:00" | "07:00" | 7 | -5 | エラー（バッファは0以上） | バッファ負数 |
| 18 | UNKNOWN | "20:00" | "07:00" | 7 | 30 | エラー（不明な年齢区分コード） | ageBracketが不正 |
