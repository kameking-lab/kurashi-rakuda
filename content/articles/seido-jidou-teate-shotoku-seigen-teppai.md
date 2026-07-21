---
{
  "id": "seido-jidou-teate-shotoku-seigen-teppai",
  "title": "児童手当は2026年度いくら？所得制限撤廃後の支給額",
  "summary": "2026年度の児童手当は0〜3歳未満が月15,000円、3歳〜高校生年代が月10,000円、第3子以降はどちらも月30,000円。2024年10月の改正で所得制限は撤廃済み。",
  "type": "seido-kaisetsu",
  "category": "子育て",
  "tool_ref": "jido-teate",
  "persona": "ペルソナ2: 田中絵里（36歳・ワーママ・時短勤務）",
  "solves": [
    "児童手当がいくらもらえるか分からない",
    "児童手当の所得制限がどうなったか分からない",
    "児童手当がいつ振り込まれるか分からない"
  ],
  "revision_year": 2026,
  "sources": [
    {
      "url": "https://www.cfa.go.jp/policies/kokoseido/jidouteate/annai/",
      "title": "児童手当制度のご案内",
      "org": "こども家庭庁",
      "accessed": "2026-07-21",
      "verify": {
        "expect": ["3歳未満　15,000円（第3子以降は30,000円）"]
      }
    },
    {
      "url": "https://www.cfa.go.jp/policies/kokoseido/jidouteate/mottoouen",
      "title": "もっと子育て応援！児童手当（令和6年10月分からの拡充）",
      "org": "こども家庭庁",
      "accessed": "2026-07-21",
      "verify": {
        "expect": ["令和6年10月分から児童手当が支給されます"]
      }
    }
  ],
  "facts": [
    {
      "key": "jido_teate.under3_1_2",
      "value": 15000,
      "unit": "円",
      "seido_ref": "jido-teate.json#data.monthlyAmounts.under3.firstSecondChild.value",
      "status": "verified"
    },
    {
      "key": "jido_teate.dai3ji",
      "value": 30000,
      "unit": "円",
      "seido_ref": "jido-teate.json#data.monthlyAmounts.under3.thirdChildOnwards.value",
      "status": "verified"
    },
    {
      "key": "jido_teate.age3_koukou_1_2",
      "value": 10000,
      "unit": "円",
      "seido_ref": "jido-teate.json#data.monthlyAmounts.age3ToHighSchool.firstSecondChild.value",
      "status": "verified"
    },
    {
      "key": "jido_teate.age_0",
      "value": 0,
      "unit": "歳",
      "seido_ref": "jido-teate.json#data.eligibility.ageBoundaries.fromAge.value",
      "status": "verified"
    },
    {
      "key": "jido_teate.age_3",
      "value": 3,
      "unit": "歳",
      "seido_ref": "jido-teate.json#data.eligibility.ageBoundaries.rateChangeAge.value",
      "status": "verified"
    },
    {
      "key": "jido_teate.age_18",
      "value": 18,
      "unit": "歳",
      "seido_ref": "jido-teate.json#data.eligibility.ageBoundaries.untilAge.value",
      "status": "verified"
    },
    {
      "key": "jido_teate.shiharai_kaisu",
      "value": 6,
      "unit": "回",
      "seido_ref": "jido-teate.json#data.payment.timesPerYear.value",
      "status": "verified"
    },
    {
      "key": "jido_teate.shinsei_tokurei_nissu",
      "value": 15,
      "unit": "日",
      "seido_ref": "jido-teate.json#data.application.deadline.value",
      "status": "verified"
    },
    {
      "key": "jidou_teate.jichitai_uwanose",
      "value": 0,
      "unit": "円",
      "status": "stub",
      "stub_reason": "自治体独自の上乗せ給付は全国データ未整備。docs/08_タスク分解.md P2-04の自治体データ収集と合わせてPhase 2で整備予定"
    }
  ],
  "last_updated": "2026-07-17",
  "next_check_due": "2026-10-01",
  "audience": {
    "universal": false,
    "lifeStages": [
      "newborn",
      "infant",
      "toddler",
      "schoolAge"
    ],
    "lifeEvents": [
      "parenting"
    ],
    "childAgeBands": [
      "age0_1",
      "age1_3",
      "age3_6",
      "age6_12"
    ],
    "gender": null
  }
}
---

# 児童手当は2026年度いくら？所得制限撤廃後の支給額

## 結論

2026年度の児童手当は、0歳から3歳未満が月15,000円、3歳から高校生年代までが月10,000円です。第3子以降はどちらの年齢区分でも月30,000円になります。2024年10月の制度改正で所得制限が撤廃されたため、世帯の所得にかかわらずこの金額が支給されます。

## 対象と金額

支給額は子どもの年齢と、生まれた順番（第何子か）によって次のように変わります。

- 0歳から3歳未満（第1子・第2子）: 月15,000円
- 0歳から3歳未満（第3子以降）: 月30,000円
- 3歳から高校生年代（18歳になった後の最初の年度末まで。第1子・第2子）: 月10,000円
- 3歳から高校生年代（第3子以降）: 月30,000円

支給は年6回、偶数月にまとめて振り込まれます。

なお、自治体独自の上乗せ給付を行っている市区町村もありますが、全国分のデータは現時点では未整備です。お住まいの自治体窓口でご確認ください。

かつては世帯の所得が一定額を超えると、支給額が減らされたり支給されなかったりしていました。2024年10月の改正でこの所得制限は撤廃されたため、2026年度は共働きで世帯収入が多い家庭も含め、原則としてすべての子育て世帯が対象になります。

申請が出生や転入から遅れると、さかのぼって受け取れない月が出ることがあります。ただし、出生日・転入日の翌日から15日以内に申請すれば、実際の申請が翌月にずれ込んでも、出生・転入があった月の翌月分から支給される特例があります。

## よくある疑問

- **所得が高い共働き世帯でも満額もらえる？** 2024年10月の改正で所得制限・所得上限のどちらも撤廃されたため、原則として所得にかかわらず上記の金額が支給されます。
- **第3子の数え方は？** 年齢が上のきょうだいから数えて3番目以降が「第3子以降」となります。カウントに含める兄姉の年齢の上限など細かいルールがあるため、詳しくは出典をご確認ください。

## 出典・根拠

- こども家庭庁「児童手当制度のご案内」
- こども家庭庁「もっと子育て応援！児童手当（令和6年10月分からの拡充）」

---

最終更新日: 2026-07-17 ／ 準拠年度: 2026年度 ／ 出典: 上記「出典・根拠」参照

※本記事は一次情報をもとにした情報整理です。制度の適用にあたっては、必ず最新の公式情報・窓口でご確認ください。
