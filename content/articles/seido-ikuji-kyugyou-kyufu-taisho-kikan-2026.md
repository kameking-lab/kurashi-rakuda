---
{
  "id": "seido-ikuji-kyugyou-kyufu-taisho-kikan-2026",
  "title": "育児休業給付金はいつまでもらえる？支給率と対象期間",
  "summary": "育児休業給付金は、育休開始から通算180日目までは休業前賃金の67%、それ以降は50%が支給される。賃金日額には上限・下限があり、月あたりの支給額にも上限・下限がある。",
  "type": "seido-kaisetsu",
  "category": "妊娠・出産",
  "tool_ref": null,
  "persona": "ペルソナ4: 鈴木奈々（34歳・妊活→プレママ）",
  "revision_year": 2026,
  "sources": [
    { "url": "https://laws.e-gov.go.jp/law/349AC0000000116", "title": "雇用保険法（第61条の7）", "org": "デジタル庁 e-Gov法令検索", "accessed": "2026-07-17" },
    { "url": "https://www.hellowork.mhlw.go.jp/insurance/insurance_childcareleave.html", "title": "育児休業等給付について", "org": "ハローワークインターネットサービス（厚生労働省）", "accessed": "2026-07-17" },
    { "url": "https://www.mhlw.go.jp/content/11600000/001461102.pdf", "title": "育児休業等給付の内容と支給申請手続", "org": "厚生労働省", "accessed": "2026-07-17" }
  ],
  "facts": [
    { "key": "ikuji_kyugyo.kyufu_180nichi_made", "value": 67, "unit": "%", "seido_ref": "ikuji-kyugyou-kyufu.json#kyufu_ritsu.kaishi_kara_180nichi_made", "status": "verified" },
    { "key": "ikuji_kyugyo.kyufu_181nichime_ikou", "value": 50, "unit": "%", "seido_ref": "ikuji-kyugyou-kyufu.json#kyufu_ritsu.181nichime_ikou", "status": "verified" },
    { "key": "ikuji_kyugyo.kirikae_nissu", "value": 180, "unit": "日", "seido_ref": "ikuji-kyugyou-kyufu.json#kirikae_nissu", "status": "verified" },
    { "key": "ikuji_kyugyo.chingin_nichigaku_jougen", "value": 16110, "unit": "円", "seido_ref": "ikukyu-kyufu.json#data.ikujiKyugyoKyufuKin.wageDailyMax.value", "status": "verified" },
    { "key": "ikuji_kyugyo.chingin_nichigaku_kagen", "value": 3014, "unit": "円", "seido_ref": "ikukyu-kyufu.json#data.ikujiKyugyoKyufuKin.wageDailyMin.value", "status": "verified" },
    { "key": "ikuji_kyugyo.tsuki_jougen_67", "value": 323811, "unit": "円", "seido_ref": "ikukyu-kyufu.json#data.ikujiKyugyoKyufuKin.monthlyMax67.value", "status": "verified" },
    { "key": "ikuji_kyugyo.tsuki_jougen_50", "value": 241650, "unit": "円", "seido_ref": "ikukyu-kyufu.json#data.ikujiKyugyoKyufuKin.monthlyMax50.value", "status": "verified" },
    { "key": "ikuji_kyugyo.tsuki_kagen_67", "value": 60581, "unit": "円", "seido_ref": "ikukyu-kyufu.json#data.ikujiKyugyoKyufuKin.monthlyMin67.value", "status": "verified" },
    { "key": "ikuji_kyugyo.tsuki_kagen_50", "value": 45210, "unit": "円", "seido_ref": "ikukyu-kyufu.json#data.ikujiKyugyoKyufuKin.monthlyMin50.value", "status": "verified" },
    { "key": "ikuji_kyugyo.bunkatsu_kaisuu", "value": 2, "unit": "回", "seido_ref": "ikukyu-kyufu.json#data.ikujiKyugyoKyufuKin.maxLeaveCount.value", "status": "verified" },
    { "key": "ikuji_kyugyo.taisho_nenrei_gensoku", "value": 1, "unit": "歳", "status": "stub", "stub_reason": "育児休業給付金の対象期間（原則1歳まで）は育児・介護休業法上の休業取得可能期間に連動する数値であり、data/seido/ikukyu-kyufu.jsonには独立した数値ノードとして未収録のため個別確認が必要" },
    { "key": "ikuji_kyugyo.taisho_nenrei_saichouki", "value": 2, "unit": "歳", "status": "stub", "stub_reason": "保育所に入れないなどの事情がある場合の再延長後の上限（最長2歳まで）は育児・介護休業法上の数値であり、data/seido/ikukyu-kyufu.jsonには独立した数値ノードとして未収録のため個別確認が必要" }
  ],
  "last_updated": "2026-07-17",
  "next_check_due": "2026-10-01"
}
---

# 育児休業給付金はいつまでもらえる？支給率と対象期間

## 結論

育児休業給付金は、育休を開始してから通算180日目までは休業前賃金の67%、180日を超えた日以降は50%が支給されます。対象となる期間は、原則として子が1歳になるまでで、保育所に入れないなどの事情があれば最長2歳まで延長できます。賃金日額や月あたりの支給額には上限・下限があるため、賃金水準によっては率どおりの金額にならないこともあります。

## 対象と金額

雇用保険に加入していて、一定の被保険者期間の要件を満たす人が対象です。

- **育休開始から通算180日目まで**: 休業開始時賃金日額をもとにした額の67%
- **180日を超えた日以降**: 同じく50%
- **対象期間**: 原則として子が1歳になるまで。保育所に入れないなどの事情がある場合は延長でき、最長で2歳まで対象になります。

計算のもとになる休業開始時賃金日額には上限16,110円・下限3,014円が設定されています（毎年見直しがあります）。これにより、月あたりの支給額にも上限・下限があります。

- 給付率67%の期間: 月あたり上限323,811円・下限60,581円
- 給付率50%の期間: 月あたり上限241,650円・下限45,210円

同一の子について支給される育児休業は、原則2回まで分割して取得できます。

## よくある疑問

- **給付率が変わるタイミングは？** 育休開始から通算180日目です。休業日数を通算して数えるため、途中で就業した日があっても180日という数え方自体は変わりません。
- **賃金が高い人も同じ率でもらえる？** 休業開始時賃金日額には上限があるため、賃金水準が高い人ほど、率どおりの計算より頭打ちになりやすくなります。
- **育休中に少し働いても大丈夫？** 一定の就業日数・時間数の範囲内であれば支給対象のままですが、超えると調整や不支給になる場合があります。詳しくは出典をご確認ください。

## 出典・根拠

- デジタル庁 e-Gov法令検索「雇用保険法（第61条の7）」
- ハローワークインターネットサービス「育児休業等給付について」
- 厚生労働省「育児休業等給付の内容と支給申請手続」

---

最終更新日: 2026-07-17 ／ 準拠年度: 2026年度 ／ 出典: 上記「出典・根拠」参照

※本記事は一次情報をもとにした情報整理です。制度の適用にあたっては、必ず最新の公式情報・窓口でご確認ください。
