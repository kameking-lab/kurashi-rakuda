---
{
  "id": "seido-kaigo-shisetsu-hiyou-souba",
  "title": "介護施設の費用はタイプ別でどう違う？特養・老健・有料・サ高住",
  "summary": "特養・老健・介護医療院は介護保険施設で、食費・居住費は低所得者に限り補足給付で軽減されます。有料老人ホームやサ高住は対象外で、家賃・管理費は事業者ごとに自由に設定されます。",
  "type": "seido-kaisetsu",
  "category": "介護",
  "tool_ref": null,
  "persona": "ペルソナ5: 高橋京子（52歳・パート・親の介護が視野）",
  "revision_year": 2026,
  "sources": [
    { "url": "https://laws.e-gov.go.jp/law/409AC0000000123", "title": "介護保険法（平成九年法律第百二十三号）", "org": "e-Gov法令検索（デジタル庁）", "accessed": "2026-07-17" },
    { "url": "https://laws.e-gov.go.jp/law/411M50000100036", "title": "介護保険法施行規則（平成十一年厚生省令第三十六号）", "org": "e-Gov法令検索（デジタル庁）", "accessed": "2026-07-17" },
    { "url": "https://www.kaigokensaku.mhlw.go.jp/commentary/fee.html", "title": "サービスにかかる利用料（介護サービス情報公表システム）", "org": "厚生労働省", "accessed": "2026-07-17" },
    { "url": "https://www.mhlw.go.jp/content/12300000/001576452.pdf", "title": "介護保険料等における基準額の調整／社会保障審議会 介護保険部会（第126回）資料3（令和7年10月9日）", "org": "厚生労働省老健局", "accessed": "2026-07-17" }
  ],
  "facts": [
    {
      "key": "kaigo_shisetsu.tokuyo_tashoshitsu_getsugaku",
      "value": 106930,
      "unit": "円",
      "seido_ref": "kaigo-shisetsu-hiyou-souba.json#data.costComponents.monthlyExampleTokuyo",
      "status": "stub",
      "stub_reason": "厚労省ページの月額目安の合計額。データファイルでは施設サービス費1割・居住費・食費・日常生活費の内訳を含む説明文字列として保持されており、独立した数値ノードではないため機械照合の対象外としている。"
    },
    {
      "key": "kaigo_shisetsu.tokuyo_unitgata_getsugaku",
      "value": 143980,
      "unit": "円",
      "seido_ref": "kaigo-shisetsu-hiyou-souba.json#data.costComponents.monthlyExampleUnit",
      "status": "stub",
      "stub_reason": "厚労省ページの月額目安の合計額。データファイルでは内訳を含む説明文字列として保持されており、独立した数値ノードではないため機械照合の対象外としている。"
    },
    {
      "key": "kaigo_shisetsu.hojokyufu_stage2_3a_kyokai_genko",
      "value": 809000,
      "unit": "円",
      "seido_ref": "kaigo-shisetsu-hiyou-souba.json#data.hojokyufu.userStages.boundaryStage2Stage3aBeforeAug2026",
      "status": "verified"
    },
    {
      "key": "kaigo_shisetsu.hojokyufu_stage2_3a_kyokai_kaitei",
      "value": 826500,
      "unit": "円",
      "seido_ref": "kaigo-shisetsu-hiyou-souba.json#data.hojokyufu.userStages.boundaryStage2Stage3a",
      "status": "verified"
    },
    {
      "key": "kaigo_shisetsu.hojokyufu_stage3a_3b_kyokai",
      "value": 1200000,
      "unit": "円",
      "seido_ref": "kaigo-shisetsu-hiyou-souba.json#data.hojokyufu.userStages.boundaryStage3aStage3b",
      "status": "verified"
    }
  ],
  "last_updated": "2026-07-17",
  "next_check_due": "2026-09-01",
  "solves": [
    "介護施設によって費用がどれくらい違うか分からない",
    "特養と有料老人ホームで費用の仕組みがどう違うのか分からない",
    "食費や居住費が軽減される制度があるのか知りたい",
    "有料老人ホームの費用相場がどこにも書いていない理由が分からない"
  ]
}
---

# 介護施設の費用はタイプ別でどう違う？特養・老健・有料・サ高住

## 結論

介護保険施設（特別養護老人ホーム＝特養、介護老人保健施設＝老健、介護医療院）に入る場合の費用は、施設サービス費の自己負担・食費・居住費・日常生活費の合計です。食費と居住費は、市区町村の認定を受けた低所得の方に限り「補足給付」で軽減されます。一方、有料老人ホームやサービス付き高齢者向け住宅（サ高住）は介護保険施設ではなく、家賃や管理費は事業者が自由に設定するため、公的に定められた費用相場はありません。

## 対象と金額

特養は原則として要介護3以上の方が対象です。要介護5の方が特養の多床室を利用した場合、施設サービス費・食費・居住費・日常生活費を合わせたひと月あたりの自己負担の目安は約106,930円、ユニット型個室では約143,980円です（いずれも補足給付を受けない第4段階の場合）。

食費・居住費の軽減を受けるには市区町村への申請が必要で、所得段階は4段階に分かれます。第2段階と第3段階①を分ける公的年金等の収入額の基準は、現在809,000円ですが、2026年8月から826,500円に引き上げられます。第3段階①と②の境界は120万円です。第4段階（市町村民税課税世帯）は軽減の対象外で、基準費用額を全額負担します。

有料老人ホームやサ高住の入居一時金・月額費用は施設ごとに大きく異なります。個別の費用は、厚生労働省「介護サービス情報公表システム」で事業所ごとに確認できます。

## 出典・根拠

- e-Gov法令検索「介護保険法」
- e-Gov法令検索「介護保険法施行規則」
- 厚生労働省「サービスにかかる利用料（介護サービス情報公表システム）」
- 厚生労働省老健局「社会保障審議会介護保険部会資料3」

---
最終更新日: 2026-07-17 ／ 準拠年度: 2026年度 ／ 出典: 上記「出典・根拠」参照

※本記事は一次情報をもとにした情報整理です。個別の状況については自治体・専門機関に確認してください。
