---
{
  "id": "seido-kaigo-hoken-futan-wariai-shotoku",
  "title": "介護保険の自己負担割合は所得でどう決まる？",
  "summary": "介護保険サービスの利用者負担は原則1割。合計所得金額と年金収入等の2つの基準をどちらも満たすと2割、さらに高い基準を満たすと3割になる。",
  "type": "seido-kaisetsu",
  "category": "介護",
  "tool_ref": "kaigo-jikofutan",
  "persona": "ペルソナ5: 高橋京子（52歳・パート・親の介護が視野）",
  "solves": [
    "介護保険の自己負担割合がなぜ2割・3割になるのか分からない",
    "介護サービスの自己負担が月いくらか分からない"
  ],
  "revision_year": 2026,
  "sources": [
    {
      "url": "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/hukushi_kaigo/kaigo_koureisha/gaiyo/index.html",
      "title": "介護保険制度の概要",
      "org": "厚生労働省",
      "accessed": "2026-07-17"
    }
  ],
  "facts": [
    {
      "key": "kaigo.futan_gensoku",
      "value": 1,
      "unit": "割",
      "seido_ref": "kaigo-hoken.json#data.futanWariai.gensoku.value",
      "status": "verified"
    },
    {
      "key": "kaigo.futan_niwari",
      "value": 2,
      "unit": "割",
      "seido_ref": "kaigo-hoken.json#data.futanWariai.niwari.value",
      "status": "verified"
    },
    {
      "key": "kaigo.futan_sanwari",
      "value": 3,
      "unit": "割",
      "seido_ref": "kaigo-hoken.json#data.futanWariai.sanwari.value",
      "status": "verified"
    },
    {
      "key": "kaigo.niwari_shotoku",
      "value": 1600000,
      "unit": "円",
      "seido_ref": "kaigo-hoken.json#data.futanWariai.brackets.1.totalIncomeMin",
      "status": "verified"
    },
    {
      "key": "kaigo.niwari_nenkin_tanshin",
      "value": 2800000,
      "unit": "円",
      "seido_ref": "kaigo-hoken.json#data.futanWariai.brackets.1.pensionPlusOtherIncomeMinSingle",
      "status": "verified"
    },
    {
      "key": "kaigo.niwari_nenkin_fuufu",
      "value": 3460000,
      "unit": "円",
      "seido_ref": "kaigo-hoken.json#data.futanWariai.brackets.1.pensionPlusOtherIncomeMinCouple",
      "status": "verified"
    },
    {
      "key": "kaigo.sanwari_shotoku",
      "value": 2200000,
      "unit": "円",
      "seido_ref": "kaigo-hoken.json#data.futanWariai.brackets.0.totalIncomeMin",
      "status": "verified"
    },
    {
      "key": "kaigo.sanwari_nenkin_tanshin",
      "value": 3400000,
      "unit": "円",
      "seido_ref": "kaigo-hoken.json#data.futanWariai.brackets.0.pensionPlusOtherIncomeMinSingle",
      "status": "verified"
    },
    {
      "key": "kaigo.sanwari_nenkin_fuufu",
      "value": 4630000,
      "unit": "円",
      "seido_ref": "kaigo-hoken.json#data.futanWariai.brackets.0.pensionPlusOtherIncomeMinCouple",
      "status": "verified"
    }
  ],
  "last_updated": "2026-07-17",
  "next_check_due": "2026-10-01"
}
---

# 介護保険の自己負担割合は所得でどう決まる？

## 結論

介護保険サービスの利用者負担は原則1割です。本人の所得が一定額以上だと2割、さらに所得が高いと3割になります。判定は「合計所得金額」と「年金収入＋その他の合計所得金額」の2つの基準を両方満たすかどうかで決まります。

## 対象と金額

- **1割負担**: 下記の2割・3割の基準に該当しない場合の標準的な負担割合です。現役世代で医療保険に加入している第2号被保険者は、所得にかかわらず一律1割です。
- **2割負担**: 第1号被保険者のうち、合計所得金額が160万円以上、かつ「年金収入＋その他の合計所得金額」が単身世帯で280万円以上・夫婦世帯で346万円以上の場合。
- **3割負担**: 第1号被保険者のうち、合計所得金額が220万円以上、かつ「年金収入＋その他の合計所得金額」が単身世帯で340万円以上・夫婦世帯で463万円以上の場合。

2つの基準は「かつ」の関係にあります。合計所得金額の基準だけを満たしていても、年金収入＋その他の合計所得金額の基準を満たしていなければ1割のままです。

## よくある疑問

- **自分がどの割合か確認する方法は？** 市区町村から交付される「介護保険負担割合証」に記載されています。判定は毎年行われるため、年度によって割合が変わることがあります。
- **現役世代（第2号被保険者）も所得で割合が変わる？** 変わりません。第2号被保険者は所得にかかわらず一律1割です。
- **1割・2割・3割以外の負担はある？** 高額介護サービス費制度など、自己負担が一定額を超えた場合に払い戻される仕組みも別途あります。
- **実際に月いくらになるか知りたい** 自己負担割合が分かったうえで、要介護度ごとの月額目安を知りたい場合は「[介護保険 自己負担シミュレーター](/tools/care/kaigo-jikofutan)」で概算できます。

## 出典・根拠

- 厚生労働省「介護保険制度の概要」

---

最終更新日: 2026-07-17 ／ 準拠年度: 2026年度 ／ 出典: 上記「出典・根拠」参照

※本記事は一次情報をもとにした情報整理です。制度の適用にあたっては、必ず最新の公式情報・窓口でご確認ください。
