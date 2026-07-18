---
{
  "id": "seido-kougaku-iryou-kaigo-gassan",
  "title": "高額医療・高額介護合算制度の対象と払い戻し額",
  "summary": "医療保険と介護保険を両方利用する世帯が対象で、1年間の自己負担合計が所得区分ごとの上限額（後期高齢者医療で19万円〜212万円）を超えると、超えた分の払い戻しを受けられる制度です。",
  "type": "seido-kaisetsu",
  "category": "介護",
  "tool_ref": null,
  "persona": "ペルソナ5: 高橋京子（52歳・パート・親の介護が視野）",
  "solves": [
    "医療費と介護費を合わせるといくらから払い戻されるか分からない",
    "親の医療保険の所得区分でどの上限額が適用されるのか知りたい",
    "申請しないと戻ってこないと聞いて何をすればよいか不安"
  ],
  "revision_year": 2026,
  "sources": [
    {
      "url": "https://laws.e-gov.go.jp/law/419CO0000000318",
      "title": "高齢者の医療の確保に関する法律施行令（平成十九年政令第三百十八号）",
      "org": "e-Gov法令検索（デジタル庁）",
      "accessed": "2026-07-17"
    },
    {
      "url": "https://www.kyoukaikenpo.or.jp/benefit/high_cost_medical_expenses/003/index.html",
      "title": "高額介護合算（限度額適用認定証・高額療養費・高額介護合算）",
      "org": "全国健康保険協会（協会けんぽ）",
      "accessed": "2026-07-17"
    },
    {
      "url": "https://www.mhlw.go.jp/content/12400000/001661792.pdf",
      "title": "（参考）高額療養費制度の見直しについて",
      "org": "厚生労働省保険局",
      "accessed": "2026-07-17"
    }
  ],
  "facts": [
    {
      "key": "gassan.kourei70plus.genekinami3",
      "value": 2120000,
      "unit": "円",
      "seido_ref": "kougaku-iryou-kaigo-gassan.json#data.brackets.kourei70plus.tiers[key=genekinami-3].limit",
      "status": "verified"
    },
    {
      "key": "gassan.kourei70plus.genekinami2",
      "value": 1410000,
      "unit": "円",
      "seido_ref": "kougaku-iryou-kaigo-gassan.json#data.brackets.kourei70plus.tiers[key=genekinami-2].limit",
      "status": "verified"
    },
    {
      "key": "gassan.kourei70plus.genekinami1",
      "value": 670000,
      "unit": "円",
      "seido_ref": "kougaku-iryou-kaigo-gassan.json#data.brackets.kourei70plus.tiers[key=genekinami-1].limit",
      "status": "verified"
    },
    {
      "key": "gassan.kourei70plus.ippan",
      "value": 560000,
      "unit": "円",
      "seido_ref": "kougaku-iryou-kaigo-gassan.json#data.brackets.kourei70plus.tiers[key=ippan].limit",
      "status": "verified"
    },
    {
      "key": "gassan.kourei70plus.teishotoku2",
      "value": 310000,
      "unit": "円",
      "seido_ref": "kougaku-iryou-kaigo-gassan.json#data.brackets.kourei70plus.tiers[key=teishotoku-2].limit",
      "status": "verified"
    },
    {
      "key": "gassan.kourei70plus.teishotoku1",
      "value": 190000,
      "unit": "円",
      "seido_ref": "kougaku-iryou-kaigo-gassan.json#data.brackets.kourei70plus.tiers[key=teishotoku-1].limit",
      "status": "verified"
    },
    {
      "key": "gassan.minimum_payment",
      "value": 501,
      "unit": "円",
      "seido_ref": "kougaku-iryou-kaigo-gassan.json#data.calculationRules.minimumPayment.value",
      "status": "verified"
    }
  ],
  "last_updated": "2026-07-17",
  "next_check_due": "2027-04-01",
  "audience": {
    "universal": false,
    "lifeStages": [
      "adult",
      "senior"
    ],
    "lifeEvents": [
      "caregiving"
    ],
    "childAgeBands": [],
    "gender": null
  }
}
---

# 高額医療・高額介護合算制度の対象と払い戻し額

## 結論

医療保険と介護保険の両方を利用している世帯は、1年間（8月から翌年7月まで）にかかった自己負担の合計が、所得区分ごとに定められた上限額を超えると、超えた分の払い戻しを受けられます。この仕組みが「高額医療・高額介護合算制度」です。高齢の親御さんが加入する後期高齢者医療の場合、上限額は所得区分によって19万円から212万円まで幅があります。医療費と介護費のどちらか一方しか自己負担がない世帯は対象になりません。

## 対象と金額

対象になるのは、同じ医療保険に加入している世帯で、医療費と介護費の両方に自己負担がある場合です。後期高齢者医療における年間の上限額（介護合算算定基準額）は次のとおりです。

- 現役並みⅢ: 212万円
- 現役並みⅡ: 141万円
- 現役並みⅠ: 67万円
- 一般: 56万円
- 低所得Ⅱ（市区町村民税非課税）: 31万円
- 低所得Ⅰ（非課税かつ所得なし）: 19万円

現役世代の方が加入する健康保険や国民健康保険には、それぞれ別の上限額表があります。上限額を超えた分は501円以上の場合に限り支給されます。なお、2026年8月から医療費の月ごとの上限額が見直されますが、この年間の合算上限額自体は変わりません。

払い戻しは自動では行われず、原則として本人からの申請が必要です。市区町村の窓口で自己負担額証明書の交付を受けたうえで、加入している医療保険者に申請する流れになります。ここでいう「世帯」は住民票上の世帯ではなく、同じ医療保険に加入している方の範囲である点にも注意してください。

## 出典・根拠

- 高齢者の医療の確保に関する法律施行令（e-Gov法令検索）
- 全国健康保険協会（協会けんぽ）「高額介護合算」
- 厚生労働省保険局「（参考）高額療養費制度の見直しについて」

---
最終更新日: 2026-07-17 ／ 準拠年度: 2026年度 ／ 出典: 上記「出典・根拠」参照

※本記事は一次情報をもとにした情報整理です。個別の状況については自治体・専門機関に確認してください。
