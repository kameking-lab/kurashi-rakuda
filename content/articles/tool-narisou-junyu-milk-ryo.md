---
{
  "id": "tool-narisou-junyu-milk-ryo",
  "title": "授乳・ミルク量の目安はこう決まる — 月齢・体重別ツールの結果の読み方",
  "summary": "新生児期は体重ベース、1ヶ月以降は月齢帯ごとの参照表という2段構えで計算する授乳・ミルク量の目安ツールの考え方を解説する。",
  "type": "tool-narisou",
  "category": "子育て",
  "tool_ref": "junyu-milk-ryo",
  "persona": "ペルソナ1: 佐藤美咲（32歳・専業主婦・子ども2人）",
  "solves": [
    "授乳・ミルクの量がこれで足りているのか分からない"
  ],
  "revision_year": 2026,
  "sources": [
    {
      "url": "https://www.cfa.go.jp/policies/boshihoken/junyuu",
      "title": "授乳や離乳について",
      "org": "こども家庭庁",
      "accessed": "2026-07-21",
      "verify": {
        "expect": ["授乳・離乳の支援ガイド"]
      }
    }
  ],
  "facts": [
    {
      "key": "junyu.shinsei_ml_per_kg",
      "value": 150,
      "unit": "ml",
      "seido_ref": "junyu-milk-ryo.json#newborn.mlPerKgPerDay",
      "status": "verified"
    },
    {
      "key": "junyu.shinsei_kaisuu",
      "value": 8,
      "unit": "回",
      "seido_ref": "junyu-milk-ryo.json#newborn.timesPerDay",
      "status": "verified"
    },
    {
      "key": "junyu.taijuu_kani_min",
      "value": 1,
      "unit": "kg",
      "seido_ref": "junyu-milk-ryo.json#weightValidRangeKg.min",
      "status": "verified"
    },
    {
      "key": "junyu.taijuu_kani_max",
      "value": 20,
      "unit": "kg",
      "seido_ref": "junyu-milk-ryo.json#weightValidRangeKg.max",
      "status": "verified"
    },
    {
      "key": "junyu.1kagetsu_kairyou_min",
      "value": 120,
      "unit": "ml",
      "seido_ref": "junyu-milk-ryo.json#byAgeMonth[monthsCovered=1].perFeedMl.min",
      "status": "verified"
    },
    {
      "key": "junyu.1kagetsu_kairyou_max",
      "value": 160,
      "unit": "ml",
      "seido_ref": "junyu-milk-ryo.json#byAgeMonth[monthsCovered=1].perFeedMl.max",
      "status": "verified"
    },
    {
      "key": "junyu.1kagetsu_nichiryou_min",
      "value": 720,
      "unit": "ml",
      "seido_ref": "junyu-milk-ryo.json#byAgeMonth[monthsCovered=1].dailyMl.min",
      "status": "verified"
    },
    {
      "key": "junyu.1kagetsu_nichiryou_max",
      "value": 960,
      "unit": "ml",
      "seido_ref": "junyu-milk-ryo.json#byAgeMonth[monthsCovered=1].dailyMl.max",
      "status": "verified"
    }
  ],
  "last_updated": "2026-07-17",
  "next_check_due": "2027-01-01",
  "audience": {
    "universal": false,
    "lifeStages": [
      "newborn",
      "infant"
    ],
    "lifeEvents": [
      "parenting"
    ],
    "childAgeBands": [
      "age0_1"
    ],
    "gender": null
  }
}
---

# 授乳・ミルク量の目安はこう決まる — 月齢・体重別ツールの結果の読み方

## この記事はどのツールと対応している？

このツールは、赤ちゃんの月齢・体重・栄養方法（母乳／ミルク／混合）から、授乳・ミルク量とその回数の一般的な目安を計算します。入力できる体重は1kgから20kgの範囲です。

## 計算の考え方

新生児期（生まれて間もない時期）は、体重をもとにした計算式を使います。体重(kg)に150mlを掛けた量がその日の哺乳量の目安で、これを8回に分けます。体重1kgあたり120ml〜160mlの範囲で紹介されることが多く、本ツールは目安として150を採用したうえで、この幅も結果画面にあわせて表示します。

新生児期を過ぎると、月齢帯ごとの参照表から該当する行を取得する方式に切り替わります。ある月齢帯の例では、120ml〜160mlを目安に、合計720ml〜960mlが目安になります。月齢が進むにつれて、その都度の量は増え、回数は少なくなっていきます。

母乳のみの場合は、正確な哺乳量を測定できないため、ml換算の目標値はあえて表示せず、回数の目安と「欲しがるサインに応じて授乳する」という考え方を表示します。混合栄養の場合は、ミルクを足す場合の合計目安として表示し、母乳を飲んだ分は差し引いて調整する考え方を注記します。

## 結果の読み方

結果画面の数値は「前後」「目安幅」という表現で示しており、これを下回った・上回ったからといって問題があるとは限りません。赤ちゃんの機嫌・体重の増え方・おしっこやうんちの様子を見ながら調整するのが基本の考え方です。離乳食が中心になる時期に入ると、本ツールの対象月齢を超えたことを案内し、離乳食の量・固さ早見ツールへの導線を表示します。

## よくある疑問

- **母乳が足りているか心配。** 母乳の量そのものは正確には測れません。心配な場合は乳幼児健診や母乳外来でご相談ください。
- **低出生体重児でも同じ計算でいい？** 計算自体は行いますが、低出生体重児や医療的なフォローが必要なお子さまは、医師・助産師・保健師の指示を優先してください。

## 出典・根拠

- こども家庭庁「授乳・離乳の支援ガイド」（「赤ちゃんの様子を見ながら授乳する」という基本的な考え方の根拠）

---

最終更新日: 2026-07-17 ／ 準拠年度: 2026年度 ／ 出典: 上記「出典・根拠」参照

※本記事は一次情報をもとにした情報整理です。個人差があります。心配な場合や体重の増えが気になる場合は、医師・助産師・保健師にご相談ください。
