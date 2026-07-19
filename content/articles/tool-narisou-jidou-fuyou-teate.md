---
{
  "id": "tool-narisou-jidou-fuyou-teate",
  "title": "児童扶養手当の計算結果はどう読む？所得・養育費・同居親族の確認点",
  "summary": "児童扶養手当計算ツールの全部支給・一部支給・支給停止という結果を、2026年度の月額、所得判定、子どもの人数、養育費や同居親族の扱いから読み解きます。",
  "type": "tool-narisou",
  "category": "お金",
  "tool_ref": "jidou-fuyou-teate",
  "persona": "ペルソナ2: 田中絵里（36歳・ワーママ・時短勤務）",
  "solves": ["計算結果が全部支給・一部支給・支給停止になる理由が分からない", "養育費や同居する親の所得をどう入力するか分からない", "子どもが複数いる場合の加算を確認したい"],
  "revision_year": 2026,
  "sources": [
    {"url":"https://www.cfa.go.jp/assets/contents/node/basic_page/field_ref_resources/71de338f-5ed2-4c95-9848-3fd387d0b4d7/a4e6f323/20260408_policies_hitori-oya_fuyou-teate_19.pdf","title":"児童扶養手当制度の概要（令和8年度予算 事業概要）","org":"こども家庭庁 支援局家庭福祉課","accessed":"2026-07-18"},
    {"url":"https://www.pref.osaka.lg.jp/o090135/kateishien/teate/jifu.html","title":"児童扶養手当","org":"大阪府","accessed":"2026-07-18"}
  ],
  "facts": [
    {"key":"jifu.tool.first_full","value":48050,"unit":"円","seido_ref":"jidou-fuyou-teate.json#data.monthlyAmounts.firstChildFull","status":"verified"},
    {"key":"jifu.tool.additional_full","value":11350,"unit":"円","seido_ref":"jidou-fuyou-teate.json#data.monthlyAmounts.additionalChildFull","status":"verified"},
    {"key":"jifu.tool.first_partial_min","value":11340,"unit":"円","seido_ref":"jidou-fuyou-teate.json#data.monthlyAmounts.firstChildPartialMin","status":"verified"},
    {"key":"jifu.tool.payments","value":6,"unit":"回","seido_ref":"jidou-fuyou-teate.json#data.payment.timesPerYear","status":"verified"}
  ],
  "last_updated":"2026-07-18", "next_check_due":"2027-04-01",
  "audience":{"universal":false,"lifeStages":["infant","adult"],"lifeEvents":["parenting","working"],"childAgeBands":["age0_1"],"gender":null}
}
---

# 児童扶養手当の計算結果はどう読む？所得・養育費・同居親族の確認点

## この記事はどのツールと対応している？

本記事は[児童扶養手当 計算（ひとり親）](/tools/money/jidou-fuyou-teate)に対応しています。子どもの人数、受給者の所得、扶養親族数などを入力し、全部支給・一部支給・支給停止の目安と月額を確認するツールです。制度全体の対象要件は[児童扶養手当の制度解説](/guide/money/seido-jidou-fuyou-teate)も参照してください。

## 計算の考え方

計算は、まず受給者の所得を扶養親族数に応じた限度額と比べ、全部支給、一部支給、支給停止の区分を決めます。年収そのものではなく、給与所得控除などを反映し、受け取った養育費の一部を加えた制度上の所得を使う点が重要です。同居する扶養義務者の所得が限度額以上の場合も支給停止になり得るため、実家に戻った場合などは受給者本人だけで判断できません。

全部支給では、2026年度の最初の児童の月額は48,050円で、追加の児童ごとに11,350円を加えます。一部支給では所得に応じて段階的に減り、最初の児童の下限は月11,340円です。支給は年6回ですが、ツールの月額表示と実際の振込額は同じではなく、通常は複数月分がまとめて振り込まれます。

## 結果の読み方

結果画面では、最初に支給区分を確認し、次に「判定に使った所得」と扶養親族数が手元の資料と合っているかを見ます。養育費、各種控除、同居親族、公的年金との調整は誤差が出やすい項目です。表示額は申請前の整理に使い、認定額はお住まいの市区町村等の窓口で確認してください。申請前でも、所得資料と養育費の受取額を用意して相談すると確認が進めやすくなります。

## 出典・根拠

- こども家庭庁 支援局家庭福祉課「児童扶養手当制度の概要（令和8年度予算 事業概要）」
- 大阪府「児童扶養手当」

---
最終更新日: 2026-07-18 ／ 準拠年度: 2026年度 ／ 出典: 上記「出典・根拠」参照

※計算結果は目安です。実際の支給可否・支給額は実施主体の認定で決まります。
