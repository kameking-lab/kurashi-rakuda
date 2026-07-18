---
{
  "id": "tool-narisou-ninshin-kenshin-schedule",
  "title": "妊婦健診の受診間隔はこう決まる — 妊婦健診スケジュール生成ツールの結果の読み方",
  "summary": "出産予定日（または最終月経開始日）から、標準的な妊婦健診の受診間隔にもとづく受診スケジュールを逆算する妊婦健診スケジュール生成ツールの計算の考え方と、公費助成・産後の産婦健診との関係を解説する。",
  "type": "tool-narisou",
  "category": "妊娠・出産",
  "tool_ref": "ninshin-kenshin-schedule",
  "persona": "ペルソナ4: 鈴木奈々（34歳・妊活1年目→プレママ）",
  "solves": [
    "妊婦健診に何回・いつ行けばいいか分からない",
    "妊婦健診の受診間隔の目安が分からない",
    "妊婦健診が公費助成の対象回数に入っているか分からない",
    "産後の産婦健診がいつごろか分からない"
  ],
  "revision_year": 2026,
  "sources": [
    {
      "url": "https://www.mhlw.go.jp/bunya/kodomo/boshi-hoken13/dl/02.pdf",
      "title": "“妊婦健診”を受けましょう（リーフレット）",
      "org": "厚生労働省",
      "accessed": "2026-07-17"
    },
    {
      "url": "https://www.cfa.go.jp/policies/boshihoken/nimpukenshin",
      "title": "妊婦健診に関する取組み",
      "org": "こども家庭庁",
      "accessed": "2026-07-17"
    },
    {
      "url": "https://www.cfa.go.jp/policies/budget",
      "title": "令和8年度こども家庭庁当初予算案（参考資料）（産婦健康診査事業）",
      "org": "こども家庭庁",
      "accessed": "2026-07-17"
    },
    {
      "url": "https://laws.e-gov.go.jp/law/340AC0000000141",
      "title": "母子保健法（昭和四十年法律第百四十一号）",
      "org": "e-Gov法令検索（デジタル庁）",
      "accessed": "2026-07-17"
    }
  ],
  "facts": [
    {
      "key": "ninshin_kenshin.hyojun_kenshin_kaisuu",
      "value": 14,
      "unit": "回",
      "seido_ref": "ninshin-kenshin-jyosei.json#data.schedule.standardVisitCount",
      "status": "verified"
    },
    {
      "key": "ninshin_kenshin.sanpu_kenshin_taisho_kaisuu",
      "value": 2,
      "unit": "回",
      "seido_ref": "sanpu-kenshin-jyosei.json#data.eligibility.timesCovered",
      "status": "verified"
    },
    {
      "key": "ninshin_kenshin.shokai_meyasu_shuu",
      "value": 8,
      "unit": "週",
      "status": "stub",
      "stub_reason": "厚生労働省リーフレットの例示（『1回目が妊娠8週頃とした場合、受診回数は合計14回くらいになりますね』）に基づく値。data/seido/ninshin-kenshin-jyosei.jsonのdata.schedule配下には標準受診回数（standardVisitCount）と受診間隔の説明文（intervalDescription、文字列全体としてのみ収録）はあるが、1回目の目安週数を独立した数値ノードとしては収録していないため機械照合対象外。"
    },
    {
      "key": "ninshin_kenshin.zenki_kyoukai_shuu",
      "value": 23,
      "unit": "週",
      "status": "stub",
      "stub_reason": "data/seido/ninshin-kenshin-jyosei.jsonのdata.schedule.intervalDescriptionの一部（『妊娠初期から妊娠23週まで4週間に1回』）。当該フィールドは説明文全体が1つの文字列として収録されており、23という数値だけを取り出せる独立ノードではないため機械照合対象外。"
    },
    {
      "key": "ninshin_kenshin.zenki_kankaku_shuu",
      "value": 4,
      "unit": "週",
      "status": "stub",
      "stub_reason": "data/seido/ninshin-kenshin-jyosei.jsonのdata.schedule.intervalDescriptionの一部（『4週間に1回』）。文字列全体としてのみ収録され独立した数値ノードではないため機械照合対象外。"
    },
    {
      "key": "ninshin_kenshin.chuuki_kaishi_shuu",
      "value": 24,
      "unit": "週",
      "status": "stub",
      "stub_reason": "data/seido/ninshin-kenshin-jyosei.jsonのdata.schedule.intervalDescriptionの一部（『妊娠24週から妊娠35週まで2週間に1回』）。文字列全体としてのみ収録され独立した数値ノードではないため機械照合対象外。"
    },
    {
      "key": "ninshin_kenshin.chuuki_shuuryou_shuu",
      "value": 35,
      "unit": "週",
      "status": "stub",
      "stub_reason": "data/seido/ninshin-kenshin-jyosei.jsonのdata.schedule.intervalDescriptionの一部（『妊娠24週から妊娠35週まで2週間に1回』）。文字列全体としてのみ収録され独立した数値ノードではないため機械照合対象外。"
    },
    {
      "key": "ninshin_kenshin.chuuki_kankaku_shuu",
      "value": 2,
      "unit": "週",
      "status": "stub",
      "stub_reason": "data/seido/ninshin-kenshin-jyosei.jsonのdata.schedule.intervalDescriptionの一部（『2週間に1回』）。文字列全体としてのみ収録され独立した数値ノードではないため機械照合対象外。"
    },
    {
      "key": "ninshin_kenshin.kouki_kaishi_shuu",
      "value": 36,
      "unit": "週",
      "status": "stub",
      "stub_reason": "data/seido/ninshin-kenshin-jyosei.jsonのdata.schedule.intervalDescriptionの一部（『妊娠36週から出産まで1週間に1回』）。文字列全体としてのみ収録され独立した数値ノードではないため機械照合対象外。"
    },
    {
      "key": "ninshin_kenshin.kouki_kankaku_shuu",
      "value": 1,
      "unit": "週",
      "status": "stub",
      "stub_reason": "data/seido/ninshin-kenshin-jyosei.jsonのdata.schedule.intervalDescriptionの一部（『1週間に1回』）。文字列全体としてのみ収録され独立した数値ノードではないため機械照合対象外。"
    },
    {
      "key": "ninshin_kenshin.sanpu_2kaime_meyasu_kagetsu",
      "value": 1,
      "unit": "ヶ月",
      "status": "stub",
      "stub_reason": "data/seido/sanpu-kenshin-jyosei.jsonのdata.eligibility.secondCheckupTimingの値『産後1か月』に基づく目安。当該フィールドは『産後2週間、産後1か月など』という時期を表す文字列として収録されており、1という数値だけを取り出せる独立ノードではないため機械照合対象外。"
    },
    {
      "key": "ninshin_kenshin.kijunbi_saizen_nissuu",
      "value": 70,
      "unit": "日",
      "status": "stub",
      "stub_reason": "specs/b-tools/p2-t14-ninshin-kenshin-schedule.md が定める入力バリデーションの下限（基準日より70日超前はエラー）。誤入力対策として実装時に設定したゆるいガードであり、医学的な妊娠期間の上限・下限を示す外部の一次情報値ではないため機械照合対象外。"
    },
    {
      "key": "ninshin_kenshin.kijunbi_saiensaki_nissuu",
      "value": 320,
      "unit": "日",
      "status": "stub",
      "stub_reason": "specs/b-tools/p2-t14-ninshin-kenshin-schedule.md が定める入力バリデーションの上限（基準日より320日超先はエラー）。誤入力対策として実装時に設定したゆるいガードであり、医学的な妊娠期間の上限・下限を示す外部の一次情報値ではないため機械照合対象外。"
    }
  ],
  "last_updated": "2026-07-17",
  "next_check_due": "2027-04-01",
  "audience": {
    "universal": false,
    "lifeStages": [
      "pregnancy"
    ],
    "lifeEvents": [
      "pregnant"
    ],
    "childAgeBands": [
      "prenatal"
    ],
    "gender": null
  }
}
---

# 妊婦健診の受診間隔はこう決まる — 妊婦健診スケジュール生成ツールの結果の読み方

## この記事はどのツールと対応している？

本記事は「妊婦健診スケジュール生成」ツール（ninshin-kenshin-schedule）に対応しています。出産予定日（分からなければ最終月経開始日）を入力すると、標準的な妊婦健診の受診間隔をもとに、各回のおおよその受診日と妊娠週数を一覧で計算します。あわせて、各回が公費助成の目安回数内かどうか、産後の産婦健康診査の参考時期も表示します。

このツールが表示するのはあくまで制度上の標準的な受診間隔から機械計算した目安スケジュールであり、医学的な受診指示・診断ではありません。実際に何回・いつ受診するかは、妊娠経過・体調・医療機関の方針によって異なります。必ず担当医の指示を優先してください。

## 計算の考え方

**出産予定日と最終月経開始日の関係**は、出産予定日・妊娠週数計算ツール（Q3-01）と同じ考え方を使います。出産予定日が入力されていれば、そこから逆算した日を最終月経開始日として扱い、最終月経開始日だけが入力されている場合はそこから概算の出産予定日を計算します。両方が入力されていて日数が食い違う場合は、超音波検査等で確定した出産予定日を優先し、食い違いの日数は注意表示にとどめます(エラーにはしません)。

**次回受診までの目安の間隔**は、妊娠週数によって変わります。妊娠23週までは4週間ごと、24週から35週までは2週間ごと、そして出産が近づく36週以降は1週間ごとに短くなっていきます。最初の受診の目安は妊娠8週ごろで、ここを起点にこの区分を順番に適用していくと、合計14回程度の受診回数になります。この間隔の区分は、厚生労働省のリーフレットが示す標準的な妊婦健診の例にもとづいています。

**受診回の生成**は、この間隔を積み上げて次の受診日を決め、出産予定日以降になった時点で打ち切る、という単純な繰り返し計算です。最終月経開始日と出産予定日が標準的な妊娠期間ぶん離れている入力であれば、この積み上げによってちょうど14回程度が生成されます。

**公費助成の目安回数内かどうか**は、その受診が全体の中で何番目かで決まります。合計14回以内であれば「目安回数内」、それを超える回は「目安回数外」と表示します。これは公費助成が必ず受けられるという意味ではなく、あくまで国が示す標準的な受診回数の範囲内かどうかを示すだけです。助成の実施の有無・金額・検査項目は市区町村ごとに異なります。

**産後の産婦健康診査の目安日**は、出産予定日を基準に、産後2週間・産後1か月ごろの時期を参考として表示します。国の補助対象になっているのはこの2回分です。産後1か月の目安日を計算する際、出産予定日によっては暦の上で同じ日付が翌々月に存在しないことがあります。その場合は、存在する日のうち最も遅い日(月末)を目安日とみなします(月末クランプ)。

## 結果の読み方

結果画面には、受診回ごとに「目安の受診日」「妊娠週数」「前回からの間隔」「目安回数内かどうか」「基準日からみて過去・今日・今後のどれか」が並びます。出産予定日以降になる回は生成されないため、リストに表示される受診回はすべて出産予定日より前の日付です。

出産予定日をすでに過ぎている場合でも、スケジュール自体は出産予定日を基準にそのまま計算されるため、生成された受診回はすべて「過去」として表示されることがあります。これは計算上そうなるだけで、実際に何回受診したかを示すものではありません。

産後2週間・産後1か月ごろの目安日は、あくまで出産予定日を起点にした参考値です。実際の出産日が予定日からずれれば、これらの目安日もあわせてずれます。また、産後の産婦健康診査はすべての市区町村で実施されているわけではないため、「受けられます」と断定はできません。お住まいの市区町村で実施されているか、必ずご確認ください。

## よくある疑問

**出産予定日が基準日から極端に離れている場合は?** 出産予定日が基準日より70日を超えて前、または320日を超えて先の場合は、入力ミスの可能性が高いためエラーとして結果を計算しません。これは医学的な妊娠期間の上限・下限を示す値ではなく、単純な誤入力対策のゆるいガードです。

**妊娠週数の区分の境界(23週と24週、35週と36週)はどちらに入る?** 23週は「4週間ごと」の区分、24週は「2週間ごと」の区分に入ります。同様に35週は「2週間ごと」、36週は「1週間ごと」の区分です。境界週そのものは、その週から始まる新しい区分の間隔で数えます。

**受診回数は必ず14回になる?** 標準的な入力(出産予定日と最終月経開始日が標準的な妊娠期間ぶん離れている場合)であれば14回程度になりますが、これはあくまで目安の計算結果です。実際の受診回数は、妊娠経過や医療機関の方針によって増減します。

**公費助成の受診券が足りなくなったら?** 本ツールは「目安回数内」かどうかを表示するだけで、実際の助成回数・金額・検査項目は保証しません。これらは市区町村ごとに異なるため、お住まいの市区町村の母子保健担当窓口でご確認ください。

## 出典・根拠

- 厚生労働省「“妊婦健診”を受けましょう（リーフレット）」（標準的な妊婦健診の受診間隔・回数の例示）
- こども家庭庁「妊婦健診に関する取組み」（公費助成が市区町村ごとに異なる旨）
- こども家庭庁「令和8年度こども家庭庁当初予算案（参考資料）」（産婦健康診査事業の対象時期・国庫補助対象回数）
- 母子保健法（e-Gov法令検索）（妊婦・産婦に対する健康診査の法的根拠）

---

最終更新日: 2026-07-17 ／ 準拠年度: 2026年度 ／ 出典: 上記「出典・根拠」参照

※本記事は一次情報をもとにした情報整理です。個別の状況については必ず最新の公式情報・窓口でご確認ください。
