---
{
  "id": "seido-kyouiku-kunren-kyufukin",
  "title": "教育訓練給付金は資格取得でいくら戻る？",
  "type": "seido-kaisetsu",
  "category": "仕事・キャリア",
  "revision_year": 2026,
  "tool_ref": null,
  "persona": "ペルソナ3: 山本遥（29歳・独身・総合職）",
  "solves": [
    "資格取得の費用が教育訓練給付金でいくら戻るか分からない",
    "自分が受けたい講座がどの給付率のコースに当てはまるか分からない",
    "資格を取って転職した場合に追加でいくらもらえるか分からない",
    "何度も使える制度なのか、条件があるのか分からない"
  ],
  "sources": [
    {
      "url": "https://www.hellowork.mhlw.go.jp/insurance/insurance_education.html",
      "title": "ハローワークインターネットサービス - 教育訓練給付金",
      "org": "厚生労働省 職業安定局",
      "accessed": "2026-07-17"
    },
    {
      "url": "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/jinzaikaihatsu/kyouiku.html",
      "title": "教育訓練給付金｜厚生労働省",
      "org": "厚生労働省",
      "accessed": "2026-07-17"
    }
  ],
  "facts": [
    {
      "key": "kyouiku_kunren.training_types",
      "value": 3,
      "unit": "種類",
      "seido_ref": "kyouiku-kunren-kyufukin.json#data.overview.trainingTypes.value",
      "status": "verified"
    },
    {
      "key": "kyouiku_kunren.minimum_amount",
      "value": 4000,
      "unit": "円",
      "seido_ref": "kyouiku-kunren-kyufukin.json#data.overview.minimumBenefitAmount.value",
      "status": "verified"
    },
    {
      "key": "kyouiku_kunren.ippan.rate_percent",
      "value": 20,
      "unit": "%",
      "seido_ref": "kyouiku-kunren-kyufukin.json#data.ippan.benefitRate.value",
      "status": "stub",
      "stub_reason": "一般教育訓練の給付率はデータ上0.2（小数）で保持されている。本文の百分率表示20%はこれを100倍した表示値のため機械照合の対象外(stub)とし、原数値0.2はseido_refの参照先で確認できる。"
    },
    {
      "key": "kyouiku_kunren.ippan.cap",
      "value": 100000,
      "unit": "円",
      "seido_ref": "kyouiku-kunren-kyufukin.json#data.ippan.benefitCap.value",
      "status": "verified"
    },
    {
      "key": "kyouiku_kunren.tokutei_ippan.rate_percent",
      "value": 40,
      "unit": "%",
      "seido_ref": "kyouiku-kunren-kyufukin.json#data.tokuteiIppan.benefitRate.value",
      "status": "stub",
      "stub_reason": "特定一般教育訓練の基本給付率はデータ上0.4（小数）。本文の百分率表示40%はこれを100倍した表示値のため機械照合の対象外(stub)とし、原数値0.4はseido_refの参照先で確認できる。"
    },
    {
      "key": "kyouiku_kunren.tokutei_ippan.cap",
      "value": 200000,
      "unit": "円",
      "seido_ref": "kyouiku-kunren-kyufukin.json#data.tokuteiIppan.benefitCap.value",
      "status": "verified"
    },
    {
      "key": "kyouiku_kunren.rate_50_percent_shared",
      "value": 50,
      "unit": "%",
      "seido_ref": "kyouiku-kunren-kyufukin.json#data.tokuteiIppan.benefitRateAfterQualification.value",
      "status": "stub",
      "stub_reason": "特定一般教育訓練の資格取得後給付率（データ上0.5）と、専門実践教育訓練・第1段階の受講中給付率（data.senmonJissen.stages.rows[stage=1].rate、同じく0.5）を百分率表示に換算した共通の値。両者とも原数値は0.5のため機械照合の対象外(stub)とする。"
    },
    {
      "key": "kyouiku_kunren.tokutei_ippan.cap_after",
      "value": 250000,
      "unit": "円",
      "seido_ref": "kyouiku-kunren-kyufukin.json#data.tokuteiIppan.benefitCapAfterQualification.value",
      "status": "verified"
    },
    {
      "key": "kyouiku_kunren.senmon.stage1_cap",
      "value": 400000,
      "unit": "円",
      "seido_ref": "kyouiku-kunren-kyufukin.json#data.senmonJissen.stages.rows[stage=1].annualCap",
      "status": "verified"
    },
    {
      "key": "kyouiku_kunren.senmon.stage2_rate_percent",
      "value": 70,
      "unit": "%",
      "seido_ref": "kyouiku-kunren-kyufukin.json#data.senmonJissen.stages.rows[stage=2].rate",
      "status": "stub",
      "stub_reason": "専門実践教育訓練・第2段階の給付率はデータ上0.7（小数）。本文の百分率表示70%はこれを100倍した表示値のため機械照合の対象外(stub)とし、原数値0.7はseido_refの参照先で確認できる。"
    },
    {
      "key": "kyouiku_kunren.senmon.stage2_cap",
      "value": 560000,
      "unit": "円",
      "seido_ref": "kyouiku-kunren-kyufukin.json#data.senmonJissen.stages.rows[stage=2].annualCap",
      "status": "verified"
    },
    {
      "key": "kyouiku_kunren.senmon.stage3_rate_percent",
      "value": 80,
      "unit": "%",
      "seido_ref": "kyouiku-kunren-kyufukin.json#data.senmonJissen.stages.rows[stage=3].rate",
      "status": "stub",
      "stub_reason": "専門実践教育訓練・第3段階の給付率はデータ上0.8（小数）。本文の百分率表示80%はこれを100倍した表示値のため機械照合の対象外(stub)とし、原数値0.8はseido_refの参照先で確認できる。"
    },
    {
      "key": "kyouiku_kunren.senmon.stage3_cap",
      "value": 640000,
      "unit": "円",
      "seido_ref": "kyouiku-kunren-kyufukin.json#data.senmonJissen.stages.rows[stage=3].annualCap",
      "status": "verified"
    },
    {
      "key": "kyouiku_kunren.senmon.wage_increase_threshold_percent",
      "value": 5,
      "unit": "%",
      "seido_ref": "kyouiku-kunren-kyufukin.json#data.senmonJissen.wageIncreaseThreshold.value",
      "status": "stub",
      "stub_reason": "専門実践教育訓練・第3段階（給付率80%）の要件となる賃金上昇率はデータ上0.05（小数）。本文の百分率表示5%はこれを100倍した表示値のため機械照合の対象外(stub)とし、原数値0.05はseido_refの参照先で確認できる。"
    },
    {
      "key": "kyouiku_kunren.senmon.max_total_benefit",
      "value": 1920000,
      "unit": "円",
      "seido_ref": "kyouiku-kunren-kyufukin.json#data.senmonJissen.maxTotalBenefit.value",
      "status": "verified"
    }
  ],
  "last_updated": "2026-07-17",
  "next_check_due": "2027-04-01",
  "summary": "教育訓練給付金は、受講する講座の種類によって給付率が20%から最大80%まで異なる雇用保険の給付です。一般・特定一般・専門実践の3種類の給付率と上限額を、資格取得や就職の有無による違いも含めて整理します。",
  "audience": {
    "universal": false,
    "lifeStages": [
      "adult"
    ],
    "lifeEvents": [
      "working"
    ],
    "childAgeBands": [],
    "gender": null
  }
}
---

# 教育訓練給付金は資格取得でいくら戻る？

## 結論

教育訓練給付金は、受講する講座のレベルに応じて3種類あり、給付率と上限額が異なります。一般教育訓練は経費の20%（上限10万円）、特定一般教育訓練は40%（上限20万円、資格取得と就職を伴えば差額を含め50%・上限25万円）、専門実践教育訓練は受講中50%（年間上限40万円）から資格取得・就職で70%（年間上限56万円）、さらに訓練後の賃金が5%以上上がれば80%（年間上限64万円）まで段階的に上がります。

## 対象と金額

- 一般教育訓練: 経費の20%（上限10万円）。受講開始日に雇用保険の加入期間が3年以上（初めての受給なら1年以上）あることが条件です。
- 特定一般教育訓練: 経費の40%（上限20万円）。受講修了後に資格を取得し、修了から1年以内に就職するか、雇用されたまま資格を取得すると、差額が追加で支給され合計50%（上限25万円）になります。受講を始める前に、あらかじめハローワークでの手続きを済ませておく必要があります。
- 専門実践教育訓練: 半年ごとに50%（年間上限40万円）が支給され、資格取得・就職で70%（年間上限56万円）、そこからさらに訓練後の賃金が受講前より5%以上上がれば80%（年間上限64万円）まで積み上がります。最大3年間で総額192万円が上限です。

いずれも、計算した支給額が4,000円を超えない場合は支給されません。また、前回の受給から3年以内は再び受給できないため、あわせて注意してください。

## 出典・根拠

- ハローワークインターネットサービス「教育訓練給付金」（厚生労働省 職業安定局）
- 厚生労働省「教育訓練給付金」

---
最終更新日: 2026-07-17 ／ 準拠年度: 2026年度 ／ 出典: 上記「出典・根拠」参照

※本記事は一次情報をもとにした情報整理です。個別の状況については自治体・専門機関に確認してください。
