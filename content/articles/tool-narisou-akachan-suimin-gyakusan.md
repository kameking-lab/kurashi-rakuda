---
{
  "id": "tool-narisou-akachan-suimin-gyakusan",
  "title": "赤ちゃんの睡眠時間の目安と、親の就寝時刻はこう逆算する — 赤ちゃん連動 睡眠逆算ツールの結果の読み方",
  "summary": "赤ちゃん・お子さまの年齢区分と就寝・起床予定時刻を入力すると、厚生労働省「健康づくりのための睡眠ガイド2023」の年齢別推奨睡眠時間を参考にしつつ、保護者自身が必要な睡眠時間を確保するための就寝時刻の目安を逆算する赤ちゃん連動 睡眠逆算ツールの考え方と、結果の読み方を解説する。",
  "type": "tool-narisou",
  "category": "健康・美容",
  "tool_ref": "akachan-suimin-gyakusan",
  "persona": "ペルソナ1: 佐藤美咲（32歳・専業主婦・子ども2人＝4歳/1歳）",
  "solves": [
    "赤ちゃんのお世話をしながら、自分は何時に寝ればいいか分からない",
    "赤ちゃんの睡眠時間が年齢の目安と比べてどうなのか知りたい",
    "夜泣き対応や寝かしつけの時間を考えると実際に眠れる時間がどれくらいか分からない",
    "自分の睡眠時間が足りているのか、厚労省のガイドを踏まえて確認したい"
  ],
  "revision_year": 2026,
  "sources": [
    {
      "url": "https://www.mhlw.go.jp/content/001305530.pdf",
      "title": "健康づくりのための睡眠ガイド2023",
      "org": "厚生労働省",
      "accessed": "2026-07-18"
    },
    {
      "url": "https://www.mhlw.go.jp/content/001288006.pdf",
      "title": "こどものための Good Sleep ぐっすり（睡眠ガイド2023 こども版の要約リーフレット）",
      "org": "厚生労働省",
      "accessed": "2026-07-18"
    }
  ],
  "facts": [
    {
      "key": "akachan_suimin.toddler_age_from",
      "value": 1,
      "unit": "歳",
      "status": "verified",
      "seido_ref": "suimin-guide-2023.json#childRecommendations.categories[code=TODDLER_1_2].ageFromYears"
    },
    {
      "key": "akachan_suimin.toddler_age_to",
      "value": 2,
      "unit": "歳",
      "status": "verified",
      "seido_ref": "suimin-guide-2023.json#childRecommendations.categories[code=TODDLER_1_2].ageToYears"
    },
    {
      "key": "akachan_suimin.toddler_hours_from",
      "value": 11,
      "unit": "時間",
      "status": "verified",
      "seido_ref": "suimin-guide-2023.json#childRecommendations.categories[code=TODDLER_1_2].hoursFrom"
    },
    {
      "key": "akachan_suimin.toddler_hours_to",
      "value": 14,
      "unit": "時間",
      "status": "verified",
      "seido_ref": "suimin-guide-2023.json#childRecommendations.categories[code=TODDLER_1_2].hoursTo"
    },
    {
      "key": "akachan_suimin.preschool_age_from",
      "value": 3,
      "unit": "歳",
      "status": "verified",
      "seido_ref": "suimin-guide-2023.json#childRecommendations.categories[code=PRESCHOOL_3_5].ageFromYears"
    },
    {
      "key": "akachan_suimin.preschool_age_to",
      "value": 5,
      "unit": "歳",
      "status": "verified",
      "seido_ref": "suimin-guide-2023.json#childRecommendations.categories[code=PRESCHOOL_3_5].ageToYears"
    },
    {
      "key": "akachan_suimin.preschool_hours_from",
      "value": 10,
      "unit": "時間",
      "status": "verified",
      "seido_ref": "suimin-guide-2023.json#childRecommendations.categories[code=PRESCHOOL_3_5].hoursFrom"
    },
    {
      "key": "akachan_suimin.preschool_hours_to",
      "value": 13,
      "unit": "時間",
      "status": "verified",
      "seido_ref": "suimin-guide-2023.json#childRecommendations.categories[code=PRESCHOOL_3_5].hoursTo"
    },
    {
      "key": "akachan_suimin.elementary_age_from",
      "value": 6,
      "unit": "歳",
      "status": "verified",
      "seido_ref": "suimin-guide-2023.json#childRecommendations.categories[code=ELEMENTARY].ageFromYears"
    },
    {
      "key": "akachan_suimin.elementary_age_to",
      "value": 12,
      "unit": "歳",
      "status": "verified",
      "seido_ref": "suimin-guide-2023.json#childRecommendations.categories[code=ELEMENTARY].ageToYears"
    },
    {
      "key": "akachan_suimin.elementary_hours_from",
      "value": 9,
      "unit": "時間",
      "status": "verified",
      "seido_ref": "suimin-guide-2023.json#childRecommendations.categories[code=ELEMENTARY].hoursFrom"
    },
    {
      "key": "akachan_suimin.elementary_hours_to",
      "value": 12,
      "unit": "時間",
      "status": "verified",
      "seido_ref": "suimin-guide-2023.json#childRecommendations.categories[code=ELEMENTARY].hoursTo"
    },
    {
      "key": "akachan_suimin.junior_senior_age_from",
      "value": 13,
      "unit": "歳",
      "status": "verified",
      "seido_ref": "suimin-guide-2023.json#childRecommendations.categories[code=JUNIOR_SENIOR_HIGH].ageFromYears"
    },
    {
      "key": "akachan_suimin.junior_senior_age_to",
      "value": 18,
      "unit": "歳",
      "status": "verified",
      "seido_ref": "suimin-guide-2023.json#childRecommendations.categories[code=JUNIOR_SENIOR_HIGH].ageToYears"
    },
    {
      "key": "akachan_suimin.junior_senior_hours_from",
      "value": 8,
      "unit": "時間",
      "status": "verified",
      "seido_ref": "suimin-guide-2023.json#childRecommendations.categories[code=JUNIOR_SENIOR_HIGH].hoursFrom"
    },
    {
      "key": "akachan_suimin.junior_senior_hours_to",
      "value": 10,
      "unit": "時間",
      "status": "verified",
      "seido_ref": "suimin-guide-2023.json#childRecommendations.categories[code=JUNIOR_SENIOR_HIGH].hoursTo"
    },
    {
      "key": "akachan_suimin.adult_hours_from",
      "value": 6,
      "unit": "時間",
      "status": "verified",
      "seido_ref": "suimin-guide-2023.json#adultReference.hoursFrom"
    },
    {
      "key": "akachan_suimin.default_oya_hitsuyou_jikan",
      "value": 6,
      "unit": "時間",
      "status": "verified",
      "seido_ref": "suimin-guide-2023.json#adultReference.defaultHoursForTool"
    },
    {
      "key": "akachan_suimin.postpartum_depression_rate_from",
      "value": 10,
      "unit": "%",
      "status": "verified",
      "seido_ref": "suimin-guide-2023.json#childRecommendations.infantUnder1.qualitativeNotes[code=POSTPARTUM_DEPRESSION].postpartumDepressionRatePercent.from"
    },
    {
      "key": "akachan_suimin.postpartum_depression_rate_to",
      "value": 20,
      "unit": "%",
      "status": "verified",
      "seido_ref": "suimin-guide-2023.json#childRecommendations.infantUnder1.qualitativeNotes[code=POSTPARTUM_DEPRESSION].postpartumDepressionRatePercent.to"
    },
    {
      "key": "akachan_suimin.revision_date_day_18",
      "value": 18,
      "unit": "日",
      "status": "stub",
      "stub_reason": "本文中の『令和6年9月18日一部修正版』という一次情報の改訂日（日付の「日」）であり、data/tables/suimin-guide-2023.jsonのsources[id=mhlw-suimin-guide-2023].lastUpdatedOnSource（2024-09-18）と対応する暦日の表記。measurement値ではなく日付表記のため機械照合対象外（seido_refでの数値照合になじまない）。"
    },
    {
      "key": "akachan_suimin.day_cross_24h",
      "value": 24,
      "unit": "時間",
      "status": "stub",
      "stub_reason": "起床予定時刻が就寝予定時刻の分数以下の場合に日をまたぐとみなして加算する24時間は、1日=24時間という計算ロジック上の定数であり、外部の一次情報が主張する数値ではない（components/tools/impl/AkachanSuiminGyakusan.calc.ts の calcAkachanSuiminGyakusan / specs/b-tools/p2-t32-akachan-suimin-gyakusan.md のロジック仕様と対応）。"
    },
    {
      "key": "akachan_suimin.example_oya_hitsuyou_7jikan",
      "value": 7,
      "unit": "時間",
      "status": "stub",
      "stub_reason": "本文の計算例で使用した保護者自身の必要睡眠時間の入力値の一例であり、外部の一次情報が主張する数値ではない（specs/b-tools/p2-t32-akachan-suimin-gyakusan.md テストケース#1と対応）。"
    },
    {
      "key": "akachan_suimin.example_buffer_30fun",
      "value": 30,
      "unit": "分",
      "status": "stub",
      "stub_reason": "本文の計算例で使用した寝かしつけ・夜泣き対応等にかかる時間の入力値の一例であり、外部の一次情報が主張する数値ではない（specs/b-tools/p2-t32-akachan-suimin-gyakusan.md テストケース#1と対応）。"
    }
  ],
  "last_updated": "2026-07-18",
  "next_check_due": "2027-07-01",
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

# 赤ちゃんの睡眠時間の目安と、親の就寝時刻はこう逆算する — 赤ちゃん連動 睡眠逆算ツールの結果の読み方

## この記事はどのツールと対応している？

本記事は「赤ちゃん連動 睡眠逆算」ツール（akachan-suimin-gyakusan）に対応しています。赤ちゃん・お子さまの年齢区分と、就寝予定時刻・起床予定時刻を入力すると、厚生労働省「健康づくりのための睡眠ガイド2023」が示す年齢別の推奨睡眠時間を参考にしつつ、保護者自身が必要な睡眠時間を確保するための「保護者の就寝時刻の目安」を逆算します。寝かしつけ・夜泣き対応にかかる時間もあわせて入力できます。

## 計算の考え方

**年齢別の推奨睡眠時間**は、厚生労働省「健康づくりのための睡眠ガイド2023」のこども版が、米国睡眠医学会（American Academy of Sleep Medicine）の推奨として紹介している数値です。1歳から2歳までのお子さまは11時間から14時間、3歳から5歳までのお子さまは10時間から13時間、6歳から12歳ごろ（小学生）のお子さまは9時間から12時間、13歳から18歳ごろ（中学・高校生）のお子さまは8時間から10時間が目安とされています。

**1歳未満（乳児）については、時間数の記載がありません。** 一次情報である同ガイド本文・要約リーフレットのいずれを確認しても、1歳未満について時間数で示した推奨睡眠時間は記載されていませんでした。定量的な区分があるのは1歳からで、それより小さい年齢について時間数の目安を公表した厚生労働省の資料は見つかりませんでした。本ツールはこの限界を隠さず、1歳未満を選んだ場合は推奨レンジとの比較を行わず、次の定性的な情報のみを表示します。生まれたばかりの赤ちゃんは数時間おきに寝たり起きたりを繰り返し、授乳と夜泣きへの対応で養育者の睡眠も細切れになること。生後数週間が経過すると、徐々に夜眠る時間が延び、大人の睡眠・覚醒リズムに近づいていくこと。赤ちゃんが自分で寝返りができるようになる1歳頃までは、乳幼児突然死症候群（SIDS）の予防のために、柔らかすぎる寝具を避けて仰向けに寝かせること。そして、女性の10%から20%が産後うつを経験すると報告されており、特に著しい睡眠不足や夜間の中途覚醒が多い人はそのリスクが高くなること、です。

**保護者自身の必要睡眠時間**についても、同ガイドは成人向けに「6時間以上を目安として必要な睡眠時間を確保する」としています。本ツールは、この6時間を保護者の必要睡眠時間の入力欄の初期値として使いますが、あくまで編集可能な初期値であり、6時間が絶対的な正解というわけではありません。

**逆算の考え方**はシンプルです。保護者は赤ちゃん・お子さまの起床予定時刻に合わせて自分も起きる、という前提に立ち、「起床予定時刻 − 保護者自身の必要睡眠時間 − 寝かしつけ・夜泣き対応等にかかる時間」で、保護者の就寝時刻の目安を逆算します。就寝予定時刻から起床予定時刻までが日をまたぐ場合（たとえば夜20:00に寝かせて翌朝07:00に起きる場合など）は24時間を加算して計算するため、日をまたぐ入力でも正しく計算できます。

## 結果の読み方

たとえば、1歳から2歳までのお子さま（年齢区分「1〜2歳」）について、就寝予定時刻を20:00、起床予定時刻を07:00、保護者自身の必要睡眠時間を7時間、寝かしつけ・夜泣き対応等にかかる時間を30分と入力したとします。この場合、赤ちゃんの推定睡眠時間は11時間で、年齢区分の目安（11時間から14時間）のちょうど下限にあたるため「目安の範囲内です」と表示されます。保護者の就寝時刻の目安は、起床予定時刻の07:00から必要睡眠時間と寝かしつけ・夜泣き対応の時間をあわせて差し引いた23:30です。

赤ちゃん・お子さまの推定睡眠時間は、年齢区分の推奨レンジと比較して「目安より短めです」「目安の範囲内です」「目安より長めです」のいずれかで表示されます。1歳未満を選んだ場合は、この比較自体を行いません。睡眠時間には個人差があり、この範囲から外れることが直ちに問題を意味するわけではないことも、あわせて表示します。

保護者の必要睡眠時間と寝かしつけ・夜泣き対応等の時間の合計が、赤ちゃん・お子さまの就寝〜起床の時間枠を超えてしまう場合は、計算結果はそのまま表示されますが、「この時間枠では目安の睡眠時間を確保するのが難しい可能性がある」という注意書きがあわせて表示されます。エラーにはならず、就寝時刻を早める、パートナーや家族と対応を分担するなど、無理のない範囲での工夫を促す文言にとどめています。

## よくある疑問

**1歳未満の赤ちゃんの推奨睡眠時間はなぜ表示されないのですか？** 一次情報である厚生労働省「健康づくりのための睡眠ガイド2023」本文・要約リーフレットのいずれにも、1歳未満について時間数で示した推奨睡眠時間の記載がないためです。定量的な区分は1歳からで、それより小さい年齢について架空の数値を作って表示することはしません。

**日をまたぐ計算にはどう対応していますか？** 起床予定時刻の「時:分」が就寝予定時刻の「時:分」以下の場合は、翌日の起床とみなして24時間を加算して計算します。逆に起床予定時刻の方が後の場合は、同じ日の中の睡眠（昼寝のような入力）として扱います。

**保護者自身の必要睡眠時間は6時間のままでいいですか？** 6時間はあくまで入力欄の初期値です。同ガイドの成人の目安「6時間以上を目安として必要な睡眠時間を確保する」に基づいていますが、必要な睡眠時間には個人差があるため、ご自身に合わせて自由に変更できます。

**赤ちゃんの推定睡眠時間が目安より短め・長めと表示されたら心配すべきですか？** 必ずしもそうとは言えません。同ガイドも睡眠時間には個人差があるとしています。この表示は「短い・長いから問題」という断定ではなく、あくまで目安との比較です。気になることがあれば、小児科や自治体の保健師・母子保健の窓口にご相談ください。

## 出典・根拠

- 厚生労働省「健康づくりのための睡眠ガイド2023」
- 厚生労働省「こどものための Good Sleep ぐっすり」（睡眠ガイド2023 こども版の要約リーフレット）

---

最終更新日: 2026-07-18 ／ 準拠年度: 2023年度（令和6年9月18日一部修正版） ／ 出典: 上記「出典・根拠」参照

※本記事は一次情報をもとにした情報整理です。個別の状況については必ず最新の公式情報・窓口でご確認ください。睡眠時間の目安には個人差があり、季節や体調によっても変わります。赤ちゃん・お子さまの発育状況や体調について気になることがあれば、小児科や自治体の保健師・母子保健の窓口にご相談ください。夜泣き・睡眠の乱れが長く続く場合や、養育者ご自身の睡眠不足・気分の落ち込みが強い場合も、一人で抱え込まず、かかりつけ医や自治体の相談窓口を早めにご利用ください。
