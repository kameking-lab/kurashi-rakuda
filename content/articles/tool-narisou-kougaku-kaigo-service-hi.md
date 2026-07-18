---
{
  "id": "tool-narisou-kougaku-kaigo-service-hi",
  "title": "高額介護サービス費はいくら戻る？ 該当チェックの読み方",
  "summary": "高額介護サービス費の該当チェックが、所得区分と世帯の介護サービス自己負担から払い戻しの目安を求める仕組みを解説します。対象外費用や世帯合算の注意点も整理します。",
  "type": "tool-narisou",
  "category": "介護",
  "tool_ref": "kougaku-kaigo-service-hi",
  "persona": "ペルソナ5: 高橋京子（52歳・パート・親の介護が視野）",
  "solves": ["介護サービスの自己負担が払い戻されるか知りたい", "所得区分ごとの月額上限が分からない", "夫婦の負担を世帯合算できるか知りたい", "対象外費用を含めてよいか分からない"],
  "revision_year": 2026,
  "sources": [
    { "url": "https://laws.e-gov.go.jp/law/410CO0000000412", "title": "介護保険法施行令", "org": "e-Gov法令検索（デジタル庁）", "accessed": "2026-07-18" },
    { "url": "https://www.mhlw.go.jp/content/000801668.pdf", "title": "介護保険最新情報Vol.997 高額介護サービス費の負担限度額の見直し", "org": "厚生労働省老健局介護保険計画課", "accessed": "2026-07-18" }
  ],
  "facts": [
    { "key": "kougaku_kaigo.limit_high", "value": 140100, "unit": "円", "seido_ref": "kougaku-kaigo-service-hi.json#data.brackets.tiers[key=kazei690].limit", "status": "verified" },
    { "key": "kougaku_kaigo.limit_standard", "value": 44400, "unit": "円", "seido_ref": "kougaku-kaigo-service-hi.json#data.brackets.tiers[key=kazei-under380].limit", "status": "verified" },
    { "key": "kougaku_kaigo.limit_exempt", "value": 24600, "unit": "円", "seido_ref": "kougaku-kaigo-service-hi.json#data.brackets.tiers[key=hikazei].limit", "status": "verified" },
    { "key": "kougaku_kaigo.limit_individual", "value": 15000, "unit": "円", "seido_ref": "kougaku-kaigo-service-hi.json#data.brackets.tiers[key=hikazei-nenkin].limitIndividual", "status": "verified" }
  ],
  "last_updated": "2026-07-18",
  "next_check_due": "2026-08-01",
  "audience": { "universal": false, "lifeStages": ["senior"], "lifeEvents": ["caregiving"], "childAgeBands": [], "gender": null }
}
---

# 高額介護サービス費はいくら戻る？ 該当チェックの読み方

## この記事はどのツールと対応している？

本記事は[高額介護サービス費 該当チェック](/tools/care/kougaku-kaigo-service-hi)に対応しています。月内に支払った介護保険サービスの利用者負担と所得区分を入力し、上限を超えた額の払い戻し目安を確認できます。区分の根拠は[高額介護サービス費の制度解説](/articles/seido-kougaku-kaigo-service-hi)で確認できます。

## 計算の考え方

まず、同じ住民票上の世帯にいる利用者の対象自己負担を合算します。次に所得区分に応じた月額上限を差し引き、残った額を払い戻しの目安とします。代表的な上限は、課税所得の高い区分が140,100円、一般的な課税世帯が44,400円、世帯全員が市町村民税非課税の世帯が24,600円です。低所得の要件を満たす本人には個人15,000円の上限も判定します。

複数人に払い戻す場合は、各人が支払った対象自己負担の割合に応じて按分します。この「世帯」は住民基本台帳上の世帯です。医療と介護を年間で合算する制度の「同じ医療保険の加入者」とは範囲が異なります。

入力に含めるのは介護サービスの定率負担部分です。施設の食費・居住費、日常生活費、住宅改修費、福祉用具購入費、区分支給限度基準額を超えた全額自己負担分は対象外なので足しません。

## 結果の読み方

「世帯の上限額」は入力した所得区分に対応する月単位の限度額です。「払い戻し見込額」は対象自己負担の合計から適用上限を差し引いた概算で、負担が上限以下なら払い戻しはありません。個人上限が表示された場合は、その本人について個人15,000円の判定も反映されています。

結果は請求書の総額との差ではありません。食費などを除いた対象額を入力できているか、介護サービス利用票や領収書で確かめてください。実際の所得区分と支給額は市区町村が判定します。

## よくある疑問

**夫婦の負担は合算できますか？** 同じ住民票上の世帯で、いずれも対象となる介護保険サービスの負担なら合算して判定します。

**施設代が44,400円までになる制度ですか？** いいえ。44,400円は該当する所得区分の介護サービス自己負担の上限で、食費・居住費などは別にかかります。

**申請しなくても戻りますか？** 初回は原則として市区町村への申請が必要です。自治体によって継続支給の扱いが異なるため、介護保険担当窓口で確認してください。

## 出典・根拠

- e-Gov法令検索「介護保険法施行令」
- 厚生労働省老健局介護保険計画課「介護保険最新情報Vol.997」

---

最終更新日: 2026-07-18 ／ 準拠年度: 2026年度 ／ 出典: 上記「出典・根拠」参照

※本記事とツールは一次情報をもとにした目安です。対象額・所得区分・申請方法はお住まいの市区町村にご確認ください。
