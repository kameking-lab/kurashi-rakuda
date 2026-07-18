---
{
  "id": "dandori-sango-tetsuzuki-todoke-jidouteate",
  "title": "産後の手続きは何をいつまでに？出生届から児童手当まで",
  "summary": "産後の手続きには、期限が短く数え方も独特なものがあります。出生届は出生日を1日目として数えて14日以内、児童手当は出生日の翌日から15日以内に申請すると出生月の翌月分から遡って受け取れます。乳幼児医療費助成は自治体ごとに内容が異なるため全国共通の金額は示せませんが、確認すべき点は共通です。実際の日数・金額・過料の有無まで具体的に把握しておくと、体調が万全でない時期でも慌てずに動けます。",
  "type": "dandori",
  "category": "妊娠・出産",
  "tool_ref": null,
  "persona": "ペルソナ4: 鈴木奈々（34歳・妊活→プレママ）",
  "solves": [
    "出生届は生後何日以内に出さないといけないのか、数え方も含めて知りたい",
    "児童手当の申請が遅れると本当にもらえる金額が減るのか不安",
    "乳幼児医療費助成は結局いくらもらえるのか分からない",
    "出生届の期限に間に合わなかったら罰せられるのか心配"
  ],
  "sources": [
    {
      "url": "https://laws.e-gov.go.jp/law/322AC0000000224",
      "title": "戸籍法（昭和二十二年法律第二百二十四号）",
      "org": "e-Gov法令検索（デジタル庁）",
      "accessed": "2026-07-17"
    },
    {
      "url": "https://www.cfa.go.jp/policies/kokoseido/jidouteate/annai/",
      "title": "児童手当制度のご案内",
      "org": "こども家庭庁",
      "accessed": "2026-07-17"
    },
    {
      "url": "https://www.cfa.go.jp/policies/kokoseido/jidouteate/faq/ippan",
      "title": "児童手当Q&A（一般）",
      "org": "こども家庭庁",
      "accessed": "2026-07-17"
    },
    {
      "url": "https://www.cfa.go.jp/policies/kokoseido/jidouteate/mottoouen",
      "title": "もっと子育て応援！児童手当（令和6年10月分からの拡充）",
      "org": "こども家庭庁",
      "accessed": "2026-07-17"
    },
    {
      "url": "https://laws.e-gov.go.jp/law/346AC0000000073",
      "title": "児童手当法（昭和四十六年法律第七十三号）",
      "org": "e-Gov法令検索（デジタル庁）",
      "accessed": "2026-07-17"
    },
    {
      "url": "https://laws.e-gov.go.jp/law/211AC0000000070",
      "title": "健康保険法（大正十一年法律第七十号）",
      "org": "e-Gov法令検索（デジタル庁）",
      "accessed": "2026-07-17"
    },
    {
      "url": "https://laws.e-gov.go.jp/law/215IO0000000243",
      "title": "健康保険法施行令（大正十五年勅令第二百四十三号）",
      "org": "e-Gov法令検索（デジタル庁）",
      "accessed": "2026-07-17"
    },
    {
      "url": "https://www.kyoukaikenpo.or.jp/benefit/childbirth/001/index.html",
      "title": "出産手当金",
      "org": "全国健康保険協会",
      "accessed": "2026-07-17"
    },
    {
      "url": "https://www.kyoukaikenpo.or.jp/benefit/childbirth/002/index.html",
      "title": "出産育児一時金",
      "org": "全国健康保険協会",
      "accessed": "2026-07-17"
    },
    {
      "url": "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/iryouhoken/shussan/index.html",
      "title": "出産育児一時金等について",
      "org": "厚生労働省",
      "accessed": "2026-07-17"
    },
    {
      "url": "https://www.cfa.go.jp/policies/boshihoken/kodomoiryouhityousa-r7",
      "title": "令和7年度「こどもに係る医療費の助成についての調査」",
      "org": "こども家庭庁",
      "accessed": "2026-07-17"
    }
  ],
  "facts": [
    {
      "key": "shussho.todokede_kigen_kokunai",
      "value": 14,
      "unit": "日",
      "seido_ref": "shussho-todoke-kigen.json#data.deadline.days",
      "status": "verified"
    },
    {
      "key": "shussho.todokede_kigen_kokugai",
      "value": 3,
      "unit": "ヶ月",
      "seido_ref": "shussho-todoke-kigen.json#data.deadline.monthsAbroad",
      "status": "verified"
    },
    {
      "key": "shussho.tesuuryou",
      "value": 0,
      "unit": "円",
      "seido_ref": "shussho-todoke-kigen.json#data.documents.fee",
      "status": "verified"
    },
    {
      "key": "shussho.karyo_jougen",
      "value": 50000,
      "unit": "円",
      "seido_ref": "shussho-todoke-kigen.json#data.lateFiling.penaltyAmount",
      "status": "verified"
    },
    {
      "key": "shussho.karyo_saikoku_go_jougen",
      "value": 100000,
      "unit": "円",
      "seido_ref": "shussho-todoke-kigen.json#data.lateFiling.penaltyAfterNoticeAmount",
      "status": "verified"
    },
    {
      "key": "jidouteate.tokurei_nissuu",
      "value": 15,
      "unit": "日",
      "seido_ref": "jido-teate.json#data.application.deadline",
      "status": "verified"
    },
    {
      "key": "jidouteate.gakugetsu_under3_dai1dai2",
      "value": 15000,
      "unit": "円",
      "seido_ref": "jido-teate.json#data.monthlyAmounts.under3.firstSecondChild",
      "status": "verified"
    },
    {
      "key": "jidouteate.gakugetsu_under3_dai3ikou",
      "value": 30000,
      "unit": "円",
      "seido_ref": "jido-teate.json#data.monthlyAmounts.under3.thirdChildOnwards",
      "status": "verified"
    },
    {
      "key": "jidouteate.shikyuu_kaisuu",
      "value": 6,
      "unit": "回",
      "seido_ref": "jido-teate.json#data.payment.timesPerYear",
      "status": "verified"
    },
    {
      "key": "jidouteate.kingaku_kubun_nenrei",
      "value": 3,
      "unit": "歳",
      "seido_ref": "jido-teate.json#data.eligibility.ageBoundaries.rateChangeAge",
      "status": "verified"
    },
    {
      "key": "jidouteate.tashi_kazoe_jougen_nenrei",
      "value": 22,
      "unit": "歳",
      "seido_ref": "jido-teate.json#data.multiChildCounting.countedSiblingUpperAge",
      "status": "verified"
    },
    {
      "key": "ichijikin.gaku",
      "value": 500000,
      "unit": "円",
      "seido_ref": "ikukyu-kyufu.json#data.shussanIkujiIchijikin.amount",
      "status": "verified"
    },
    {
      "key": "ichijikin.seikyuu_kigen_nen",
      "value": 2,
      "unit": "年",
      "seido_ref": "ikukyu-kyufu.json#data.shussanIkujiIchijikin.claimDeadline",
      "status": "verified"
    },
    {
      "key": "teatekin.sanzen_nissuu",
      "value": 42,
      "unit": "日",
      "seido_ref": "ikukyu-kyufu.json#data.shussanTeateKin.periodBeforeBirth",
      "status": "verified"
    },
    {
      "key": "teatekin.sango_nissuu",
      "value": 56,
      "unit": "日",
      "seido_ref": "ikukyu-kyufu.json#data.shussanTeateKin.periodAfterBirth",
      "status": "verified"
    }
  ],
  "last_updated": "2026-07-17",
  "next_check_due": "2027-04-01",
  "audience": {
    "universal": false,
    "lifeStages": [
      "pregnancy",
      "newborn",
      "toddler"
    ],
    "lifeEvents": [
      "pregnant",
      "parenting"
    ],
    "childAgeBands": [
      "prenatal",
      "age0_1",
      "age1_3",
      "age3_6"
    ],
    "gender": null
  }
}
---

# 産後の手続きは何をいつまでに？出生届から児童手当まで

## 全体の流れ

産後の手続きは、期限が短く数え方も独特なものと、期限に数年単位の余裕があるものが混在しています。特に急ぐべきなのは次の2つです。

- 出生届: 出生日を1日目として数えて14日以内（国外で出生した場合は3ヶ月以内）に、子の出生地・父母の本籍地・届出人の所在地のいずれかの市区町村に提出します。届出自体は無料（0円）です。
- 児童手当: 出生日の翌日から15日以内に申請すると、出生月の翌月分から遡って支給されます（15日特例）。この15日を過ぎると、原則として申請した月の翌月分からしか支給されません。

この2つの期限を意識しつつ、健康保険への加入（子の医療証発行の前提になる）、乳幼児医療費助成の確認（自治体ごとに内容が異なるため個別確認が必要）、出産育児一時金・出産手当金の手続き（加入している健康保険側の給付で、期限に数年単位の余裕がある）の順に進めると無理がありません。出生届は14日を過ぎても市区町村長は必ず受理しなければならないと定められているため、万一遅れても届出をあきらめる必要はありません。多くの手続きは母子健康手帳・印鑑・本人確認書類を一式持って窓口へ行くと二度手間になりにくいでしょう。

## ステップ別チェックリスト

### ステップ1: 出生届の提出（期限: 出生日を1日目として14日以内）
- [ ] 出生日を1日目として数えて14日以内に提出する（例: 4月1日出生なら4月14日が期限。国外で出生した場合は3ヶ月以内）
- [ ] 提出先を選ぶ（子の出生地・父母の本籍地・届出人の所在地のいずれかの市区町村役場。里帰り出産の場合は出産した病院の所在地でも提出できる）
- [ ] 出産した医療機関に出生証明書欄を記入してもらう（届書と一体になった用紙。自宅出産などでやむを得ない事情がある場合は証明書がなくても届出は可能）
- [ ] 届出義務者（父または母。嫡出でない子は母）が署名する。窓口への持参自体は代理でもよい
- [ ] 母子健康手帳・印鑑・本人確認書類を持参する
- [ ] 届出は無料（0円）。ただし戸籍謄本など後続の書類を別途取得する場合は手数料がかかる
- [ ] 14日を過ぎても市区町村長は届出を必ず受理しなければならない。焦らずまず届け出る
- [ ] 正当な理由なく期限を過ぎると5万円以下の過料、市区町村からの催告後もなお届け出ないと10万円以下の過料の対象になり得るが、いずれも前科がつく刑事罰ではない

### ステップ2: 健康保険への加入
- [ ] 家族が加入している健康保険（勤務先の健康保険または国民健康保険）に、子を扶養として加入させる手続きを行う
- [ ] 加入先（勤務先の担当窓口または市区町村の窓口）に必要書類を確認する
- [ ] 保険証の発行を待ち、乳幼児医療証の申請に備える

### ステップ3: 児童手当の申請（期限の目安: 出生日の翌日から15日以内）
- [ ] 出生日の翌日から15日以内に申請する（15日特例。この期限内なら出生月の翌月分から遡って支給される）
- [ ] 15日を過ぎて申請すると、原則として申請した月の翌月分からしか支給されない
- [ ] 月額は0〜3歳未満で第1子・第2子が15,000円、第3子以降は30,000円（3歳以上は金額区分が変わるため窓口で確認する）
- [ ] 支給は年6回（偶数月に、それぞれ前月分までの2か月分をまとめて支給）
- [ ] 「第◯子」の数え方には22歳年度末までの兄姉も算入される。大学生年代の兄や姉がいる家庭は見落としやすいので、該当しそうな場合は窓口で確認する
- [ ] マイナンバー・振込先口座・請求者の健康保険証など、自治体が指定する必要書類を準備する

### ステップ4: 乳幼児医療費助成の確認
- [ ] 乳幼児医療費助成（自治体によって「子ども医療費助成」「マル乳」など名称が異なる）は、児童手当と違って国が金額・年齢を定める全国一律の制度ではなく、市区町村が独自に実施する事業であることを理解しておく
- [ ] 対象年齢・所得制限の有無・自己負担額はお住まいの市区町村の公式サイトまたは窓口で確認する（全国共通の金額・年齢を一つに示すことはできない）
- [ ] 子の健康保険証ができ次第、速やかに申請する
- [ ] 医療証が届くまでの受診時の扱い（一旦立て替えて後日申請できるかなど）を窓口で確認する

### ステップ5: 出産育児一時金・出産手当金の確認（加入している健康保険側の手続き）
- [ ] 出産育児一時金は、産科医療補償制度に加入している医療機関での在胎週数22週以降の出産の場合、1児につき50万円が支給される（多胎の場合は児の数だけ支給される）
- [ ] 出産育児一時金の請求期限は出産日の翌日から2年以内。直接支払制度を使えば自分で請求しなくて済む場合が多いが、使わない場合は忘れずに手続きする
- [ ] 出産手当金（健康保険の被保険者本人が対象。被扶養者は対象外）は、出産前42日・出産後56日の期間のうち労務に服さなかった日数分が支給される
- [ ] 必要書類・申請方法を勤務先や加入している健康保険（協会けんぽ等）に確認する。里帰り出産の場合は郵送対応が可能か確認する

## 出典・根拠

- e-Gov法令検索（デジタル庁）「戸籍法」第43条・第46条・第49条・第51条・第52条・第137条・第138条・第140条（出生届の期限・起算日・受理・過料）
- こども家庭庁「児童手当制度のご案内」「児童手当Q&A（一般）」「もっと子育て応援！児童手当（令和6年10月分からの拡充）」（月額・支給回数・15日特例・多子加算のカウント方法）
- e-Gov法令検索（デジタル庁）「児童手当法」
- e-Gov法令検索（デジタル庁）「健康保険法」「健康保険法施行令」（出産手当金・出産育児一時金の根拠条文）
- 全国健康保険協会「出産手当金」「出産育児一時金」
- 厚生労働省「出産育児一時金等について」（請求期限）
- こども家庭庁「令和7年度『こどもに係る医療費の助成についての調査』」（乳幼児医療費助成が全国一律の国の制度ではなく市区町村の事業であることの根拠）

---
最終更新日: 2026-07-17

※本記事は一次情報をもとにした情報整理です。個別の状況については自治体・専門機関に確認してください。
