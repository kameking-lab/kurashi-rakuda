---
{
  "id": "tool-narisou-rinyushoku-ryo",
  "title": "離乳食の量・固さはこう決まる — 月齢早見ツールの結果の読み方",
  "summary": "厚生労働省「授乳・離乳の支援ガイド」を基にした離乳食の進め方の目安を、月齢早見ツールがどう段階判定しているかとあわせて解説する。",
  "type": "tool-narisou",
  "category": "子育て",
  "tool_ref": "rinyushoku-ryo",
  "persona": "ペルソナ1: 佐藤美咲（32歳・専業主婦・子ども2人）",
  "solves": [
    "離乳食の量・固さの目安が月齢によってどう変わるか分からない"
  ],
  "revision_year": 2026,
  "sources": [
    {
      "url": "https://www.mhlw.go.jp/content/11908000/000496257.pdf",
      "title": "授乳・離乳の支援ガイド（2019年改定版）",
      "org": "厚生労働省",
      "accessed": "2026-07-17"
    }
  ],
  "facts": [
    {
      "key": "rinyushoku.gokkun_start",
      "value": 5,
      "unit": "ヶ月",
      "status": "verified",
      "seido_ref": "rinyushoku-ryo.json#stages[code=STAGE_GOKKUN].ageRangeMonths.from"
    },
    {
      "key": "rinyushoku.gokkun_end_mogumogu_start",
      "value": 7,
      "unit": "ヶ月",
      "status": "verified",
      "seido_ref": "rinyushoku-ryo.json#stages[code=STAGE_MOGUMOGU].ageRangeMonths.from"
    },
    {
      "key": "rinyushoku.mogumogu_end_kamikami_start",
      "value": 9,
      "unit": "ヶ月",
      "status": "verified",
      "seido_ref": "rinyushoku-ryo.json#stages[code=STAGE_KAMIKAMI].ageRangeMonths.from"
    },
    {
      "key": "rinyushoku.kamikami_end_pakupaku_start",
      "value": 12,
      "unit": "ヶ月",
      "status": "verified",
      "seido_ref": "rinyushoku-ryo.json#stages[code=STAGE_PAKUPAKU].ageRangeMonths.from"
    },
    {
      "key": "rinyushoku.pakupaku_end",
      "value": 19,
      "unit": "ヶ月",
      "status": "verified",
      "seido_ref": "rinyushoku-ryo.json#stages[code=STAGE_AFTER].ageRangeMonths.from"
    }
  ],
  "last_updated": "2026-07-17",
  "next_check_due": "2027-01-01"
}
---

# 離乳食の量・固さはこう決まる — 月齢早見ツールの結果の読み方

## この記事はどのツールと対応している？

このツールは、生年月日（または直接入力した月齢）から、厚生労働省「授乳・離乳の支援ガイド」が示す離乳の進み方の区分にあてはめ、その段階の「食べ物の固さ」「食事回数」「食品群ごとの食事あたりの目安量」を絞り込んで表示します。


---

🚨 **ここから先は有料パートです** 🚨
ご購入いただいた方は、専用の計算ツールと詳細な解説をご利用いただけます。

**専用切り出しツールURL**: https://kurashi-rakuda.vercel.app/tools/childcare/rinyushoku-ryo
※このURLはご購入者専用です。将来にわたり変更されません。

---

## 計算の考え方

月齢は生年月日から暦月で切り捨てて計算します（応当日を迎えるまでは前の月齢のまま扱い、次の応当日を迎えた時点で段階が切り替わります）。段階は月齢に応じて、離乳食開始前の目安、なめらかにすりつぶした状態（ゴックン期、生後5ヶ月ごろから）、舌でつぶせる固さ（モグモグ期、7ヶ月ごろから）、歯ぐきでつぶせる固さ（カミカミ期、9ヶ月ごろから）、歯ぐきで噛める固さ（パクパク期、12ヶ月ごろから）の順に進み、19ヶ月以降は離乳完了後の幼児食への移行期として、本ツールのデータ範囲外の案内に切り替わります。

出産予定日から早産で生まれたお子さまについては、実際の生年月日ではなく出産予定日からの月齢（修正月齢）で段階を判定するオプションがあります。

## 結果の読み方

結果画面には、判定された段階の「固さの目安」「食事回数」と、穀類・野菜果物・魚・肉・豆腐・卵・乳製品それぞれの食事あたりの目安量が表示されます。魚・肉・豆腐・卵・乳製品はいずれかひとつ程度を目安量の範囲で組み合わせる考え方であり、すべてを毎食同時に与える量ではありません。表示される量はあくまで目安であり、赤ちゃんの発育・発達には個人差があります。

## よくある疑問

- **目安量どおりに食べないと心配？** 個人差が大きいため、量そのものよりも「首がすわる」「支えると座れる」「食べ物に興味を示す」といった発達のサインを目安に進めるのが基本の考え方です。心配な場合は乳幼児健診やかかりつけ医・栄養士にご相談ください。
- **修正月齢はいつまで使う？** 修正月齢をいつまで使うかは個別差が大きいため、本ツールは参考値の提示にとどめ、医療者の判断を優先するよう案内しています。

## 出典・根拠

- 厚生労働省「授乳・離乳の支援ガイド（2019年改定版）」（離乳の進め方の目安の根拠）

---

最終更新日: 2026-07-17 ／ 準拠年度: 2026年度 ／ 出典: 上記「出典・根拠」参照

※本記事は一次情報をもとにした情報整理です。食べる量や進み方が心配な場合、食物アレルギーが疑われる場合は、自己判断で進めず、乳幼児健診やかかりつけ医・栄養士にご相談ください。
