---
{
  "id": "seido-jidou-fuyou-teate",
  "title": "児童扶養手当（ひとり親家庭）はいくらもらえる？",
  "type": "seido-kaisetsu",
  "category": "お金",
  "revision_year": 2026,
  "sources": [
    {
      "url": "https://www.cfa.go.jp/assets/contents/node/basic_page/field_ref_resources/71de338f-5ed2-4c95-9848-3fd387d0b4d7/a4e6f323/20260408_policies_hitori-oya_fuyou-teate_19.pdf",
      "title": "児童扶養手当制度の概要（令和8年度予算 事業概要）",
      "org": "こども家庭庁 支援局家庭福祉課",
      "accessed": "2026-07-22",
      "verify": {
        "expect": ["全部支給（２人世帯）：１９０万円\n一部支給（２人世帯）：３８５万円"]
      }
    },
    {
      "url": "https://www.pref.osaka.lg.jp/o090135/kateishien/teate/jifu.html",
      "title": "児童扶養手当",
      "org": "大阪府（福祉部 家庭支援課）",
      "accessed": "2026-07-22",
      "verify": {
        "expect": ["支払いは年6回（奇数月）、2か月分の手当が請求者の指定した金融機関の口座に振り込まれます。"]
      }
    }
  ],
  "facts": [
    {
      "key": "jifu.zenbu_daiikko",
      "value": 48050,
      "unit": "円",
      "seido_ref": "jidou-fuyou-teate.json#data.monthlyAmounts.firstChildFull",
      "status": "verified"
    },
    {
      "key": "jifu.ichibu_daiikko_jougen",
      "value": 48040,
      "unit": "円",
      "seido_ref": "jidou-fuyou-teate.json#data.monthlyAmounts.firstChildPartialMax",
      "status": "verified"
    },
    {
      "key": "jifu.ichibu_daiikko_kagen",
      "value": 11340,
      "unit": "円",
      "seido_ref": "jidou-fuyou-teate.json#data.monthlyAmounts.firstChildPartialMin",
      "status": "verified"
    },
    {
      "key": "jifu.zenbu_kasan",
      "value": 11350,
      "unit": "円",
      "seido_ref": "jidou-fuyou-teate.json#data.monthlyAmounts.additionalChildFull",
      "status": "verified"
    },
    {
      "key": "jifu.ichibu_kasan_jougen",
      "value": 11340,
      "unit": "円",
      "seido_ref": "jidou-fuyou-teate.json#data.monthlyAmounts.additionalChildPartialMax",
      "status": "verified"
    },
    {
      "key": "jifu.ichibu_kasan_kagen",
      "value": 5680,
      "unit": "円",
      "seido_ref": "jidou-fuyou-teate.json#data.monthlyAmounts.additionalChildPartialMin",
      "status": "verified"
    },
    {
      "key": "jifu.shiharai_kaisu",
      "value": 6,
      "unit": "回",
      "seido_ref": "jidou-fuyou-teate.json#data.payment.timesPerYear",
      "status": "verified"
    },
    {
      "key": "jifu.zenbu_shotoku_meyasu_2nin",
      "value": 1900000,
      "unit": "円",
      "seido_ref": "jidou-fuyou-teate.json#data.incomeLimits.revenueBasedReference.fullPaymentTwoPersonHousehold",
      "status": "verified"
    },
    {
      "key": "jifu.ichibu_shotoku_meyasu_2nin",
      "value": 3850000,
      "unit": "円",
      "seido_ref": "jidou-fuyou-teate.json#data.incomeLimits.revenueBasedReference.partialPaymentTwoPersonHousehold",
      "status": "verified"
    }
  ],
  "last_updated": "2026-07-17",
  "next_check_due": "2027-04-01",
  "summary": "児童扶養手当は、全部支給なら第1子が月48,050円・第2子以降は一人ごとに月11,350円加算。所得に応じて一部支給ではスライド計算で減額され、一定額以上で支給停止になる。",
  "tool_ref": null,
  "persona": "ペルソナ2: 田中絵里（36歳・ワーママ・時短勤務）",
  "solves": [
    "ひとり親になったが、児童扶養手当がいくらもらえるのか分からない",
    "時短勤務で収入が下がったが、所得制限に引っかからないか心配",
    "子どもが複数いる場合、加算額がいくらになるのか知りたい",
    "養育費を受け取ると手当が減ると聞いたので、仕組みを知りたい"
  ],
  "audience": {
    "universal": false,
    "lifeStages": [
      "infant",
      "adult"
    ],
    "lifeEvents": [
      "parenting",
      "working"
    ],
    "childAgeBands": [
      "age0_1"
    ],
    "gender": null
  }
}
---

# 児童扶養手当（ひとり親家庭）はいくらもらえる？

## 結論

児童扶養手当は、ひとり親家庭等の児童を育てる家庭を対象に、所得に応じて全部支給・一部支給・支給停止の3段階で決まる手当です。全部支給の場合、第1子は月48,050円、第2子以降は一人ごとに月11,350円が加算されます。所得が上がるにつれて一部支給の額は少しずつ減り、第1子は月48,040円から月11,340円の範囲、第2子以降の加算額は月11,340円から月5,680円の範囲になります。支給は年6回、奇数月にまとめて振り込まれます。

## 対象と金額

対象になるのは、父母の離婚や死別などによりひとり親家庭等となった児童を監護する母・父・養育者です。手当額は「第1子の本体額」に「第2子以降の加算額」を足して決まり、所得区分によって次の3段階に分かれます。

- **全部支給**: 第1子は月48,050円、第2子以降は一人ごとに月11,350円を加算。
- **一部支給**: 所得額に応じてスライド計算され、第1子は月48,040円から月11,340円の範囲、第2子以降の加算額は月11,340円から月5,680円の範囲で決まります。所得が上がるほど額は少なくなります。
- **支給停止**: 所得が一部支給の限度額以上になると支給されません。

目安として、ひとり親と子どもひとりの世帯の場合、年収でおおむね190万円未満なら全部支給、385万円未満なら一部支給の対象になります。これは収入ベースの概算で、実際の判定は必要経費や養育費相当額などを差し引いた「所得額」で行われ、扶養する子どもの人数が増えるほど限度額も上がります。時短勤務などで収入が変動した年は、判定の基礎となる年（前年、1月から9月分は前々年）の所得で見られる点にも注意してください。

支給は1月・3月・5月・7月・9月・11月の年6回、それぞれ前月分・前々月分がまとめて振り込まれます。申請が遅れても遡って支給されないため、要件に該当したら早めに窓口へ相談することをおすすめします。

## 出典・根拠

- こども家庭庁 支援局家庭福祉課「児童扶養手当制度の概要（令和8年度予算 事業概要）」
- 大阪府（福祉部 家庭支援課）「児童扶養手当」

---
最終更新日: 2026-07-17 ／ 準拠年度: 2026年度 ／ 出典: 上記「出典・根拠」参照

※本記事は一次情報をもとにした情報整理です。個別の状況については自治体・専門機関に確認してください。
