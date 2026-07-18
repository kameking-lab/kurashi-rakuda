---
{
  "id": "tool-narisou-ninshin-taiju-zoka-checker",
  "title": "妊娠中の体重増加の目安はこう決まる — 妊娠中の体重増加チェッカーの結果の読み方",
  "summary": "妊娠前の身長・体重（→妊娠前BMI）と現在の体重を入力すると、妊娠前の体格区分に応じた体重増加指導の目安（こども家庭庁 表8）と現在の増加量を比較する妊娠中の体重増加チェッカーの計算の考え方と、結果の読み方を解説する。",
  "type": "tool-narisou",
  "category": "妊娠・出産",
  "tool_ref": "ninshin-taiju-zoka-checker",
  "persona": "ペルソナ4: 鈴木奈々（34歳・妊活1年目→プレママ）",
  "solves": [
    "妊娠前の体格から見た体重増加の目安が分からない",
    "今の増加量が目安の範囲に収まっているか知りたい",
    "肥満2度以上の場合に一律の目安がないことを知らなかった",
    "多胎の場合の目安値があるのか分からなかった"
  ],
  "revision_year": 2026,
  "sources": [
    {
      "url": "https://www.cfa.go.jp/assets/contents/node/basic_page/field_ref_resources/a29a9bee-4d29-482d-a63b-5f9cb8ea0aa2/aaaf2a82/20230401_policies_boshihoken_shokuji_02.pdf",
      "title": "妊娠前からはじめる妊産婦のための食生活指針 解説要領（表8）",
      "org": "こども家庭庁",
      "accessed": "2026-07-17"
    },
    {
      "url": "https://kennet.mhlw.go.jp/information/information/dictionary/metabolic/ym-002.html",
      "title": "BMI",
      "org": "厚生労働省 e-ヘルスネット",
      "accessed": "2026-07-17"
    }
  ],
  "facts": [
    {
      "key": "ninshin_taiju.underweight_bmi_upper",
      "value": 18.5,
      "unit": "",
      "status": "verified",
      "seido_ref": "tekisei-taijuu-kijun.json#pregnancyWeightGain.categories[code=UNDERWEIGHT].bmiTo"
    },
    {
      "key": "ninshin_taiju.normal_bmi_upper",
      "value": 25,
      "unit": "",
      "status": "verified",
      "seido_ref": "tekisei-taijuu-kijun.json#pregnancyWeightGain.categories[code=NORMAL].bmiTo"
    },
    {
      "key": "ninshin_taiju.obese1_bmi_upper",
      "value": 30,
      "unit": "",
      "status": "verified",
      "seido_ref": "tekisei-taijuu-kijun.json#pregnancyWeightGain.categories[code=OBESE_1].bmiTo"
    },
    {
      "key": "ninshin_taiju.obese2plus_bmi_from",
      "value": 30,
      "unit": "",
      "status": "verified",
      "seido_ref": "tekisei-taijuu-kijun.json#pregnancyWeightGain.categories[code=OBESE_2_PLUS].bmiFrom"
    },
    {
      "key": "ninshin_taiju.gain_underweight_from",
      "value": 12,
      "unit": "kg",
      "status": "verified",
      "seido_ref": "tekisei-taijuu-kijun.json#pregnancyWeightGain.categories[code=UNDERWEIGHT].gainFromKg"
    },
    {
      "key": "ninshin_taiju.gain_underweight_to",
      "value": 15,
      "unit": "kg",
      "status": "verified",
      "seido_ref": "tekisei-taijuu-kijun.json#pregnancyWeightGain.categories[code=UNDERWEIGHT].gainToKg"
    },
    {
      "key": "ninshin_taiju.gain_normal_from",
      "value": 10,
      "unit": "kg",
      "status": "verified",
      "seido_ref": "tekisei-taijuu-kijun.json#pregnancyWeightGain.categories[code=NORMAL].gainFromKg"
    },
    {
      "key": "ninshin_taiju.gain_normal_to",
      "value": 13,
      "unit": "kg",
      "status": "verified",
      "seido_ref": "tekisei-taijuu-kijun.json#pregnancyWeightGain.categories[code=NORMAL].gainToKg"
    },
    {
      "key": "ninshin_taiju.gain_obese1_from",
      "value": 7,
      "unit": "kg",
      "status": "verified",
      "seido_ref": "tekisei-taijuu-kijun.json#pregnancyWeightGain.categories[code=OBESE_1].gainFromKg"
    },
    {
      "key": "ninshin_taiju.gain_obese1_to",
      "value": 10,
      "unit": "kg",
      "status": "verified",
      "seido_ref": "tekisei-taijuu-kijun.json#pregnancyWeightGain.categories[code=OBESE_1].gainToKg"
    },
    {
      "key": "ninshin_taiju.gain_obese2plus_to",
      "value": 5,
      "unit": "kg",
      "status": "verified",
      "seido_ref": "tekisei-taijuu-kijun.json#pregnancyWeightGain.categories[code=OBESE_2_PLUS].gainToKg"
    },
    {
      "key": "ninshin_taiju.macrosomia_threshold_g",
      "value": 4000,
      "unit": "g",
      "status": "verified",
      "seido_ref": "tekisei-taijuu-kijun.json#pregnancyWeightGain.macrosomiaThresholdG"
    },
    {
      "key": "ninshin_taiju.obesity_degree_1",
      "value": 1,
      "unit": "度",
      "status": "stub",
      "stub_reason": "「◯度」は肥満度分類のラベル（文字列。例:「肥満（1度）」）の一部であり、独立した数値のフィールドとしては保持されていないため自動数値照合の対象外。区分自体はdata/tables/tekisei-taijuu-kijun.jsonのpregnancyWeightGain.categories[].codeとbmiFrom/bmiToで確認できる。"
    },
    {
      "key": "ninshin_taiju.obesity_degree_2",
      "value": 2,
      "unit": "度",
      "status": "stub",
      "stub_reason": "同上（肥満（2度以上）のラベルの一部）。"
    }
  ],
  "last_updated": "2026-07-18",
  "next_check_due": "2027-04-01",
  "audience": {
    "universal": false,
    "lifeStages": [
      "pregnancy"
    ],
    "lifeEvents": [
      "pregnant"
    ],
    "childAgeBands": [
      "prenatal"
    ],
    "gender": "female"
  }
}
---

# 妊娠中の体重増加の目安はこう決まる — 妊娠中の体重増加チェッカーの結果の読み方

## この記事はどのツールと対応している？

本記事は「妊娠中の体重増加チェッカー」ツール（ninshin-taiju-zoka-checker）に対応しています。妊娠前の身長・体重を入力すると妊娠前BMIを計算し、こども家庭庁「妊娠前からはじめる妊産婦のための食生活指針 解説要領」表8が示す体重増加指導の目安と照合します。さらに現在の体重を入力すると、現在の増加量（現在の体重−妊娠前の体重）がその目安の範囲に対してどの位置にあるかを表示します。

このツールが表示するのは、あくまで医師が体重増加の指導を行うときの目安であり、医学的な診断や体重管理の指導そのものではありません。体重管理が必要かどうか、どの程度が適切かは、必ず担当の産科医にご相談ください。

## 計算の考え方

**妊娠前BMIの計算式**は、妊娠前の体重(kg)を妊娠前の身長(m)の2乗で割ったものです。身長はセンチメートルではなくメートルで計算する点に注意してください。厚生労働省 e-ヘルスネットが紹介している、体格を表す国際的な指数と同じ式です。

**体重増加指導の目安（表8・4区分）**は、こども家庭庁の資料が日本産科婦人科学会の目安として掲載しているもので、日本肥満学会の肥満度分類に準じた妊娠前BMIの4区分ごとに定められています。妊娠前BMIが18.5未満の「低体重（やせ）」は12kg〜15kgが目安です。18.5以上25.0未満の「普通体重」は10kg〜13kgが目安で、この中でも低体重に近いBMIの方は目安の上限側（13kg）を参考にするとされています。25.0以上30.0未満の「肥満（1度）」は7kg〜10kgが目安です。境界の値そのもの（18.5・25.0・30.0）は、その値を下限に持つ上位側の区分に含まれます。たとえば妊娠前BMIがちょうど25.0の場合は「肥満（1度）」です。

**肥満（2度以上・妊娠前BMIが30.0以上）は個別対応です**。こども家庭庁の資料では、この区分の体重増加量は数値のレンジではなく「個別対応」（上限5kgまでが目安）とされています。数値のレンジが存在しないため、本ツールはこの区分について自動計算した目安・比較結果を一切表示しません。現在の増加量（現在の体重−妊娠前の体重）の実測値のみを提示したうえで、担当の産科医への相談を案内します。

**現在の増加量との比較**は、現在の増加量(kg) = 現在の体重(kg) − 妊娠前の体重(kg)を、上記の目安レンジと比較して行います。目安の範囲より少ない・範囲内・範囲より多い、というシンプルな事実を提示するだけで、「食べ過ぎです」「もっと増やしてください」といった指導・断定は一切行いません。

**なぜ増加量にレンジがあるのか**：体重増加が不足すると早産のリスクや赤ちゃんが在胎週数に対して小さく産まれるリスクが高まり、逆に体重増加が過剰だと巨大児（出生体重が4000gを超える場合）のリスクや赤ちゃんが在胎週数に対して大きく産まれるリスクが高まるとされています。ただし、こども家庭庁が掲載する産婦人科診療ガイドライン産科編2020 CQ 010は「増加量を厳格に指導する根拠は必ずしも十分ではないと認識し、個人差を考慮したゆるやかな指導を心がける」とも述べており、本ツールはこの立場に基づいて結果を提示します。

## 結果の読み方

結果画面には、まず妊娠前BMIの数値と、それに対応する体格区分のラベル（低体重（やせ）・普通体重・肥満（1度）・肥満（2度以上）のいずれか）が表示されます。

低体重・普通体重・肥満（1度）の場合は、その区分の体重増加指導の目安と、現在の増加量が「目安の範囲より少なめ」「目安の範囲内」「目安の範囲より多め」のいずれに当たるかが表示されます。普通体重の場合は、低体重に近いBMIの方向けの上限側参考情報もあわせて表示されます。

肥満（2度以上）の場合は、目安の数値レンジを表示せず、現在の増加量の実測値のみを提示したうえで「体重増加の目安は個別対応となっており、担当の産科医にご相談ください」という案内を表示します。増加量がマイナス（つわり等で妊娠前より体重が減っている場合を含む）になっても、エラー扱いにはせず、そのまま数値として表示します。

画面には常に、この目安が「おなかの赤ちゃんが一人の場合」の数値であることを明示するメッセージが表示されます。多胎（双子など)の場合の具体的な目安値は一次情報に示されていないため、本ツールでは扱っていません。あわせて、増加量を厳格に指導する根拠は必ずしも十分ではなく個人差を考慮した指導が必要である旨の注記も常時表示されます。

## よくある疑問

**双子など多胎の場合の目安を知りたいのですが、使えますか？** このツールでは扱えません。こども家庭庁の資料には「多胎の場合はそれぞれの体格区分の体重増加よりも多く増加することがみられる」という記述はありますが、具体的な数値の目安は示されていません。本ツールは架空の数値を作らない方針のため、多胎向けの入力欄自体を設けていません。

**肥満（2度以上）に当てはまると表示されたら、どうすればいいですか？** 本ツールでは数値の目安を示せません。こども家庭庁の資料でもこの区分は「個別対応」とされているためです。体重管理の方針は、必ず担当の産科医にご相談ください。

**今の増加量が目安の範囲を超えていました。食事を減らすべきですか？** このツールは「目安の範囲より多め」という事実を示すだけで、食事量や運動についての指導は一切行いません。増加量を厳格に指導する根拠は必ずしも十分ではないとされており、個人差を考慮した判断が必要です。気になる場合は自己判断で調整せず、健診の際に担当の産科医にご相談ください。

**「女性の適正体重・体型指標」ツールとは何が違いますか？** 「女性の適正体重・体型指標」は、現在の身長・体重からBMIと肥満度分類（低体重から肥満の各区分）を判定し、年齢別の「目標とするBMIの範囲」とも比較する、妊娠を前提としない一般向けのツールです。妊娠中の体重増加の目安については参考情報を1行示すだけで、専用の計算は行いません。妊娠前の体格から見た体重増加の目安と現在の増加量を詳しく比較したい場合は、本ツール（妊娠中の体重増加チェッカー）をご利用ください。

## 出典・根拠

- こども家庭庁「妊娠前からはじめる妊産婦のための食生活指針 解説要領」（表8）
- 厚生労働省 e-ヘルスネット「BMI」

---

最終更新日: 2026-07-18 ／ 準拠年度: 2026年度 ／ 出典: 上記「出典・根拠」参照

※本記事は一次情報をもとにした情報整理です。個別の状況については必ず最新の公式情報・窓口でご確認ください。妊娠中の体重増加の目安は医師が指導を行うときの目安であり、個人差を考慮した指導が必要です。体重管理が必要かどうか、どの程度が適切かは必ず担当の産科医にご相談ください。
