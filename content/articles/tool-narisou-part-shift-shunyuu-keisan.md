---
{
  "id": "tool-narisou-part-shift-shunyuu-keisan",
  "title": "パートのシフトから年収はどう見込む？ 計算ツールの読み方",
  "type": "tool-narisou",
  "category": "お金",
  "tool_ref": "part-shift-shunyuu-keisan",
  "persona": "ペルソナ2: 田中絵里（36歳・ワーママ・時短勤務）",
  "summary": "時給・シフトの勤務日数・勤務時間から年収見込みを換算する式と、106万円の壁（勤務先の社会保険）と130万円の壁（扶養から外れるか）とで判定に使う収入の範囲（通勤手当を含むか含まないか）が異なる理由を解説し、パートシフト収入計算ツールの結果の読み方を補足する。",
  "solves": [
    "シフトの時給・時間から今のペースの年収見込みが分からない",
    "通勤手当を含めるかどうかで106万円と130万円の壁の判定が変わることを知らなかった",
    "月々どれくらいまでなら扶養に収まるか目安が分からない",
    "壁を超えたときに一時的な収入増でも救済されるのか知りたい"
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
      "key": "partShift.monthlyThreshold",
      "value": 108333,
      "unit": "円",
      "seido_ref": "part-shift-shunyuu-kabe.json#data.dependentCertificationMonthly.monthlyThreshold",
      "status": "verified"
    },
    {
      "key": "partShift.annualThreshold130",
      "value": 1300000,
      "unit": "円",
      "seido_ref": "part-shift-shunyuu-kabe.json#data.dependentCertificationMonthly.annualThreshold",
      "status": "verified"
    },
    {
      "key": "partShift.monthlyWage88000",
      "value": 88000,
      "unit": "円",
      "seido_ref": "part-shift-shunyuu-kabe.json#data.shortTimeWorkerRequirements.monthlyWage",
      "status": "verified"
    },
    {
      "key": "partShift.weeklyHours20",
      "value": 20,
      "unit": "時間",
      "seido_ref": "part-shift-shunyuu-kabe.json#data.shortTimeWorkerRequirements.weeklyHours",
      "status": "verified"
    },
    {
      "key": "partShift.employerSize51",
      "value": 51,
      "unit": "人",
      "seido_ref": "part-shift-shunyuu-kabe.json#data.shortTimeWorkerRequirements.employerSize",
      "status": "verified"
    },
    {
      "key": "fuyoKabe.shaho106Amount",
      "value": 1060000,
      "unit": "円",
      "seido_ref": "fuyou-kabe.json#data.walls.items[key=shaho-106].amount2026",
      "status": "verified"
    },
    {
      "key": "partShiftKeisan.weeksPerYear",
      "value": 52,
      "unit": "週",
      "status": "stub",
      "stub_reason": "1年間の週数（52週）は本ツール（part-shift-shunyuu-keisan）が時給・シフトから年収を換算するために採用している内部の設計上の近似値であり、data/seido・data/tablesいずれの一次データにも収録されていない一般的な暦の数値のため、seido_refでの照合対象外としている。実際の1か月あたりの週数は4〜5週で変動するため、この52週換算はあくまで目安である旨を本文・ツール双方に明記している。"
    }
  ],
  "last_updated": "2026-07-18",
  "next_check_due": "2027-04-01",
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

# パートのシフトから年収はどう見込む？ 計算ツールの読み方

## この記事はどのツールと対応している？

本記事は「パートシフト収入計算（壁警告付き）」（part-shift-shunyuu-keisan）に対応しています。ツールは時給・勤務日数・勤務時間（またはシフト表から分かる月収）を入力すると、年収の見込みを換算し、「扶養の壁シミュレーター2026」と同じ判定ロジックで、106万円・130万円などの壁までの距離を表示します。本記事は、その換算の考え方と、結果表示で特に誤解されやすい「通勤手当」の扱いを補足するものです。

## 計算の考え方

年収は、時給・勤務時間・勤務日数から求めた毎週の収入を、52週分積み上げる方法で換算しています。月によって実際に含まれる週の数にはばらつきがあるため、月ごとに単純に掛け算するよりも、年単位でまとめてから月あたりの平均を出すほうが実態に近い目安になります。シフト表から分かる月収をそのまま入力する方法も用意しています。

壁の金額そのもの（106万円・130万円など）や、税額・社会保険加入の判定式は、この換算ツールの中では一切計算しなおしていません。既に検収済みの「扶養の壁シミュレーター2026」の判定関数をそのまま呼び出しているだけです。ツールが独自に担当しているのは、シフトの入力から年収見込みを作る部分だけです。

もっとも注意してほしいのが、106万円の壁と130万円の壁とで、判定に使う収入の範囲が違う点です。106万円の壁（勤務先の社会保険に入るかどうか）は、週の所定労働時間20時間以上・所定内賃金の月額88,000円以上・勤務先の被保険者数51人以上などの要件で判定され、この所定内賃金には通勤手当を含めません。一方、130万円の壁（扶養から外れるかどうか）は、通勤手当や賞与を含む全ての収入で判定されます。同じ「月の収入」でも、見る範囲が制度によって違うということです。本ツールは通勤手当を任意の欄に分けて入力できるようにし、106万円の壁の判定にはこれを含めず、130万円の壁の判定には含めることで、この違いをそのまま反映しています。

## 結果の読み方

結果画面には、年収130万円を12で割った「月額108,333円」を、シフト制の月々の収入管理の実務上の目安として表示しています。健康保険の被扶養者認定は、暦年の収入合計ではなく、認定時点から将来1年間の見込み収入で判定されるため、「年の前半は少なかったから大丈夫」という考え方は通用しません。月々の収入をこの目安の範囲に収め続けることが、扶養にとどまるための実務上の基本になります。

壁の一覧のうち「106万円の壁」は勤務先の社会保険に入るかどうかの判定で、加入すると保険料の負担が発生する代わりに将来の年金が増えます。「130万円の壁」は扶養から外れるかどうかの判定で、外れると自分で国民健康保険・国民年金に加入する必要が生じます。人手不足による一時的なシフト増で収入が130万円を超えてしまった場合でも、勤務先の証明があれば原則として連続する2年度は扶養にとどまれる場合があります。ただし、これは一時的な収入増が理由の場合に限られ、恒常的にシフトを増やした場合には使えないため、判定結果が「扶養から外れる見込み」と出た場合は、まず勤務先にご相談ください。

## 出典・根拠

- 日本年金機構「健康保険の被扶養者になるための条件」
- 日本年金機構「短時間労働者に対する健康保険・厚生年金保険の適用拡大」
- 厚生労働省「『年収の壁』への対応」
- 厚生労働省「年収の壁・支援強化パッケージ」

---

最終更新日: 2026-07-18 ／ 準拠年度: 2026年度 ／ 出典: 上記「出典・根拠」参照

※本記事は一次情報をもとにした情報整理です。個別の状況については勤務先・加入している健康保険（保険者）にご確認ください。
