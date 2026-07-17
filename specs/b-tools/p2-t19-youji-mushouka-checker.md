# 幼児教育・保育無償化 対象チェッカー（P2-T19）

## 概要

子どものクラス年齢（0〜5歳児クラス）・利用施設の種別・（0〜2歳児クラスの場合のみ）世帯の住民税課税状況を入力すると、幼児教育・保育の無償化の対象になるか（対象／対象外／条件付き対象）と、対象の場合の月額上限・必要な手続きを判定するツール。

- docs/02_ツール一覧.md **#27**（カテゴリ2: 子育て、優先度 中、難易度B）。
- 制度データ: `data/seido/youji-kyouiku-mushouka.json`（こども家庭庁「幼児教育・保育の無償化」、`fiscalYear: 2026`, `asOf: 2026-07-17`）を単一の情報源（SSOT）とする。金額・年齢区分はすべて同JSONを参照し、本ツール・本仕様書に直接ハードコードしない（可読性のため転記している数値は「データ表」節を参照）。
- YMYL区分: 中（お金・手続きに関わる制度判定）。自治体独自の上乗せ助成や運用差があるため、実際の適用は市区町村に要確認である旨を必ず表示する。

## 入力仕様

| フィールド名 | 型 | 必須/任意 | バリデーションルール |
|---|---|---|---|
| クラス年齢（classAge） | 整数（0〜5） | 必須 | `data.targetAges.nonTaxableFrom.value`（0）〜`data.targetAges.freeForAllTo.value`（5）の範囲の整数であること。4月1日時点の満年齢（クラス年齢）を選択する |
| 利用施設の種別（facilityType） | 列挙値 | 必須 | 下記6種別のいずれか: `ninkaHoikusho`（認可保育所）／`ninteiKodomoen`（認定こども園）／`youchienShinseido`（幼稚園・新制度）／`youchienMikoukou`（幼稚園・未移行〈預かり保育含む〉）／`ninkagai`（認可外保育施設等）／`kigyoushudou`（企業主導型保育等） |
| 世帯の住民税課税状況（nonTaxableHousehold） | 真偽値 | 条件付き必須 | クラス年齢が0〜2歳児クラス（`nonTaxableFrom`〜`nonTaxableTo`の範囲）の場合のみ必須。3〜5歳児クラスでは無視される（全世帯対象のため） |

## ロジック仕様

### 1. 年齢区分の判定

```
freeForAllFrom = data.targetAges.freeForAllFrom.value   # 3
freeForAllTo   = data.targetAges.freeForAllTo.value     # 5
nonTaxableFrom = data.targetAges.nonTaxableFrom.value    # 0
nonTaxableTo   = data.targetAges.nonTaxableTo.value      # 2

if classAge < nonTaxableFrom or classAge > freeForAllTo:
    → 入力エラー（対応年齢の範囲外）
elif freeForAllFrom <= classAge <= freeForAllTo:
    ageGroup = "freeForAll"   # 3〜5歳児クラス。全世帯対象
else:  # nonTaxableFrom <= classAge <= nonTaxableTo
    ageGroup = "nonTaxable"   # 0〜2歳児クラス。住民税非課税世帯のみ対象
```

境界値: classAge=2 は必ず `nonTaxable`、classAge=3 は必ず `freeForAll`（`nonTaxableTo`=2 と `freeForAllFrom`=3 は連続しており、隙間・重複はない）。

### 2. 施設種別ごとの属性（固定テーブル。金額を含まない構造情報のみ）

| facilityType | 0〜2歳児クラスの受け入れ | 施設等利用給付認定が必要か |
|---|---|---|
| ninkaHoikusho（認可保育所） | あり | 不要（保育認定に無償化が内包） |
| ninteiKodomoen（認定こども園） | あり | 不要（保育認定に無償化が内包） |
| youchienShinseido（幼稚園・新制度） | なし | 不要（教育標準時間認定に無償化が内包） |
| youchienMikoukou（幼稚園・未移行〈預かり保育含む〉） | なし | 必要 |
| ninkagai（認可外保育施設等） | あり | 必要 |
| kigyoushudou（企業主導型保育等） | あり | 必要 |

### 3. 判定（ageGroup × facilityType × nonTaxableHousehold）

```
if ageGroup == "freeForAll":
    if facilityType の0〜2歳児クラス受け入れ判定は無関係（3〜5歳は全施設が対象年齢）
    if facilityType == "ninkagai":
        monthlyCap = data.ninkagaiCaps.age3to5.value   # 37,000円
    else:
        monthlyCap = null   # 上限の定めなし（利用料そのものが無償化）
    status = 施設等利用給付認定が必要 ? "conditional" : "target"

elif ageGroup == "nonTaxable":
    if facilityType の0〜2歳児クラス受け入れが「なし」（幼稚園2種別）:
        status = "notTarget"   # 幼稚園は満3歳以上が対象のため、0〜2歳児クラスでの利用はない
    elif nonTaxableHousehold が未入力:
        → 入力エラー（住民税課税状況の入力必須）
    elif nonTaxableHousehold == false:
        status = "notTarget"   # 原則対象外。自治体独自の減免制度がある場合がある旨を注記
    else:  # nonTaxableHousehold == true
        if facilityType == "ninkagai":
            monthlyCap = data.ninkagaiCaps.age0to2NonTaxable.value   # 42,000円
        else:
            monthlyCap = null
        status = 施設等利用給付認定が必要 ? "conditional" : "target"
```

### 4. 手続きの提示

```
if status != "notTarget":
    if 施設等利用給付認定が必要:
        procedures = ["市区町村に「施設等利用給付認定」を申請してください。認定を受けていない期間は無償化の対象になりません。"]
    else:
        procedures = ["入園にあたって既に受けている保育の必要性の認定（2号・3号認定）または教育標準時間認定（1号認定）に無償化の適用が含まれるため、追加の手続きは不要です。"]
else:
    procedures = []
```

### 5. 月額上限データが未収録の場合の注記

`youchienMikoukou`・`kigyoushudou` は施設等利用給付認定の対象だが、`data/seido/youji-kyouiku-mushouka.json` には月額上限の数値データがない（同JSONの `ninkagaiCaps` は認可外保育施設等のみを対象とする）。このため、これらの施設種別で `status == "conditional"` の場合は「月額上限は本データに収録されていません。認定通知や施設に上限額をご確認ください。」という注記を必ず添える（上限額を推測・断定表示しない）。

## データ表・出典

`data/seido/youji-kyouiku-mushouka.json`（こども家庭庁「幼児教育・保育の無償化」https://www.cfa.go.jp/policies/kokoseido/mushouka 、`fiscalYear: 2026`, `asOf: 2026-07-17`）より転記。

| 項目 | 値 | JSONパス |
|---|---|---|
| 全世帯無償の下限（3歳児クラスから） | 3歳 | `data.targetAges.freeForAllFrom.value` |
| 全世帯無償の上限（5歳児クラスまで） | 5歳 | `data.targetAges.freeForAllTo.value` |
| 住民税非課税世帯の無償化の下限 | 0歳 | `data.targetAges.nonTaxableFrom.value` |
| 住民税非課税世帯の無償化の上限 | 2歳 | `data.targetAges.nonTaxableTo.value` |
| 認可外保育施設等の月額上限（3〜5歳児クラス） | 37,000円/月 | `data.ninkagaiCaps.age3to5.value` |
| 認可外保育施設等の月額上限（0〜2歳児クラス・住民税非課税世帯） | 42,000円/月 | `data.ninkagaiCaps.age0to2NonTaxable.value` |

出典URL:
- こども家庭庁「幼児教育・保育の無償化」https://www.cfa.go.jp/policies/kokoseido/mushouka （`checkedAt: 2026-07-17`）
- e-Gov法令検索「子ども・子育て支援法」https://laws.e-gov.go.jp/law/424AC0000000065 （第30条の2以下、無償化の法的根拠。`checkedAt: 2026-07-17`）

次回確認: 同JSONに `next_check_due` 等の明示フィールドはないため、`amendments[0]` の記載（2026年度時点で対象・上限額の変更は確認されていない）を基準とし、年度更新のタイミングで再確認する。

## エッジケース

- **0〜2歳児クラス・課税世帯**: 原則対象外。ただし自治体独自の上乗せ助成・減免制度が存在する場合があるため、断定的な「対象外」表示に加えて市区町村への確認を促す注記を必ず出す（本JSONには自治体独自制度の例外データは収録されていないため、具体的な例外条件は記載しない）。
- **0〜2歳児クラス・幼稚園（新制度／未移行いずれも）**: 幼稚園は満3歳以上が対象のため、0〜2歳児クラスでの利用という組み合わせ自体が実務上ない。「対象外」とし、その理由（年齢要件）を明記する。
- **認可外保育施設等の月額上限**: 3〜5歳児クラスは37,000円、0〜2歳児クラス（住民税非課税世帯）は42,000円で異なる。取り違えないよう、判定に使った年齢区分を結果画面に明示する。
- **幼稚園の預かり保育（未移行）の扱い**: 施設等利用給付認定が必要で、かつ月額上限の数値データを本JSONは持たないため、「条件付き対象」とし上限額は「データなし・要確認」と表示する（推測値を出さない）。
- **企業主導型保育等**: 認可外保育施設等と同様に施設等利用給付認定が必要な枠組みとして扱うが、月額上限の数値データは本JSONにないため「条件付き対象」・上限額は「データなし・要確認」。
- **入力範囲外のクラス年齢**（例: 6歳以上、負の値）: 入力エラーとして扱う。
- **住民税課税状況の未入力**（0〜2歳児クラス選択時）: 入力エラーとして扱う。

## YMYL配慮事項

- 結果画面には常時、以下のCalloutを表示する: 「無償化の対象施設・上限額の適用には、施設の確認手続きや保育の必要性の認定が必要な場合があります。給食費・通園送迎費・行事費などは無償化の対象外です。自治体独自の上乗せ助成や運用の違いがあるため、実際の適用は必ずお住まいの市区町村にご確認ください。」（`data/seido/youji-kyouiku-mushouka.json` の `disclaimer` フィールドをそのまま使用）。
- 「条件付き対象」の判定では、月額上限が未確定である旨と、確認すべき手続き（施設等利用給付認定）を必ず併記し、金額を断定表示しない。
- 準拠年度（2026年度）・出典（こども家庭庁）・最終確認日（2026-07-17）を画面内に表示する。

## テストケース表

| # | classAge | facilityType | nonTaxableHousehold | 期待される status | 期待される monthlyCap | 備考 |
|---|---|---|---|---|---|---|
| 1 | 4 | ninkaHoikusho | - | target | null | 3〜5歳児クラス・認可保育所は無条件で対象、上限なし |
| 2 | 1 | ninkaHoikusho | true | target | null | 0〜2歳児クラス・非課税世帯・認可保育所は対象 |
| 3 | 1 | ninkaHoikusho | false | notTarget | null | 0〜2歳児クラス・課税世帯は原則対象外 |
| 4 | 4 | ninkagai | - | conditional | 37000 | 3〜5歳児クラス・認可外は認定必要につき条件付き対象、上限37,000円 |
| 5 | 0 | ninkagai | true | conditional | 42000 | 0〜2歳児クラス・非課税世帯・認可外は上限42,000円 |
| 6 | 0 | ninkagai | false | notTarget | null | 0〜2歳児クラス・課税世帯・認可外も対象外 |
| 7 | 1 | youchienShinseido | true | notTarget | null | 幼稚園は満3歳以上が対象のため0〜2歳児クラスでは対象外（非課税世帯でも変わらず） |
| 8 | 4 | youchienMikoukou | - | conditional | null | 未移行幼稚園は認定必要・上限データなしのため条件付き対象、上限はnull |
| 9 | 4 | kigyoushudou | - | conditional | null | 企業主導型保育も認定必要・上限データなしのため条件付き対象 |
| 10 | 2 | ninkaHoikusho | true | target | null | 境界値: classAge=2は必ずnonTaxable区分 |
| 11 | 3 | ninkaHoikusho | - | target | null | 境界値: classAge=3は必ずfreeForAll区分（nonTaxableHousehold不要） |
| 12 | 6 | ninkaHoikusho | - | error | - | 対応年齢の範囲外（0〜5のみ対応） |
| 13 | -1 | ninkaHoikusho | - | error | - | 対応年齢の範囲外（負の値） |
| 14 | 1 | ninkaHoikusho | undefined | error | - | 0〜2歳児クラスで住民税課税状況が未入力 |
| 15 | 5 | youchienShinseido | - | target | null | 3〜5歳児クラス・幼稚園（新制度）は対象、上限なし |
