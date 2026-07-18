---
{
  "id": "tool-narisou-fuyounai-shaho-songeki",
  "title": "扶養内で働くか社保に入るか、損益分岐はどこ？",
  "type": "tool-narisou",
  "category": "仕事・キャリア",
  "tool_ref": "fuyo-kabe",
  "persona": "ペルソナ2: 田中絵里（36歳・ワーママ・時短勤務）",
  "summary": "扶養の壁を超えた直後に手取りが伸び悩む、あるいは減る「働き損」がなぜ起きるのかを、社会保険料の労使折半の仕組みと、扶養から外れた場合の国民年金保険料・国民健康保険料の負担から解説し、扶養の壁シミュレーター2026の結果の読み方を補足する。",
  "solves": [
    "扶養内に抑えるか社保に入るか、どちらが得か分からない",
    "壁を超えた直後に手取りが減る仕組みが分からない",
    "社会保険に加入すると将来の年金や保障がどう変わるか分からない",
    "扶養から外れて社会保険にも入れない場合の負担がどれくらいか分からない"
  ],
  "revision_year": 2026,
  "sources": [
    {
      "url": "https://www.nenkin.go.jp/service/kounen/hokenryo/hoshu/20150515-01.html",
      "title": "厚生年金保険の保険料",
      "org": "日本年金機構",
      "accessed": "2026-07-17"
    },
    {
      "url": "https://www.kyoukaikenpo.or.jp/lp/2026hokenryou/",
      "title": "令和8年度保険料率のお知らせ",
      "org": "全国健康保険協会",
      "accessed": "2026-07-17"
    },
    {
      "url": "https://www.mhlw.go.jp/tekiyoukakudai/jugyouin/merit/",
      "title": "社会保険加入のメリット｜社会保険適用拡大特設サイト",
      "org": "厚生労働省",
      "accessed": "2026-07-17"
    },
    {
      "url": "https://www.mhlw.go.jp/tekiyoukakudai/jugyouin/henka/",
      "title": "手取り額の変化について｜社会保険適用拡大特設サイト",
      "org": "厚生労働省",
      "accessed": "2026-07-17"
    },
    {
      "url": "https://www.mhlw.go.jp/content/001162154.pdf",
      "title": "「１３０万円の壁」でお困りの皆さまへ（リーフレット）",
      "org": "厚生労働省",
      "accessed": "2026-07-17"
    }
  ],
  "facts": [
    {
      "key": "fuyounai.kokumin_nenkin_getsugaku_en",
      "value": 17920,
      "unit": "円",
      "seido_ref": "fuyounai-shaho-songeki-bunkiten.json#data.insuranceRates.kokuminNenkinMonthly",
      "status": "verified"
    },
    {
      "key": "fuyounai.rourei_kiso_nenkin_nengaku_en",
      "value": 847200,
      "unit": "円",
      "seido_ref": "fuyounai-shaho-songeki-bunkiten.json#data.meritsOfEnrollment.roureiKisoNenkinFY2026",
      "status": "verified"
    },
    {
      "key": "fuyounai.kosei_nenkin_hokenryoritsu_roushi_percent",
      "value": 18.3,
      "unit": "%",
      "seido_ref": "fuyounai-shaho-songeki-bunkiten.json#data.insuranceRates.employeesPensionRate",
      "status": "stub",
      "stub_reason": "一次データ（日本年金機構）では小数の料率0.183として保存されており、本文では読みやすさのため100倍したパーセント表記（18.3%）で示している。値そのものは同じ一次情報を照合済みだが、表示形式の換算（×100）はfactory/config/seido-ref-map.jsonのscale機構を使わずに行っているため機械照合の対象外としている。"
    },
    {
      "key": "fuyounai.kenko_hoken_hokenryoritsu_heikin_percent",
      "value": 9.9,
      "unit": "%",
      "seido_ref": "fuyounai-shaho-songeki-bunkiten.json#data.insuranceRates.healthInsuranceRateAverage",
      "status": "stub",
      "stub_reason": "一次データ（全国健康保険協会）では小数の料率0.099として保存されており、本文では読みやすさのため100倍したパーセント表記（9.9%）で示している。値そのものは同じ一次情報を照合済みだが、表示形式の換算（×100）は機械照合の対象外としている。"
    },
    {
      "key": "fuyounai.honnin_futan_goukei_percent",
      "value": 14.1,
      "unit": "%",
      "seido_ref": "fuyounai-shaho-songeki-bunkiten.json#data.songekiStructure.cliff106.employeeBurdenRateUnder40",
      "status": "stub",
      "stub_reason": "一次データでは健康保険料率と厚生年金保険料率をそれぞれ労使折半した本人負担率の合算値（0.141）として保存されており、本文では100倍したパーセント表記（14.1%）で示している。構成する各料率は個別に照合済みの一次情報だが、合算値そのものの表示形式換算は機械照合の対象外としている。"
    }
  ],
  "last_updated": "2026-07-17",
  "next_check_due": "2027-04-01",
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

# 扶養内で働くか社保に入るか、損益分岐はどこ？

## この記事はどのツールと対応している？

本記事は「扶養の壁シミュレーター2026」（fuyo-kabe）に対応しています。ツールは年収見込みを入力すると、扶養の壁を超えたときに手取りがどう変わるかを示します。本記事は、壁を超えた直後になぜ手取りが伸び悩む、あるいは減ることがあるのかという「働き損」の仕組みを、ツールの計算の裏側として補足するものです。

## 計算の考え方

勤務先の社会保険に加入すると、給与から健康保険料と厚生年金保険料が天引きされます。どちらも会社と本人が半分ずつ負担する労使折半のため、本人負担は合わせて報酬月額のおよそ14.1%です。厚生年金保険料率は労使合計18.3%、健康保険料率は全国平均9.9%で、健康保険料率は都道府県ごとに、また年度ごとに変わります。40代・50代になると、これに介護保険料が上乗せされ、負担率はやや高くなります。

一方、扶養から外れても勤務先の社会保険に入れない場合は、国民年金保険料17,920円が定額・全額自己負担となり、これに国民健康保険料も加わります。労使折半の恩恵がないため、負担は社会保険に加入するケースより重くなりがちです。壁を超えた直後は、収入の増加分より保険料負担の増加分が大きくなり、手取りが一時的に伸び悩む、あるいは減ることがあります。

## 結果の読み方

ツールが示す手取りの変化は、あくまで目先の金額の比較です。社会保険に加入すると、保険料を負担する代わりに老齢厚生年金が上乗せされ、老齢基礎年金は40年加入で年847,200円ですが、これに加えて厚生年金が積み上がっていきます。さらに傷病手当金や出産手当金など、扶養のままでは受けられない保障も新たに得られます。目先の手取り減だけで加入の是非を判断せず、将来の年金額や保障の充実もあわせて考えることが大切です。配偶者や親の勤務先の家族手当の支給要件が変わる場合もあるため、あわせて確認してください。

## 出典・根拠

- 日本年金機構「厚生年金保険の保険料」
- 全国健康保険協会「令和8年度保険料率のお知らせ」
- 厚生労働省「社会保険加入のメリット｜社会保険適用拡大特設サイト」
- 厚生労働省「手取り額の変化について｜社会保険適用拡大特設サイト」
- 厚生労働省「『１３０万円の壁』でお困りの皆さまへ」（リーフレット）

---

最終更新日: 2026-07-17 ／ 準拠年度: 2026年度 ／ 出典: 上記「出典・根拠」参照

※本記事は一次情報をもとにした情報整理です。個別の状況については自治体・専門機関に確認してください。
