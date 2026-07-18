---
{
  "id": "tool-narisou-part-shift-shunyuu-kabe",
  "title": "パートのシフトを増やすといくら手取りが減る？年収の壁の分岐点",
  "summary": "パートのシフトを増やして「年収の壁」を越えると、どの基準でいつ手取りが減るのかを、扶養の壁シミュレーター2026の計算の裏側にある月額基準・週の所定労働時間・企業規模の要件から解説する。",
  "type": "tool-narisou",
  "category": "お金",
  "tool_ref": "fuyo-kabe",
  "persona": "ペルソナ2: 田中絵里（36歳・ワーママ・時短勤務）",
  "solves": [
    "パートのシフトを増やすとどこで手取りが減るか分からない",
    "106万・130万の壁を超えると損か得か分からない",
    "社会保険に加入すると毎月の手取りがどう変わるか分からない",
    "2026年10月の制度変更でシフトの目安がどう変わるか分からない"
  ],
  "revision_year": 2026,
  "sources": [
    {
      "url": "https://www.nenkin.go.jp/service/kounen/tekiyo/hihokensha1/20141202.html",
      "title": "健康保険の被扶養者になるための条件",
      "org": "日本年金機構",
      "accessed": "2026-07-17"
    },
    {
      "url": "https://www.nenkin.go.jp/service/kounen/tekiyo/jigyosho/tanjikan.html",
      "title": "短時間労働者に対する健康保険・厚生年金保険の適用拡大",
      "org": "日本年金機構",
      "accessed": "2026-07-17"
    },
    {
      "url": "https://www.mhlw.go.jp/tekiyoukakudai/jugyouin/taisho/",
      "title": "社会保険適用拡大 特設サイト（適用対象となる従業員の要件）",
      "org": "厚生労働省",
      "accessed": "2026-07-17"
    },
    {
      "url": "https://www.mhlw.go.jp/stf/taiou_001_00002.html",
      "title": "「年収の壁」への対応",
      "org": "厚生労働省",
      "accessed": "2026-07-17"
    },
    {
      "url": "https://www.mhlw.go.jp/stf/taiou_001_00004.html",
      "title": "年収の壁・支援強化パッケージ",
      "org": "厚生労働省",
      "accessed": "2026-07-17"
    }
  ],
  "facts": [
    {
      "key": "kabe.hifuyousha_nenkan_en",
      "value": 1300000,
      "unit": "円",
      "seido_ref": "part-shift-shunyuu-kabe.json#data.dependentCertificationMonthly.annualThreshold",
      "status": "verified"
    },
    {
      "key": "kabe.hifuyousha_getsugaku_en",
      "value": 108333,
      "unit": "円",
      "seido_ref": "part-shift-shunyuu-kabe.json#data.dependentCertificationMonthly.monthlyThreshold",
      "status": "verified"
    },
    {
      "key": "kabe.tanjikan_chingin_getsugaku_en",
      "value": 88000,
      "unit": "円",
      "seido_ref": "part-shift-shunyuu-kabe.json#data.shortTimeWorkerRequirements.monthlyWage",
      "status": "verified"
    },
    {
      "key": "kabe.tanjikan_shuukan_jikan",
      "value": 20,
      "unit": "時間",
      "seido_ref": "part-shift-shunyuu-kabe.json#data.shortTimeWorkerRequirements.weeklyHours",
      "status": "verified"
    },
    {
      "key": "kabe.tokutei_tekiyou_kigyou_ninzuu",
      "value": 51,
      "unit": "人",
      "seido_ref": "part-shift-shunyuu-kabe.json#data.shortTimeWorkerRequirements.employerSize",
      "status": "verified"
    },
    {
      "key": "kabe.hyakurokuman_tsuushou_en",
      "value": 1060000,
      "unit": "円",
      "seido_ref": "part-shift-shunyuu-kabe.json#data.shortTimeWorkerRequirements.monthlyWage",
      "status": "stub",
      "stub_reason": "「106万円」は月額8.8万円（88,000円）×12か月＝105.6万円を四捨五入した通称であり、data/seido/part-shift-shunyuu-kabe.jsonの一次情報が独立した数値ノードとして保持している値ではないため、参考表記としてstub扱いとする。"
    }
  ],
  "last_updated": "2026-07-17",
  "next_check_due": "2026-10-01",
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

# パートのシフトを増やすといくら手取りが減る？年収の壁の分岐点

## この記事はどのツールと対応している？

本記事は「扶養の壁シミュレーター2026」（fuyo-kabe）に対応しています。このツールは、パートの年収見込みを入力すると、106万円・130万円などの「壁」を境に手取りがどう変化するかを試算するものです。本記事では、シフトを増やして年収の壁を越えるかどうかを判断する場面に絞り、壁を境に何が変わるのかという計算の考え方を解説します。

## 計算の考え方

パートの収入管理には、税と社会保険という異なる仕組みが関わります。税はその年の実績で後から確定しますが、社会保険の被扶養者認定は、認定時点から将来に向けての見込み収入で判断されます。そのため社会保険は、年収130万円という数字ではなく、月額108,333円を超えるかどうかで毎月管理する必要があります。

もう一つの壁が、勤務先自身の社会保険に加入するかどうかを分ける短時間労働者の適用要件です。勤務先の企業規模が51人以上で、週の所定労働時間が20時間以上になると、2026年9月までは月額8.8万円（いわゆる「106万円の壁」）以上の所定内賃金も要件に加わります。この要件を満たすとシフトを増やした分の給料から社会保険料が天引きされるようになり、その月の手取りは一時的に減ります。ただし2026年10月には賃金要件が撤廃される予定で、撤廃後は週20時間という労働時間の基準が実質的な分岐点になります。

## 結果の読み方

シミュレーターで年収見込みを試算したら、まず勤務先の企業規模が51人以上か、契約上の週の所定労働時間が20時間以上かを確認します。どちらも満たすと、月収が8.8万円を超えた時点で社会保険に加入し手取りが下がりますが、加入後は将来の年金や傷病手当金などの給付が増えるという裏側もあります。130万円の壁は配偶者の扶養から外れるかどうかの基準で、通勤手当や賞与も含めた見込み年収で判定される点が106万円の壁と異なります。人手不足で一時的にシフトが増えた場合は、事業主の証明があれば扶養にとどまれる措置もあるため、恒常的な増加かどうかも判断材料になります。最終的な加入義務や認定の可否は、必ず勤務先や加入している健康保険に確認してください。

## 出典・根拠

- 日本年金機構「健康保険の被扶養者になるための条件」
- 日本年金機構「短時間労働者に対する健康保険・厚生年金保険の適用拡大」
- 厚生労働省「社会保険適用拡大 特設サイト（適用対象となる従業員の要件）」
- 厚生労働省「『年収の壁』への対応」
- 厚生労働省「年収の壁・支援強化パッケージ」

---
最終更新日: 2026-07-17 ／ 準拠年度: 2026年度 ／ 出典: 上記「出典・根拠」参照

※本記事は一次情報をもとにした情報整理です。個別の状況については自治体・専門機関に確認してください。
