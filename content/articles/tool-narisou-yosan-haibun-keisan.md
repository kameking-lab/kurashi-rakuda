---
{
  "id": "tool-narisou-yosan-haibun-keisan",
  "title": "手取りの予算配分はこう計算する — 手取りからの予算配分計算ツールの結果の読み方",
  "summary": "世帯人員数と手取り月収を入力すると、総務省統計局「家計調査」の世帯人員別・費目別の支出構成比（全国平均）に基づいて、食費・住居費など10費目にどう配分するのが平均的かの目安金額を計算する予算配分計算ツールの考え方を解説する。",
  "type": "tool-narisou",
  "category": "お金",
  "tool_ref": "yosan-haibun-keisan",
  "persona": "ペルソナ1: 佐藤美咲（32歳・専業主婦・子ども2人＝4歳/1歳）",
  "solves": [
    "手取り収入をどう振り分ければいいか目安が分からない",
    "家賃や食費が世間の平均と比べて多いのか少ないのか分からない",
    "費目ごとの支出バランスを統計データで確認したい"
  ],
  "revision_year": 2026,
  "sources": [
    { "url": "https://www.stat.go.jp/data/kakei/2.html", "title": "家計調査（家計収支編） 調査結果", "org": "総務省統計局", "accessed": "2026-07-18" },
    { "url": "https://www.stat.go.jp/data/kakei/sokuhou/tsuki/index.html#nen", "title": "家計調査報告 ―月・四半期・年―（2025年（令和7年）平均の項）", "org": "総務省統計局", "accessed": "2026-07-18" },
    { "url": "https://www.stat.go.jp/data/kakei/sokuhou/tsuki/pdf/fies_gaikyo2025.pdf", "title": "家計調査報告（家計収支編）2025年（令和7年）平均結果の概要（PDF）", "org": "総務省統計局", "accessed": "2026-07-18" }
  ],
  "facts": [
    {
      "key": "yosan-haibun.tanshin_setai_ninzuu",
      "value": 1,
      "unit": "人",
      "status": "verified",
      "seido_ref": "yosan-haibun-hiritsu.json#tanshin_setai.setai_ninzuu"
    },
    {
      "key": "yosan-haibun.ninin_setai_ninzuu",
      "value": 2,
      "unit": "人",
      "status": "verified",
      "seido_ref": "yosan-haibun-hiritsu.json#futari_ijou_setai.ninin.setai_ninzuu"
    },
    {
      "key": "yosan-haibun.sannin_setai_ninzuu",
      "value": 3,
      "unit": "人",
      "status": "verified",
      "seido_ref": "yosan-haibun-hiritsu.json#futari_ijou_setai.sannin.setai_ninzuu"
    },
    {
      "key": "yosan-haibun.yonin_setai_ninzuu",
      "value": 4,
      "unit": "人",
      "status": "verified",
      "seido_ref": "yosan-haibun-hiritsu.json#futari_ijou_setai.yonin.setai_ninzuu"
    },
    {
      "key": "yosan-haibun.gonin_setai_ninzuu",
      "value": 5,
      "unit": "人",
      "status": "verified",
      "seido_ref": "yosan-haibun-hiritsu.json#futari_ijou_setai.gonin.setai_ninzuu"
    },
    {
      "key": "yosan-haibun.rokunin_ijou_label",
      "value": 6,
      "unit": "人",
      "status": "stub",
      "stub_reason": "「6人以上」は総務省統計局の集計区分の呼称（ラベル）であり、data/tables/yosan-haibun-hiritsu.json内に単一の生データノードとして格納された数値ではないため機械照合の対象外。実際の平均世帯人員は下記の yosan-haibun.rokunin_ijou_heikin_ninzuu（6.3人）を参照"
    },
    {
      "key": "yosan-haibun.rokunin_ijou_heikin_ninzuu",
      "value": 6.3,
      "unit": "人",
      "status": "verified",
      "seido_ref": "yosan-haibun-hiritsu.json#futari_ijou_setai.rokunin_ijou.setai_ninzuu"
    },
    {
      "key": "yosan-haibun.yonin_shouhi_shishutsu",
      "value": 362923,
      "unit": "円",
      "status": "verified",
      "seido_ref": "yosan-haibun-hiritsu.json#futari_ijou_setai.yonin.shouhi_shishutsu"
    },
    {
      "key": "yosan-haibun.yonin_shokuryou",
      "value": 103384,
      "unit": "円",
      "status": "verified",
      "seido_ref": "yosan-haibun-hiritsu.json#futari_ijou_setai.yonin.shokuryou"
    },
    {
      "key": "yosan-haibun.yonin_juukyo",
      "value": 17245,
      "unit": "円",
      "status": "verified",
      "seido_ref": "yosan-haibun-hiritsu.json#futari_ijou_setai.yonin.juukyo"
    },
    {
      "key": "yosan-haibun.yonin_kounetsu_suidou",
      "value": 25942,
      "unit": "円",
      "status": "verified",
      "seido_ref": "yosan-haibun-hiritsu.json#futari_ijou_setai.yonin.kounetsu_suidou"
    },
    {
      "key": "yosan-haibun.yonin_koutsuu_tsuushin",
      "value": 53213,
      "unit": "円",
      "status": "verified",
      "seido_ref": "yosan-haibun-hiritsu.json#futari_ijou_setai.yonin.koutsuu_tsuushin"
    },
    {
      "key": "yosan-haibun.yonin_kyouiku",
      "value": 33198,
      "unit": "円",
      "status": "verified",
      "seido_ref": "yosan-haibun-hiritsu.json#futari_ijou_setai.yonin.kyouiku"
    },
    {
      "key": "yosan-haibun.yonin_kyouyou_goraku",
      "value": 36710,
      "unit": "円",
      "status": "verified",
      "seido_ref": "yosan-haibun-hiritsu.json#futari_ijou_setai.yonin.kyouyou_goraku"
    },
    {
      "key": "yosan-haibun.yonin_sonota",
      "value": 51025,
      "unit": "円",
      "status": "verified",
      "seido_ref": "yosan-haibun-hiritsu.json#futari_ijou_setai.yonin.sonota_shouhi_shishutsu"
    },
    {
      "key": "yosan-haibun.example_tedori",
      "value": 250000,
      "unit": "円",
      "status": "stub",
      "stub_reason": "本記事が計算例として設定した手取り月収の仮値であり、一次情報がこの金額を主張しているわけではないため。"
    },
    {
      "key": "yosan-haibun.example_yonin_shokuryou_amount",
      "value": 71216,
      "unit": "円",
      "status": "stub",
      "stub_reason": "4人世帯の食料の構成比（103,384円÷362,923円）に、本記事の計算例として設定した手取り250,000円を掛けて四捨五入した計算結果（YosanHaibunKeisan.calc.tsのcalcBudgetAllocationと同じ計算式）であり、一次情報がこの金額自体を主張しているわけではないため。"
    },
    {
      "key": "yosan-haibun.min_tedori",
      "value": 1,
      "unit": "円",
      "status": "stub",
      "stub_reason": "YosanHaibunKeisan.calc.tsのバリデーション仕様（手取り月収は0より大きい有限数であること）の説明であり、外部の一次情報の数値ではなく本ツールの計算ロジック自体の説明であるため。"
    }
  ],
  "last_updated": "2026-07-18",
  "next_check_due": "2027-02-15",
  "audience": {
    "universal": false,
    "lifeStages": [
      "adult"
    ],
    "lifeEvents": [],
    "childAgeBands": [],
    "gender": null
  }
}
---

# 手取りの予算配分はこう計算する — 手取りからの予算配分計算ツールの結果の読み方

## この記事はどのツールと対応している？

本記事は「手取りからの予算配分計算（費目テンプレ）」ツール（yosan-haibun-keisan）に対応しています。世帯人員数と手取り月収を入力すると、総務省統計局「家計調査（家計収支編）」の世帯人員別・費目別の支出構成比（全国平均）に基づいて、食料・住居・光熱水道・家具家事用品・被服及び履物・保健医療・交通通信・教育・教養娯楽・その他の消費支出という10の費目に、それぞれどれくらい配分するのが平均的かの目安金額を表示します。

## 計算の考え方

このツールは、まず入力された世帯人員数を、総務省統計局が実際に集計している区分（単身世帯・2人・3人・4人・5人・6人以上）のいずれかに当てはめます。この区分の当てはめ方は「食費の目安計算」ツールと全く同じです。

- 世帯人員数が1人 → 単身世帯の区分
- 2人・3人・4人・5人 → それぞれ「二人以上の世帯」のうち、同じ人数の区分
- 6人以上（七人・十人などを入力した場合も含む） → すべて「6人以上」という同じ区分（実際の平均世帯人員は6.3人）

区分が決まったら、その区分の家計調査の実額をもとに、費目ごとの構成比（消費支出全体に占める割合）を「構成比＝その費目の実額÷消費支出の合計額」で計算します。

そして、入力していただいた手取り月収にこの構成比をそのまま掛けて、「目安金額＝手取り月収×構成比」で費目ごとの目安金額を計算します。

たとえば4人世帯の区分では、消費支出の合計額は362,923円、そのうち食料は103,384円です。手取り月収を250,000円と仮定すると、食料の構成比（103,384円÷362,923円）を250,000円に掛けて四捨五入した71,216円が食料の目安金額になります。同じ考え方を住居・光熱水道・家具家事用品・被服及び履物・保健医療・交通通信・教育・教養娯楽・その他の消費支出の残り9費目にもそれぞれ適用します。参考までに、4人世帯の区分における各費目の実額は、住居17,245円・光熱水道25,942円・交通通信53,213円・教育33,198円・教養娯楽36,710円・その他の消費支出51,025円です。

費目ごとに個別に四捨五入して目安金額を出しているため、10費目すべての目安金額を合計しても、入力した手取り月収と数円程度ずれることがあります。これは計算の不具合ではなく、独立して四捨五入したことによる自然な誤差です。強制的にぴったり合わせる補正は行っていません。

## 結果の読み方

結果画面には、選ばれた世帯人員区分と、費目ごとの目安金額・構成比（%）が一覧で表示されます。金額が大きいほど、その世帯人員区分では家計に占める割合が大きい費目だということになります。

ここで必ず押さえておきたいのは、家計調査の「消費支出」と、あなたが入力する「手取り月収」は別の概念だという点です。家計調査の消費支出は、実際に使われた生活費の平均額であり、貯蓄に回した分は含まれていません。このツールは、この消費支出の費目別構成比を、入力された手取り月収にそのまま当てはめて按分する簡易な計算方法を採用しています。構成比のもとになった世帯が実際にどれくらい貯蓄していたか、あなたの手取り収入・貯蓄の状況とどう違うかは考慮していません。

入力した人数が6人を超える場合は、その旨の注記が表示されます。総務省統計局の集計自体が「6人以上」までしか区分していないためで、ツールの不具合ではありません。

そして常に、この金額は総務省統計局「家計調査」の世帯人員別・費目別の支出構成比（全国平均）を手取り月収にそのまま当てはめた目安であり、地域・住居費（持家か賃貸か）・生活スタイルなどによって実際に望ましい配分は大きく異なる、という注記が表示されます。この配分に従うべきだという指導ではありません。表示された金額より多い・少ないからといって、家計の使い方が正しい・間違っているという意味ではありません。

## よくある疑問

**住居費はなぜ世帯人員が増えても単調に増えないのですか？** 家計調査の実額を見ると、住居費は世帯人員数に単純比例していません。これは、世帯人員が多い世帯ほど持家率が高く、家賃・地代の支払いがない世帯の割合が大きい傾向があるためで、統計上の実態をそのまま反映しています。本ツールはこの実額をそのまま使っており、按分ロジックの誤りではありません。

**費目別の目安金額を全部足すと、入力した手取り月収とぴったり一致しますか？** 一致しないことがあります。各費目を独立して四捨五入して目安金額を出しているため、合計すると入力額と数円程度ずれる場合があります。この記事の計算例（4人世帯・手取り250,000円）でも、10費目の目安金額の合計は入力額と厳密には一致しません。

**0や、1.5のような小数を世帯人員数に入力するとどうなりますか？** 入力エラーとして扱われ、結果は表示されません。世帯人員数は1人以上の整数で、手取り月収は1円以上の金額で入力してください。

**この構成比は今後も同じ水準ですか？** 表示される構成比は2025年（令和7年）平均の実額に基づくものであり、翌年以降の物価変動や消費行動の変化は反映していません。総務省統計局が次の「◯◯年平均」の結果を公表した際にデータを更新します。

## 出典・根拠

- 総務省統計局「家計調査（家計収支編） 調査結果」
- 総務省統計局「家計調査報告 ―月・四半期・年―」（2025年（令和7年）平均の項）
- 総務省統計局「家計調査報告（家計収支編）2025年（令和7年）平均結果の概要」（PDF）

---

最終更新日: 2026-07-18 ／ 準拠年度: 2026年度 ／ 出典: 上記「出典・根拠」参照

※本記事は一次情報をもとにした情報整理です。個別の状況については必ず最新の公式情報・窓口でご確認ください。表示される金額は総務省統計局「家計調査」の世帯人員別・費目別の支出構成比（全国平均）を手取り月収にそのまま当てはめた目安であり、この配分に従うべきだという指導ではありません。
