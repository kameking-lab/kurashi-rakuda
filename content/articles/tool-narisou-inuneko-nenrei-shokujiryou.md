---
{
  "id": "tool-narisou-inuneko-nenrei-shokujiryou",
  "title": "犬猫の年齢は人間だと何歳？食事量の目安はどう計算する？",
  "summary": "環境省「飼い主のためのペットフード・ガイドライン」に掲載された年齢換算表・計算式と、安静時のエネルギー要求量（RER）・1日当たりのエネルギー要求量（DER）の計算式を、犬猫の年齢換算・食事量目安ツールがどう使っているかを解説する。",
  "type": "tool-narisou",
  "category": "家事・料理",
  "tool_ref": "inuneko-nenrei-shokujiryou",
  "solves": [
    "愛犬・愛猫の年齢が人間だと何歳くらいか知りたい",
    "犬と猫、小〜中型犬と大型犬で年齢換算の計算式が違うことを知らなかった",
    "フードのパッケージ以外の方法で1日の食事量の目安を計算したい",
    "体重からペットに必要なエネルギー量（RER・DER）の計算方法を知りたい"
  ],
  "revision_year": 2026,
  "sources": [
    {
      "url": "https://www.env.go.jp/nature/dobutsu/aigo/2_data/pamph/petfood_guide_1808/pdf/4.pdf",
      "title": "飼い主のためのペットフード・ガイドライン～犬・猫の健康を守るために～（平成30年8月改訂版）2.市販のペットフードについて（9ページ「犬と人間、猫と人間の年齢の目安」）",
      "org": "環境省 自然環境局 総務課 動物愛護管理室",
      "accessed": "2026-07-21",
      "verify": {
        "skip": true,
        "skipReason": "PDFがデザイン組版のスキャン画像でテキスト層を持たず（PyMuPDF・pdftotextとも本文抽出0文字を確認済み）、機械照合の対象にできない。9ページをdpi200で画像化し目視で確認し、表の全数値（小〜中型犬・猫: 1歳15歳・2歳24歳・3歳28歳・5歳36歳・7歳44歳・10歳56歳・12歳64歳・15歳76歳・20歳96歳、大型犬: 1歳12歳・2歳19歳・3歳26歳・5歳40歳・7歳54歳・10歳75歳・12歳89歳・15歳110歳）と計算式（24+(年齢-2年)×4／12+(年齢-1年)×7）がdata/tables/inuneko-nenrei-shokujiryou.jsonの転記と完全一致することを確認した。"
      }
    },
    {
      "url": "https://www.env.go.jp/nature/dobutsu/aigo/2_data/pamph/petfood_guide_1808/pdf/6.pdf",
      "title": "飼い主のためのペットフード・ガイドライン～犬・猫の健康を守るために～（平成30年8月改訂版）4.体調管理について（13ページ「食事量を計算してみよう」）",
      "org": "環境省 自然環境局 総務課 動物愛護管理室",
      "accessed": "2026-07-21",
      "verify": {
        "skip": true,
        "skipReason": "PDFがデザイン組版のスキャン画像でテキスト層を持たず（PyMuPDF・pdftotextとも本文抽出0文字を確認済み）、機械照合の対象にできない。13ページをdpi200で画像化し目視で確認し、計算式（RER=体重(kg)×30+70／DER=RER×係数／1日当たりの食事量=A÷B×100）、係数（犬1.6・猫1.2、いずれも避妊去勢済み成犬・成猫）、体重の有効範囲（2〜45kg）、計算例（体重5kgの犬と猫：RER=220kcal、DER=犬352kcal・猫264kcal）がdata/tables/inuneko-nenrei-shokujiryou.jsonの転記と完全一致することを確認した。"
      }
    }
  ],
  "facts": [
    {
      "key": "inuneko.shouchuugata_1sai_ningen",
      "value": 15,
      "unit": "歳",
      "status": "verified",
      "seido_ref": "inuneko-nenrei-shokujiryou.json#nenreiKansan.shouChuugata.table[petAgeYears=1].humanAgeYears"
    },
    {
      "key": "inuneko.shouchuugata_2sai_ningen",
      "value": 24,
      "unit": "歳",
      "status": "verified",
      "seido_ref": "inuneko-nenrei-shokujiryou.json#nenreiKansan.shouChuugata.table[petAgeYears=2].humanAgeYears"
    },
    {
      "key": "inuneko.ougata_1sai_ningen",
      "value": 12,
      "unit": "歳",
      "status": "verified",
      "seido_ref": "inuneko-nenrei-shokujiryou.json#nenreiKansan.ougata.table[petAgeYears=1].humanAgeYears"
    },
    {
      "key": "inuneko.kansan_kijun_1sai",
      "value": 1,
      "unit": "歳",
      "status": "verified",
      "seido_ref": "inuneko-nenrei-shokujiryou.json#nenreiKansan.shouChuugata.table[petAgeYears=1].petAgeYears"
    },
    {
      "key": "inuneko.kansan_kijun_2sai",
      "value": 2,
      "unit": "歳",
      "status": "verified",
      "seido_ref": "inuneko-nenrei-shokujiryou.json#nenreiKansan.shouChuugata.table[petAgeYears=2].petAgeYears"
    },
    {
      "key": "inuneko.rer_taijuu_min",
      "value": 2,
      "unit": "kg",
      "status": "verified",
      "seido_ref": "inuneko-nenrei-shokujiryou.json#shokujiryouKeisan.rer.validWeightMinKg"
    },
    {
      "key": "inuneko.rer_taijuu_max",
      "value": 45,
      "unit": "kg",
      "status": "verified",
      "seido_ref": "inuneko-nenrei-shokujiryou.json#shokujiryouKeisan.rer.validWeightMaxKg"
    },
    {
      "key": "inuneko.keisanrei_taijuu",
      "value": 5,
      "unit": "kg",
      "status": "verified",
      "seido_ref": "inuneko-nenrei-shokujiryou.json#shokujiryouKeisan.calculationExample.weightKg"
    },
    {
      "key": "inuneko.shouchuugata_3sai_ningen",
      "value": 28,
      "unit": "歳",
      "status": "verified",
      "seido_ref": "inuneko-nenrei-shokujiryou.json#nenreiKansan.shouChuugata.table[petAgeYears=3].humanAgeYears"
    },
    {
      "key": "inuneko.kansan_kijun_3sai",
      "value": 3,
      "unit": "歳",
      "status": "verified",
      "seido_ref": "inuneko-nenrei-shokujiryou.json#nenreiKansan.shouChuugata.table[petAgeYears=3].petAgeYears"
    },
    {
      "key": "inuneko.ougata_2sai_ningen",
      "value": 19,
      "unit": "歳",
      "status": "verified",
      "seido_ref": "inuneko-nenrei-shokujiryou.json#nenreiKansan.ougata.table[petAgeYears=2].humanAgeYears"
    },
    {
      "key": "inuneko.ichinichi_atari",
      "value": 1,
      "unit": "日",
      "status": "stub",
      "stub_reason": "「1日当たりのエネルギー要求量（DER）」「1日当たりの食事量」という原典の用語表現の一部であり、独立した数値ノードではないため機械照合の対象外。"
    }
  ],
  "last_updated": "2026-07-21",
  "next_check_due": "2027-07-21",
  "audience": {
    "universal": true,
    "lifeStages": [],
    "lifeEvents": [],
    "childAgeBands": [],
    "gender": null
  }
}
---

# 犬猫の年齢は人間だと何歳？食事量の目安はどう計算する？

## この記事はどのツールと対応している？

本記事は「犬猫の年齢換算・食事量の目安」ツール（inuneko-nenrei-shokujiryou）に対応しています。犬・猫の年齢を入力すると人間年齢の目安を計算し、体重とフードの代謝エネルギー（ME）を入力すると避妊・去勢済みの成犬・成猫を対象にした1日の食事量の目安（RER・DER）を計算します。出典は環境省「飼い主のためのペットフード・ガイドライン～犬・猫の健康を守るために～」（平成30年8月改訂版）のみです。

## 計算の考え方

### 年齢換算

このツールは、犬・猫を「小〜中型犬・猫」と「大型犬」の2系統に分け、それぞれ別の計算式で人間年齢の目安を出します。猫は小〜中型犬・猫の式のみが原典に掲載されており、大型犬の式は猫には使えません。

小〜中型犬・猫は、1歳のときだけ特別扱いで人間の15歳に相当するとされ、2歳以上は「24+(年齢-2)×4」という式で計算します。たとえば2歳なら24歳、3歳なら24+(3-2)×4=28歳です。大型犬は1歳から式がそのまま成り立ち、「12+(年齢-1)×7」で計算します。1歳なら12歳、2歳なら12+(2-1)×7=19歳です。

原典の表に直接載っている年齢を超える入力でも、同じ式を延長してそのまま計算します。ツールの結果画面には、表の掲載範囲を超えた場合にその旨の注記が表示されます。逆に1歳未満（生後1年未満）の年齢は、原典に換算の根拠となる表・式が存在しないため、ツールは計算せずエラーメッセージを表示します。

### 食事量の目安

食事量の計算は2段階です。まず、安静にしているときに必要なエネルギー量（安静時のエネルギー要求量・RER）を、体重だけから「体重(kg)×30+70」という式で計算します。この式は体重2kg〜45kgの範囲でのみ有効で、範囲外の体重を入力するとツールはエラーを表示し計算しません。

次に、1日当たりに必要なエネルギー量（1日当たりのエネルギー要求量・DER）を、RERに係数を掛けて計算します。原典には成長期・妊娠授乳期・未避妊去勢・シニア期などライフステージ別の係数の記載がなく、「係数は、成長段階や活動量によって変わります。詳しくは獣医師に相談しましょう」と案内されているだけです。そのためこのツールは、原典に数値として明記されている「避妊・去勢済みの成犬・成猫」の係数（犬1.6・猫1.2）だけを扱い、他のライフステージの係数は捏造せずに扱いません。

フードのパッケージに表示された代謝エネルギー（ME、100グラムあたりのkcal）を入力すると、「1日当たりの食事量(g)=DER÷ME×100」の式で、1日に与える食事量の目安（グラム）まで計算します。MEを入力しなければ、RER・DERまでの計算結果を確認できます。

## 結果の読み方

年齢換算・食事量の目安のいずれも、環境省の同じガイドラインが唯一の出典です。ガイドラインの計算例では、体重5kgの犬・猫（いずれも避妊・去勢済み）でRERが220kcal、DERは犬が352kcal、猫が264kcalになると示されており、ツールの計算式もこの例と一致することを確認しています。

年齢換算の結果は「目安」であることに注意してください。原典自体が表のタイトルに「品種等によってもこの関係は違ってきます」と明記しており、犬種・体格・個体差によって実際の老化のスピードは変わります。食事量の目安も同様に、実際に必要な量は活動量・体調・季節によって変わるため、この結果を基準にしつつ、体重の変化を見ながら量を調整することが原典でも推奨されています。

## よくある疑問

**猫にも大型犬の計算式は使えますか？** いいえ。大型犬の式（12+(年齢-1)×7）は犬専用で、原典に猫向けの大型区分の表・式はありません。猫は常に「小〜中型犬・猫」の式で計算します。

**成長期の子犬・子猫や、避妊・去勢していない犬猫の食事量も計算できますか？** 年齢換算はできますが、食事量（DER）の係数は「避妊・去勢済みの成犬・成猫」の値しか原典に明記がないため、このツールでは他のライフステージの係数を扱っていません。子犬・子猫や未避妊去勢の犬猫、シニア期の犬猫の食事量については、原典の案内どおり獣医師に相談してください。

**体重が2kg未満、または45kgを超える場合はどうすればいいですか？** 原典の計算式自体が2kg〜45kgの範囲でのみ有効と明記されているため、範囲外の体重では計算できない設計になっています。獣医師にご相談ください。

**フードのMEはどこに書いてありますか？** 多くのペットフードのパッケージには「代謝エネルギー」または「ME」として100グラムあたりのkcalが表示されています。製品あたり・kgあたりで表示されている場合は、100グラムあたりに換算してから入力してください。

## 出典・根拠

- 環境省「飼い主のためのペットフード・ガイドライン～犬・猫の健康を守るために～」（平成30年8月改訂版）2.市販のペットフードについて（年齢換算表・計算式）
- 環境省「飼い主のためのペットフード・ガイドライン～犬・猫の健康を守るために～」（平成30年8月改訂版）4.体調管理について（食事量の計算式RER・DER）

---

最終更新日: 2026-07-21 ／ 準拠年度: 2026年度 ／ 出典: 上記「出典・根拠」参照

※本記事は環境省の公開情報をもとにした一般的な情報整理です。個体差・犬種差が大きいため、実際の健康管理・食事量については必ずかかりつけの獣医師にご相談ください。
