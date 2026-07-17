# 健診・がん検診 年齢別スケジュール（女性）（P2-T33）

簡易仕様書（BACKLOG.md の規約に基づき、数式・境界値・出典のみを記載する）。

- **docs/02**: #76（カテゴリ「健康・美容」）
- **queueId**: P2-T33
- **slug**: `josei-kenshin-schedule`
- **category**: `health`
- **難易度**: B（テンプレ量産可能）
- **YMYL区分**: 中（健診の推奨自体は厚生労働省の指針に基づき正確に扱うが、個別の受診判断・医療的な指導は一切行わない。docs/03 §4.1「医療判断系は作らない」原則を適用）

## 概要

生年月日を入力すると満年齢を算出し、女性が対象になりうる健診・がん検診（子宮頸がん検診・乳がん検診・胃がん検診・肺がん検診・大腸がん検診・特定健康診査・後期高齢者健診の7種類）について、現在の年齢で「対象／対象外／あと◯年で対象」のいずれかを、対象年齢・受診間隔とともに一覧表示する。すべて厚生労働省の指針・法令が定める対策型検診の全国共通基準であり、実際に受けられる検診の種類・自己負担額・案内方法は市区町村（特定健診は医療保険者、後期高齢者健診は広域連合）ごとに異なる旨を明示する。

## 入力仕様

| フィールド名 | 型 | 必須/任意 | バリデーションルール |
|---|---|---|---|
| `birthDate`（生年月日） | 日付（YYYY-MM-DD） | 必須 | 実在する日付。基準日（今日）より後の日付はエラー。基準日から120年を超える年齢になる生年月日はエラー（誤入力対策のゆるいガードであり医学的な上限を意味しない） |
| `baseDate`（基準日） | 日付（YYYY-MM-DD） | 内部使用のみ | UIでは常にマウント後にクライアント側で取得した「今日」を使う（SSR/SSGとのずれ防止。NinshinKenshinSchedule.tsx と同じ方式） |

## ロジック仕様

### 満年齢の算出（`calcAge`）

```
age = 基準日の年 − 生年月日の年
基準日の月日が生年月日の月日より前なら age -= 1
```

「誕生日を迎えた日から加齢する」という日常的な満年齢の数え方（年齢計算ニ関スル法律の「前日に達する」という法的な数え方ではない）。本ツールは年単位の対象判定のみを行うため、この簡略化による実務上の影響はない。

★実装上の注意★ 特定健康診査は本来「当該年度において40〜74歳に達する加入者」という年度単位の年齢で判定される（`data/seido/kenshin-gankenshin-schedule.json` の `specificHealthCheckup.targetAge.note`）。本ツールは誕生日基準の満年齢で簡易的に判定するため、誕生日の前後数か月は実際の運用と本ツールの判定が数か月ずれることがある。この限界はツール画面・記事の両方に明記する。

### データからの年齢しきい値抽出（`extractFirstAge` / `extractAgeRange`）

対象年齢の数値は `data/seido/kenshin-gankenshin-schedule.json` の各 `targetAge.value`（例:「50歳以上」「40歳〜74歳」）という自然文の文字列から正規表現で抽出する。年齢の数値をコードに直書きしない。

```
extractFirstAge(text) = /(\d+)歳/ の最初のマッチ
extractAgeRange(text) = [/(\d+)歳.*?(\d+)歳/ の1つ目のマッチ, 2つ目のマッチ]
```

`lib/tools/impl/kaigo-jikofutan.ts` の `YD_MIDDLE`（データの自然文から正規表現で数値を取り出す）と同じ方針。

### 検診ごとの対象年齢としきい値

| id | 検診名 | targetAgeLabel（データ由来） | minAge | maxAge |
|---|---|---|---|---|
| `cervical` | 子宮頸がん検診 | `cervical.targetAgeCytology.value`「20歳以上の女性」 | 20 | なし |
| `breast` | 乳がん検診 | `breast.targetAge.value`「40歳以上の女性」 | 40 | なし |
| `stomach` | 胃がん検診 | `stomach.targetAge.value`「50歳以上」 | 50 | なし |
| `lung` | 肺がん検診 | `lung.targetAge.value`「40歳以上」 | 40 | なし |
| `colorectal` | 大腸がん検診 | `colorectal.targetAge.value`「40歳以上」 | 40 | なし |
| `specificHealthCheckup` | 特定健康診査 | `specificHealthCheckup.targetAge.value`「40歳〜74歳」 | 40 | 74 |
| `elderlyHealthCheckup` | 後期高齢者健診 | `elderlyHealthCheckup.targetPersons.value`（原則75歳以上） | 75 | なし |

いずれも `data/seido/kenshin-gankenshin-schedule.json` の `data.cancerScreenings.*` / `data.specificHealthCheckup` / `data.elderlyHealthCheckup` が一次のSSOT。「受診を特に推奨する年齢」（`recommendedAge`。上限69歳等）は対象年齢の上限ではないため判定に使わない（`commonRules.recommendedAgeNote`「受診を特に推奨する者に該当しない者であっても、受診の機会を提供するよう留意すること」）。

### 対象判定（`judgeScreening`）

```
if maxAge が設定されていて age > maxAge:
    status = "notEligible"（対象外）
else if age >= minAge:
    status = "eligible"（対象）
else:
    status = "notYetEligible"（あと minAge − age 年で対象）
```

`specificHealthCheckup` は年齢が75以上になった時点で `notEligible` になるが、これは「制度が終わった」のではなく「後期高齢者健診（`elderlyHealthCheckup`）に切り替わった」ことを意味する。同時に表示される `elderlyHealthCheckup` の行が `eligible` になるため、一覧全体で切り替わりが分かる構成にしている。

### 子宮頸がん検診の受診間隔（2方式の併記）

子宮頸がん検診は対象年齢のしきい値（20歳）は1つだが、受診間隔は採用する検査方法によって異なる。

```
intervalLabel = "子宮頸部の細胞診: {intervalCytologyYears}年に1回／HPV検査単独法（{targetAgeHpv}）: {intervalHpvYears}年に1回"
```

- 細胞診（20歳以上）: 2年に1回（`cervical.intervalCytologyYears.value`）
- HPV検査単独法（30歳以上）: 5年に1回（`cervical.intervalHpvYears.value`）。市区町村の選択制で、要件（長期追跡が可能なデータベース等）を満たす市町村のみが実施できる（令和6年2月14日改正で新設）

★このツールが避けている誤り★ 「子宮頸がん検診は2年に1回」と一律に書くと、HPV検査単独法を採用している市区町村の実態と食い違う。2つの間隔を必ず併記し、方式は自治体差がある旨を note に明記する。

### 胃がん検診の例外（バリウムのみ40歳以上・年1回も可）

```
note = "{targetAgeException}（{intervalException}）"
```

原則は「50歳以上・2年に1回」だが、胃部エックス線検査（バリウム）に限り「当分の間、40歳以上・年1回」も指針上許容されている（`stomach.targetAgeException` / `stomach.intervalException`）。本ツールの対象判定（minAge=50）はこの例外を反映しない簡易実装とし、例外の存在は note でテキスト表示のみ行う。

### 肺がん検診の検診項目（喀痰細胞診は含まない）

`lung.items.value`「質問（問診）及び胸部エックス線検査」を note に反映する。令和7年12月24日改正で喀痰細胞診が検診項目から削除されているため（`lung.sputumCytology.value = false`）、削除前の説明（「胸部X線と喀痰細胞診」）は書かない。

### 常時表示する参考情報（年齢判定とは独立）

- **治療中の除外**: 現在がんや前がん病変で治療中の方は、そのがん検診の対象にならない（`commonRules.underTreatmentExclusion`）。年齢だけで機械的に「対象」と判定しないよう、常時 Callout で表示する。
- **総合がん検診**: 40歳・50歳の者が対象の「総合がん検診」を受けた場合、年1回のがん検診は当該年度、2年に1回のがん検診は当該年度及び次年度において実施を要しない（`comprehensive.effectOnOtherScreenings`）。本ツールは総合がん検診自体を対象年齢の一覧には含めない（40歳・50歳のピンポイントの節目年齢であり、本ツールの「対象／あと◯年」という連続的な判定モデルに馴染まないため）が、参考情報として常時表示する。

## データ表・出典

| 項目 | 値 | 出典 |
|---|---|---|
| 子宮頸がん検診（細胞診） | 20歳以上の女性・2年に1回 | data/seido/kenshin-gankenshin-schedule.json（`cervical.targetAgeCytology` / `intervalCytologyYears`）／厚生労働省「がん予防重点健康教育及びがん検診実施のための指針」（令和7年12月24日一部改正） |
| 子宮頸がん検診（HPV検査単独法） | 30歳以上の女性・5年に1回 | 同上（`cervical.targetAgeHpv` / `intervalHpvYears`）。令和6年2月14日改正で新設 |
| 乳がん検診 | 40歳以上の女性・2年に1回 | 同上（`breast.targetAge` / `intervalYears`） |
| 胃がん検診 | 50歳以上・2年に1回（バリウムのみ40歳以上・年1回も可） | 同上（`stomach.targetAge` / `intervalYears` / `targetAgeException` / `intervalException`） |
| 肺がん検診 | 40歳以上・年1回 | 同上（`lung.targetAge` / `intervalYears` / `items`）。令和7年12月24日改正で喀痰細胞診が削除 |
| 大腸がん検診 | 40歳以上・年1回 | 同上（`colorectal.targetAge` / `intervalYears`） |
| 特定健康診査 | 40歳〜74歳・1年に1度 | data/seido/kenshin-gankenshin-schedule.json（`specificHealthCheckup.targetAge` / `frequency`）／厚生労働省「特定健診・特定保健指導について」 |
| 後期高齢者健診 | 原則75歳以上・頻度は広域連合が定める | data/seido/kenshin-gankenshin-schedule.json（`elderlyHealthCheckup.targetPersons` / `frequency`）／高齢者の医療の確保に関する法律第125条 |
| がん検診の実施根拠・努力義務 | 健康増進法第19条の2 | data/seido/kenshin-gankenshin-schedule.json（`framework.legalBasis`） |
| 治療中の除外 | 現在がん・前がん病変で治療中の方はそのがん検診の対象外 | 同上（`cancerScreenings.commonRules.underTreatmentExclusion`） |

出典ドメインはいずれも `factory/config/source-allowlist.json` の許可リスト内（`mhlw.go.jp`・`e-gov.go.jp`）。

## エッジケース

- 生年月日が基準日と同日（0歳0日）: 満年齢0として全検診が「あと◯年で対象」になる
- 生年月日が未来日（基準日より後）: 入力エラーとして結果を出さない
- 生年月日から計算した年齢が120歳を超える: 誤入力対策のゆるいガードとしてエラーにする（医学的な上限を意味する値ではない）
- 各検診の対象年齢の下限にちょうど達した年（例: 50歳になった年の胃がん検診）: `age >= minAge` により「対象」（境界値は対象側に含む）
- 特定健康診査の上限（74歳）にちょうど達した年: 「対象」。75歳になった年: 特定健康診査は「対象外」、後期高齢者健診は「対象」に切り替わる（同時に表示されるため、切り替わりが一覧から分かる）
- 生年月日が未入力: 結果を計算せず、入力を促す案内のみ表示する

## YMYL配慮事項

- 本ツールが表示するのは「厚生労働省の指針・法令が定める対策型検診の対象年齢・受診間隔から機械判定した目安」であり、医学的な受診指示・診断ではない。結果画面に固定文言で明記する。
- がん検診の実施主体は市区町村（努力義務。健康増進法第19条の2）、特定健診の実施主体は加入する医療保険者、後期高齢者健診の実施主体は後期高齢者医療広域連合であり、実際に受けられる検診の種類・自己負担額・案内方法は自治体・保険者ごとに異なる（`disclaimer`）。金額は一切表示しない（`framework.selfPayAmountNational.value = null`）。
- 現在がん・前がん病変で治療中の方はそのがん検診の対象にならない旨を、年齢判定の結果とは独立して常時表示する。
- 子宮頸がん検診の受診間隔は方式（細胞診／HPV検査単独法）によって2年／5年に分かれるため、一律の間隔を断定しない。

## テストケース表（14件以上、基準日は特記なき限り 2026-07-17 とする）

| # | 入力 | 期待される出力（主な該当項目） |
|---|---|---|
| 1 | `birthDate=1976-07-17`（基準日と同月日、50歳） | `age=50`。胃がん検診=`eligible`（境界値ちょうど） |
| 2 | `birthDate=1976-07-18`（基準日の1日後が誕生日、49歳） | `age=49`。胃がん検診=`notYetEligible`・`yearsUntilEligible=1` |
| 3 | `birthDate=2006-07-17`（20歳） | `age=20`。子宮頸がん検診=`eligible`。乳がん検診=`notYetEligible`・`yearsUntilEligible=20` |
| 4 | `birthDate=1986-07-17`（40歳） | `age=40`。乳がん・肺がん・大腸がん・特定健診=`eligible` |
| 5 | `birthDate=1952-07-17`（74歳） | `age=74`。特定健診=`eligible`（上限ちょうど）。後期高齢者健診=`notYetEligible`・`yearsUntilEligible=1` |
| 6 | `birthDate=1951-07-17`（75歳） | `age=75`。特定健診=`notEligible`。後期高齢者健診=`eligible` |
| 7 | `birthDate=2026-07-17`（0歳、基準日と同日） | `age=0`。全検診が`notYetEligible`（子宮頸=あと20年） |
| 8 | `birthDate=2026-07-18`（基準日より1日後） | `ok:false`。「生年月日が今日より後の日付になっています。入力内容をご確認ください」 |
| 9 | `birthDate=1900-01-01`（126歳相当） | `ok:false`。「生年月日が古すぎます。入力内容をご確認ください」 |
| 10 | `birthDate` 未入力 | `ok:false`。「生年月日を入力してください」 |
| 11 | `extractFirstAge("50歳以上")` | `50` |
| 12 | `extractAgeRange("40歳〜74歳")` | `[40, 74]` |
| 13 | `calcAge("1990-07-16", "2026-07-17")` / `calcAge("1990-07-18", "2026-07-17")` | `36` / `35`（誕生日前後1日の境界） |
| 14 | 45歳の複数検診同時判定（`birthDate=1981-07-17`） | 子宮頸・乳・肺・大腸・特定健診=`eligible`、胃がん検診=`notYetEligible`・`yearsUntilEligible=5`、後期高齢者健診=`notYetEligible`・`yearsUntilEligible=30` |
