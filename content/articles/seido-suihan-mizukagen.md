---
{
  "id": "seido-suihan-mizukagen",
  "title": "炊飯の水加減、合数⇄グラム換算はどう決まる？",
  "summary": "1合=180ml、精白米1合≈150gという基本単位は農林水産省の情報で確認できる。そこから先の加水量（白米は重さ×1.2倍または1合200ml、無洗米はさらに15ml〜30ml多め、玄米は1.5倍、もち米は同量）は、家庭用調理で一般的に使われている目安値。",
  "type": "seido-kaisetsu",
  "category": "家事・料理",
  "tool_ref": "suihan-mizu",
  "persona": "ペルソナ1: 佐藤美咲（32歳・専業主婦・子ども2人）",
  "solves": [
    "お米1合に水を何ml入れるか分からない"
  ],
  "revision_year": 2026,
  "sources": [
    {
      "url": "https://www.maff.go.jp/j/keikaku/syokubunka/culture/wagohan/articles/2111/spe3_01.html",
      "title": "「和ごはん」のすすめ ごはんの炊き方の基本",
      "org": "農林水産省",
      "accessed": "2026-07-17"
    }
  ],
  "facts": [
    {
      "key": "suihan.ichigo_ml",
      "value": 180,
      "unit": "ml",
      "seido_ref": "suihan-mizukagen-kijun.json#ichigo_ml",
      "status": "verified"
    },
    {
      "key": "suihan.hakumai_ichigo_g",
      "value": 150,
      "unit": "g",
      "seido_ref": "suihan-mizukagen-kijun.json#hakumai_ichigo_g",
      "status": "verified"
    },
    {
      "key": "suihan.hakumai_gousuu_kani_ml_per_go",
      "value": 200,
      "unit": "ml",
      "seido_ref": "suihan-mizukagen-kijun.json#kasui_baiitsu.hakumai_gousuu_kani_ml_per_go",
      "status": "verified"
    },
    {
      "key": "suihan.musenmai_tsuika_min",
      "value": 15,
      "unit": "ml",
      "seido_ref": "suihan-mizukagen-kijun.json#kasui_baiitsu.musenmai_tsuika_ml_per_go_min",
      "status": "verified"
    },
    {
      "key": "suihan.musenmai_tsuika_max",
      "value": 30,
      "unit": "ml",
      "seido_ref": "suihan-mizukagen-kijun.json#kasui_baiitsu.musenmai_tsuika_ml_per_go_max",
      "status": "verified"
    },
    {
      "key": "suihan.hakumai_juuryou_baiitsu",
      "value": 1.2,
      "unit": "倍",
      "seido_ref": "suihan-mizukagen-kijun.json#kasui_baiitsu.hakumai_juuryou_base",
      "status": "verified"
    },
    {
      "key": "suihan.genmai_baiitsu",
      "value": 1.5,
      "unit": "倍",
      "seido_ref": "suihan-mizukagen-kijun.json#kasui_baiitsu.genmai",
      "status": "verified"
    },
    {
      "key": "suihan.mochigome_baiitsu",
      "value": 1.0,
      "unit": "倍",
      "seido_ref": "suihan-mizukagen-kijun.json#kasui_baiitsu.mochigome",
      "status": "verified"
    }
  ],
  "last_updated": "2026-07-17",
  "next_check_due": "2026-10-01",
  "audience": {
    "universal": true,
    "lifeStages": [],
    "lifeEvents": [],
    "childAgeBands": [],
    "gender": null
  }
}
---

# 炊飯の水加減、合数⇄グラム換算はどう決まる？

## 結論

1合は180ml、精白米1合はおよそ150gという単位の対応は、農林水産省の情報でも確認できる基本のものさしです。そこから先の「炊くときにどれだけ水を足すか」という加水量の目安（白米は重さ×1.2倍または1合につき200ml、無洗米はさらに15ml〜30ml多め、玄米は1.5倍、もち米は白米と同量）は、一次情報に具体的な数値の記載があるわけではなく、家庭用調理で一般的に使われている目安値です。米の種類によって考え方が違うため、まず合数⇄グラムの基本を押さえ、そのうえで種類ごとの目安を確認するのがおすすめです。迷ったら、お使いの炊飯器の内釜に目盛り線がある場合は、そちらに従うのが最も正確です。

## 対象と金額（計量の単位対照表）

このセクションでは「金額」の代わりに、合数・グラム・mlの単位対応と、米の種類ごとの加水量の目安を対照表として整理します。

### 合数・グラム・mlの基本対応（農林水産省の情報で確認済み）

- 1合 = 180ml
- 精白米1合 ≈ 150g

計量カップやキッチンスケールがなくても、炊飯器に付属の計量カップ（多くは1合=180ml仕様）を使えば、この基本対応どおりに量ることができます。

### 米の種類別・加水量の目安（家庭用調理での一般的な目安。一次情報に具体的記載はない）

- **白米**: 重量ベースの目安は「米の重さ×1.2倍」です。たとえば精白米150g×1.2倍=180mlが水の量の目安になります。合数簡易法では「1合につき200ml」が目安です。どちらもよく使われる考え方で、どちらか一方が誤りというわけではありません。
- **無洗米**: 合数簡易法の200mlを基準に、ぬかを洗い流す工程がない分だけ15ml〜30mlほど多めに水を入れるのが一般的な目安です。無洗米専用の計量カップが付属している場合は、そちらの目盛りを優先してください。
- **玄米**: 白米の目安よりおよそ1.5倍の水が必要とされます。表皮が硬く吸水に時間がかかるため、数十分〜一晩の浸水を取ることをおすすめします。浸水なしで炊くと芯が残りやすくなります。
- **もち米**: 炊飯器で「もち米ご飯」として炊く場合は、白米とほぼ同量（およそ1.0倍）が目安です。赤飯やおこわのように蒸して調理する場合は必要な水分量が大きく異なるため、この目安の対象外です。

## よくある疑問

- **合数とグラムのどちらを信じればいい？** 1合=180ml、精白米1合≈150gという基本対応は農林水産省の情報でも確認できますが、実際の炊飯器の内釜目盛りは機種ごとの誤差も織り込まれているため、目盛り線がある場合はそちらを優先するのが最も確実です。
- **一升（10合）を超えるような大量に炊きたいときは？** 家庭用炊飯器の容量を超えることが多いため、分けて炊くことをおすすめします。
- **0.3合のようなごく少量でも同じ計算でいい？** 計算上は同じ考え方で目安を出せますが、少量になるほど計量誤差の影響が大きくなるため、キッチンスケールでの計量が安心です。
- **産地や精米からの日数で目安は変わる？** 変わります。米の乾燥具合やお好みの硬さによって最適な水加減は変わるため、ここでの数値はあくまで出発点の目安として使ってください。

## 出典・根拠

- 農林水産省「和ごはん」のすすめ ごはんの炊き方の基本（1合=180ml、精白米1合≈150gの基本単位を確認）
- 加水量の倍率・目安値（白米×1.2倍・合数簡易法200ml、無洗米+15ml〜30ml、玄米×1.5倍、もち米×1.0倍）は、上記の一次情報に具体的な記載がない家庭用調理の一般的な目安として整理したものです。

---

最終更新日: 2026-07-17 ／ 準拠年度: 2026年度 ／ 出典: 上記「出典・根拠」参照

※本記事は一次情報をもとにした情報整理です。加水量の目安は一般的な調理の目安であり、米の状態やお好みによって最適な水加減は変わります。正確な計量が必要な場合は、お使いの炊飯器の内釜目盛りやキッチンスケールをご確認ください。
