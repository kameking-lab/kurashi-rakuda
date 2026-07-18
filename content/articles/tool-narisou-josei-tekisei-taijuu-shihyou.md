---
{
  "id": "tool-narisou-josei-tekisei-taijuu-shihyou",
  "title": "BMIと肥満度分類はこう決まる — 女性の適正体重・体型指標ツールの結果の読み方",
  "summary": "身長・体重（・任意で年齢）を入力すると、BMI（体格指数）を計算し、日本肥満学会の肥満度分類（低体重〜肥満4度）と、厚生労働省の年齢別「目標とするBMIの範囲」を比較表示する女性の適正体重・体型指標ツールの計算の考え方と、結果の読み方を解説する。",
  "type": "tool-narisou",
  "category": "健康・美容",
  "tool_ref": "josei-tekisei-taijuu-shihyou",
  "persona": "ペルソナ3: 山本遥（29歳・独身・総合職・一人暮らし）",
  "solves": [
    "自分のBMIがどの肥満度分類（低体重〜肥満4度）に当てはまるか分からない",
    "年齢によって『目標とするBMIの範囲』が変わることを知らなかった",
    "標準体重の計算基準（BMI22）と自分の体重の差を知りたい",
    "肥満と肥満症の違いが分からず必要以上に不安になっていた"
  ],
  "revision_year": 2026,
  "sources": [
    {
      "url": "https://kennet.mhlw.go.jp/information/information/dictionary/metabolic/ym-002.html",
      "title": "BMI",
      "org": "厚生労働省 e-ヘルスネット",
      "accessed": "2026-07-17"
    },
    {
      "url": "https://kennet.mhlw.go.jp/information/information/metabolic/m-05-009.html",
      "title": "肥満と肥満症",
      "org": "厚生労働省 e-ヘルスネット",
      "accessed": "2026-07-17"
    },
    {
      "url": "https://www.mhlw.go.jp/content/10904750/001396865.pdf",
      "title": "日本人の食事摂取基準（2025年版）の策定ポイント",
      "org": "厚生労働省",
      "accessed": "2026-07-17"
    },
    {
      "url": "https://www.jasso.or.jp/data/magazine/pdf/chart_A.pdf",
      "title": "肥満度分類（肥満症診療ガイドライン 図表 chart_A）",
      "org": "日本肥満学会",
      "accessed": "2026-07-17"
    },
    {
      "url": "https://www.cfa.go.jp/policies/boshihoken/shokuji",
      "title": "妊娠前からはじめる妊産婦のための食生活指針 解説要領",
      "org": "こども家庭庁",
      "accessed": "2026-07-17"
    }
  ],
  "facts": [
    {
      "key": "josei_tekisei.age_18",
      "value": 18,
      "unit": "歳",
      "status": "verified",
      "seido_ref": "tekisei-taijuu-kijun.json#targetBmiRange.ranges[ageFrom=18].ageFrom"
    },
    {
      "key": "josei_tekisei.age_49",
      "value": 49,
      "unit": "歳",
      "status": "verified",
      "seido_ref": "tekisei-taijuu-kijun.json#targetBmiRange.ranges[ageTo=49].ageTo"
    },
    {
      "key": "josei_tekisei.age_50",
      "value": 50,
      "unit": "歳",
      "status": "verified",
      "seido_ref": "tekisei-taijuu-kijun.json#targetBmiRange.ranges[ageFrom=50].ageFrom"
    },
    {
      "key": "josei_tekisei.age_64",
      "value": 64,
      "unit": "歳",
      "status": "verified",
      "seido_ref": "tekisei-taijuu-kijun.json#targetBmiRange.ranges[ageTo=64].ageTo"
    },
    {
      "key": "josei_tekisei.age_65",
      "value": 65,
      "unit": "歳",
      "status": "verified",
      "seido_ref": "tekisei-taijuu-kijun.json#targetBmiRange.ranges[ageFrom=65].ageFrom"
    },
    {
      "key": "josei_tekisei.age_74",
      "value": 74,
      "unit": "歳",
      "status": "verified",
      "seido_ref": "tekisei-taijuu-kijun.json#targetBmiRange.ranges[ageTo=74].ageTo"
    },
    {
      "key": "josei_tekisei.age_75",
      "value": 75,
      "unit": "歳",
      "status": "verified",
      "seido_ref": "tekisei-taijuu-kijun.json#targetBmiRange.ranges[ageFrom=75].ageFrom"
    },
    {
      "key": "josei_tekisei.pregnancy_gain_underweight_to",
      "value": 15,
      "unit": "kg",
      "status": "verified",
      "seido_ref": "tekisei-taijuu-kijun.json#pregnancyWeightGain.categories[code=UNDERWEIGHT].gainToKg"
    },
    {
      "key": "josei_tekisei.pregnancy_gain_normal_to",
      "value": 13,
      "unit": "kg",
      "status": "verified",
      "seido_ref": "tekisei-taijuu-kijun.json#pregnancyWeightGain.categories[code=NORMAL].gainToKg"
    },
    {
      "key": "josei_tekisei.pregnancy_gain_obese1_to",
      "value": 10,
      "unit": "kg",
      "status": "verified",
      "seido_ref": "tekisei-taijuu-kijun.json#pregnancyWeightGain.categories[code=OBESE_1].gainToKg"
    },
    {
      "key": "josei_tekisei.pregnancy_gain_obese2plus_to",
      "value": 5,
      "unit": "kg",
      "status": "verified",
      "seido_ref": "tekisei-taijuu-kijun.json#pregnancyWeightGain.categories[code=OBESE_2_PLUS].gainToKg"
    },
    {
      "key": "josei_tekisei.obesity_degree_1",
      "value": 1,
      "unit": "度",
      "status": "stub",
      "stub_reason": "「◯度」は肥満度分類のラベル（文字列。例:「肥満（1度）」）の一部であり、独立した数値のフィールドとしては保持されていないため自動数値照合の対象外。区分自体はdata/tables/tekisei-taijuu-kijun.jsonのobesityClassification.categories[].code（OBESE_1〜OBESE_4）とbmiFrom/bmiToで確認できる。"
    },
    {
      "key": "josei_tekisei.obesity_degree_2",
      "value": 2,
      "unit": "度",
      "status": "stub",
      "stub_reason": "同上（肥満（2度）・肥満（2度以上）のラベルの一部）。"
    },
    {
      "key": "josei_tekisei.obesity_degree_3",
      "value": 3,
      "unit": "度",
      "status": "stub",
      "stub_reason": "同上（肥満（3度）のラベルの一部）。"
    },
    {
      "key": "josei_tekisei.obesity_degree_4",
      "value": 4,
      "unit": "度",
      "status": "stub",
      "stub_reason": "同上（肥満（4度）のラベルの一部）。"
    },
    {
      "key": "josei_tekisei.underweight_bmi_upper",
      "value": 18.5,
      "unit": "",
      "status": "verified",
      "seido_ref": "tekisei-taijuu-kijun.json#obesityClassification.categories[code=UNDERWEIGHT].bmiTo"
    },
    {
      "key": "josei_tekisei.normal_bmi_upper",
      "value": 25,
      "unit": "",
      "status": "verified",
      "seido_ref": "tekisei-taijuu-kijun.json#obesityClassification.categories[code=NORMAL].bmiTo"
    },
    {
      "key": "josei_tekisei.obese1_bmi_upper",
      "value": 30,
      "unit": "",
      "status": "verified",
      "seido_ref": "tekisei-taijuu-kijun.json#obesityClassification.categories[code=OBESE_1].bmiTo"
    },
    {
      "key": "josei_tekisei.obese2_bmi_upper",
      "value": 35,
      "unit": "",
      "status": "verified",
      "seido_ref": "tekisei-taijuu-kijun.json#obesityClassification.categories[code=OBESE_2].bmiTo"
    },
    {
      "key": "josei_tekisei.obese3_bmi_upper",
      "value": 40,
      "unit": "",
      "status": "verified",
      "seido_ref": "tekisei-taijuu-kijun.json#obesityClassification.categories[code=OBESE_3].bmiTo"
    },
    {
      "key": "josei_tekisei.ideal_bmi_22",
      "value": 22,
      "unit": "",
      "status": "verified",
      "seido_ref": "tekisei-taijuu-kijun.json#bmiAndMortality.idealBmi22"
    },
    {
      "key": "josei_tekisei.target_1849_lower",
      "value": 18.5,
      "unit": "",
      "status": "verified",
      "seido_ref": "tekisei-taijuu-kijun.json#targetBmiRange.ranges[ageFrom=18].bmiFrom"
    },
    {
      "key": "josei_tekisei.target_upper_common",
      "value": 24.9,
      "unit": "",
      "status": "verified",
      "seido_ref": "tekisei-taijuu-kijun.json#targetBmiRange.ranges[ageFrom=18].bmiTo"
    },
    {
      "key": "josei_tekisei.target_5064_lower",
      "value": 20,
      "unit": "",
      "status": "verified",
      "seido_ref": "tekisei-taijuu-kijun.json#targetBmiRange.ranges[ageFrom=50].bmiFrom"
    },
    {
      "key": "josei_tekisei.target_6574_lower",
      "value": 21.5,
      "unit": "",
      "status": "verified",
      "seido_ref": "tekisei-taijuu-kijun.json#targetBmiRange.ranges[ageFrom=65].bmiFrom"
    }
  ],
  "last_updated": "2026-07-18",
  "next_check_due": "2027-04-01",
  "audience": {
    "universal": false,
    "lifeStages": [
      "adult"
    ],
    "lifeEvents": [],
    "childAgeBands": [],
    "gender": "female"
  }
}
---

# BMIと肥満度分類はこう決まる — 女性の適正体重・体型指標ツールの結果の読み方

## この記事はどのツールと対応している？

本記事は「女性の適正体重・体型指標」ツール（josei-tekisei-taijuu-shihyou）に対応しています。身長・体重を入力するとBMI（体格指数）を計算し、日本肥満学会が定める肥満度分類（低体重〜肥満4度）のどこに当てはまるかを表示します。年齢もあわせて入力すると、厚生労働省「日本人の食事摂取基準（2025年版）」が定める年齢別の「目標とするBMIの範囲」とも比較します。

このツールが表示するのは体格の指標としての分類であり、医学的な診断・体重管理の指導ではありません。減量が必要かどうか、どの程度が適切かは、必ず医師にご相談ください。

## 計算の考え方

**BMIの計算式**は、体重(kg)を身長(m)の2乗で割ったものです。身長はセンチメートルではなくメートルで計算する点に注意してください（センチメートル表記の値を100で割ってメートルに直してから2乗します）。厚生労働省 e-ヘルスネットが紹介している、体格を表す国際的な指数です。

**肥満度分類**は、日本肥満学会が定める6区分です。BMIが18.5未満は「低体重（やせ）」、18.5以上25.0未満は「普通体重」、25.0以上30.0未満は「肥満（1度）」、30.0以上35.0未満は「肥満（2度）」、35.0以上40.0未満は「肥満（3度）」、40.0以上は「肥満（4度）」に分類されます。境界の値そのもの（18.5・25.0・30.0・35.0・40.0）は、その値を下限に持つ上位側の区分に含まれます。たとえばBMIがちょうど25.0の場合は「肥満（1度）」です。日本のこの基準は、WHO（世界保健機関）が定める基準（30以上を"Obese"）とは異なる点にも注意してください。

**標準体重の計算基準（BMI22）**：身長(m)の2乗に22を掛けた値が、日本肥満学会が標準体重の計算に用いる基準です。これは「もっとも疾病の少ないBMI」を基準にした計算式であり、個人の理想体重として断定するものではありません。

**目標とするBMIの範囲（年齢を入力した場合のみ）**：厚生労働省「日本人の食事摂取基準（2025年版）」表1に基づき、年齢によって目標とする範囲が変わります。18歳から49歳までは18.5〜24.9、50歳から64歳までは20.0〜24.9、65歳から74歳までは21.5〜24.9、75歳以上も21.5〜24.9です。この範囲は「エネルギー収支バランスの維持を示す指標」として設定されたもので、肥満・やせの医学的な「判定」基準ではありません。18歳未満はこの表の対象外のため、本ツールでは目標範囲の判定自体を行いません。

**妊娠中の体重増加指導の目安（参考情報）**：現在の肥満度分類に対応する、こども家庭庁「妊娠前からはじめる妊産婦のための食生活指針 解説要領」表8の目安を、参考として1行だけ表示します。低体重（やせ）なら12〜15kg、普通体重なら10〜13kg、肥満（1度）なら7〜10kg、肥満（2度以上）は個別対応（上限5kgまでが目安）です。これは医師が妊娠中の体重増加の指導を行うときの目安であり、個人差を考慮した指導が必要とされています。妊娠週数からの目標体重の逆算など専用の計算は行いません（妊娠中の体重増加を詳しく調べたい場合は別のツールをご利用ください）。

## 結果の読み方

結果画面には、まずBMIの数値と、それに対応する肥満度分類のラベル（低体重（やせ）〜肥満（4度）のいずれか）が表示されます。次に、身長の2乗に22を掛けて計算した「標準体重の計算基準（BMI22）」が表示されますが、これはあくまで日本肥満学会が定める計算基準であり、「あなたの理想体重はこれです」という意味ではありません。

年齢を入力した場合は、その年齢区分に対応する「目標とするBMIの範囲」と、現在のBMIがその範囲の下・範囲内・範囲の上のどこに位置するかが表示されます。18歳未満を入力した場合は、この表の対象外である旨だけが表示され、範囲との比較は行われません。

画面には常に、BMIは体格を表す指標のひとつであり、筋肉量・体脂肪の分布・年齢によって同じBMIでも健康リスクは異なること、基準の範囲から外れていることが直ちに病気を意味するわけではないこと、肥満（BMIが25以上）だけでは治療の対象にはならず、治療が必要な「肥満症」とは区別されることを案内するメッセージが表示されます。「痩せましょう」「太りすぎです」といった指導や煽る表現は一切行いません。

## よくある疑問

**肥満とダイエットが必要な「肥満症」は同じ意味ですか？** いいえ、別物です。肥満とは体格指数（BMI）が25以上の状態を指す言葉で、それだけでは治療の対象にはなりません。肥満に起因・関連する健康障害を合併するか、その合併が予測される場合にはじめて「肥満症」と呼ばれ、治療の対象になります。

**標準体重（BMI22基準）を目指すべきですか？** 必ずしもそうとは言えません。厚生労働省の資料では、日本人の観察研究でBMIと総死亡との関連はU字型であり、BMIが25前後（21〜27）の人が死亡リスクが低いことが知られているとされています。BMI22はあくまで「もっとも疾病の少ないBMIを基準にした標準体重の計算式」であり、個人の理想値として断定的に示すものではありません。

**年齢を入れないとどうなりますか？** BMIと肥満度分類だけが表示され、「目標とするBMIの範囲」との比較は表示されません。年齢は任意入力です。

**妊娠中の体重管理はこのツールで計算できますか？** できません。本ツールは妊娠中の体重増加指導の目安を参考情報として1行表示するだけで、妊娠週数に応じた専用の計算は行いません。詳しく知りたい場合は、妊娠中の体重増加を扱う別のツールをご利用ください。

## 出典・根拠

- 厚生労働省 e-ヘルスネット「BMI」
- 厚生労働省 e-ヘルスネット「肥満と肥満症」
- 厚生労働省「日本人の食事摂取基準（2025年版）の策定ポイント」
- 日本肥満学会「肥満度分類」（肥満症診療ガイドライン 図表 chart_A）
- こども家庭庁「妊娠前からはじめる妊産婦のための食生活指針 解説要領」

---

最終更新日: 2026-07-18 ／ 準拠年度: 2026年度 ／ 出典: 上記「出典・根拠」参照

※本記事は一次情報をもとにした情報整理です。個別の状況については必ず最新の公式情報・窓口でご確認ください。BMIは体格を表す指標のひとつであり、直ちに健康状態を診断するものではありません。減量が必要かどうか、どの程度が適切かは必ず医師にご相談ください。
