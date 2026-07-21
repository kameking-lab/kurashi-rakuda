---
{
  "id": "dandori-hikitsugi-junbi-schedule",
  "title": "産休・育休の引き継ぎはいつから準備する？",
  "summary": "産休・育休前の引き継ぎに「この時期までにやらなければならない」という法律の決まりはありません。法令上の期限は、産前休業の請求（出産予定日の6週間前、多胎は14週間前から）と育児休業の申出（開始予定日の1か月前まで）の2つだけです。引き継ぎ作業そのものの時期は目安として、体調を優先しながら前倒しで進める考え方を整理します。",
  "type": "dandori",
  "category": "仕事・キャリア",
  "tool_ref": null,
  "persona": "ペルソナ2: 田中絵里（36歳・ワーママ・時短勤務）",
  "solves": [
    "産休に入る前、引き継ぎをいつから始めればいいのか分からない",
    "育休の申出期限や産前休業の請求期限を正確に知りたい",
    "切迫早産などで予定より早く休みに入ることになったらどうすればいいか不安",
    "配偶者が産後パパ育休を取る場合の申出期限も知っておきたい"
  ],
  "sources": [
    {
      "url": "https://laws.e-gov.go.jp/law/322AC0000000049",
      "title": "労働基準法（昭和二十二年法律第四十九号）",
      "org": "e-Gov法令検索（デジタル庁）",
      "accessed": "2026-07-17",
      "verify": {
        "expect": [
          "六週間(多胎妊娠の場合にあつては、十四週間)以内に出産する予定の女性が休業を請求した場合",
          "生後満一年に達しない生児を育てる女性は、第三十四条の休憩時間のほか、一日二回各々少なくとも三十分"
        ]
      }
    },
    {
      "url": "https://laws.e-gov.go.jp/law/403AC0000000076",
      "title": "育児休業、介護休業等育児又は家族介護を行う労働者の福祉に関する法律（平成三年法律第七十六号）",
      "org": "e-Gov法令検索（デジタル庁）",
      "accessed": "2026-07-17",
      "verify": {
        "expect": [
          "当該育児休業申出があった日の翌日から起算して一月",
          "当該出生時育児休業申出があった日の翌日から起算して二週間"
        ]
      }
    },
    {
      "url": "https://www.mhlw.go.jp/seisakunitsuite/bunya/koyou_roudou/koyoukintou/ryouritsu/ikuji/law-amendment/",
      "title": "法改正のポイント｜育児休業制度特設サイト",
      "org": "厚生労働省",
      "accessed": "2026-07-17",
      "verify": {
        "expect": ["本人又はその配偶者の妊娠・出産の申出時"]
      }
    }
  ],
  "facts": [
    {
      "key": "hikitsugi.sanzen_kyuugyou_shuukan",
      "value": 6,
      "unit": "週",
      "seido_ref": "hikitsugi-junbi-schedule.json#legalDeadlines[key=sanzen-kyuugyou].weeksBeforeDueDate",
      "status": "verified"
    },
    {
      "key": "hikitsugi.sanzen_kyuugyou_tatai_shuukan",
      "value": 14,
      "unit": "週",
      "seido_ref": "hikitsugi-junbi-schedule.json#legalDeadlines[key=sanzen-kyuugyou].weeksBeforeDueDateMultiple",
      "status": "verified"
    },
    {
      "key": "hikitsugi.sango_kyuugyou_shuukan",
      "value": 8,
      "unit": "週",
      "seido_ref": "hikitsugi-junbi-schedule.json#legalDeadlines[key=sango-kyuugyou].weeksAfterBirth",
      "status": "verified"
    },
    {
      "key": "hikitsugi.sango_kyousei_shuukan",
      "value": 6,
      "unit": "週",
      "seido_ref": "hikitsugi-junbi-schedule.json#legalDeadlines[key=sango-kyuugyou].weeksAfterBirthEarliestReturn",
      "status": "verified"
    },
    {
      "key": "hikitsugi.ikukyu_moushide_kagetsu",
      "value": 1,
      "unit": "ヶ月",
      "seido_ref": "hikitsugi-junbi-schedule.json#legalDeadlines[key=ikuji-kyuugyou-moushide].monthsBefore",
      "status": "verified"
    },
    {
      "key": "hikitsugi.papa_ikukyu_moushide_shuukan",
      "value": 2,
      "unit": "週",
      "seido_ref": "hikitsugi-junbi-schedule.json#legalDeadlines[key=shusshouji-ikuji-kyuugyou-moushide].weeksBefore",
      "status": "verified"
    },
    {
      "key": "hikitsugi.papa_ikukyu_waku_shuukan",
      "value": 8,
      "unit": "週",
      "seido_ref": "hikitsugi-junbi-schedule.json#legalDeadlines[key=shusshouji-ikuji-kyuugyou-waku].weeksWindow",
      "status": "verified"
    },
    {
      "key": "hikitsugi.papa_ikukyu_nissuu",
      "value": 28,
      "unit": "日",
      "seido_ref": "hikitsugi-junbi-schedule.json#legalDeadlines[key=shusshouji-ikuji-kyuugyou-waku].maxDays",
      "status": "verified"
    },
    {
      "key": "hikitsugi.ikukyu_bunkatsu_kaisuu",
      "value": 2,
      "unit": "回",
      "seido_ref": "hikitsugi-junbi-schedule.json#legalDeadlines[key=ikuji-kyuugyou-bunkatsu].maxSplits",
      "status": "verified"
    },
    {
      "key": "hikitsugi.ikujijikan_kaisuu",
      "value": 2,
      "unit": "回",
      "seido_ref": "hikitsugi-junbi-schedule.json#legalDeadlines[key=ikuji-jikan].timesPerDay",
      "status": "verified"
    },
    {
      "key": "hikitsugi.ikujijikan_funsu",
      "value": 30,
      "unit": "分",
      "seido_ref": "hikitsugi-junbi-schedule.json#legalDeadlines[key=ikuji-jikan].minutesEach",
      "status": "verified"
    }
  ],
  "last_updated": "2026-07-17",
  "next_check_due": "2027-04-01",
  "audience": {
    "universal": false,
    "lifeStages": [
      "pregnancy",
      "newborn",
      "infant",
      "adult"
    ],
    "lifeEvents": [
      "pregnant",
      "parenting",
      "working"
    ],
    "childAgeBands": [
      "prenatal",
      "age0_1"
    ],
    "gender": null
  }
}
---

# 産休・育休の引き継ぎはいつから準備する？

## 全体の流れ

産休・育休前の引き継ぎには、「この時期までに終わらせなければならない」という法律上の決まりはありません。法令で期限が定められているのは、産前休業の請求（出産予定日の6週間前、多胎妊娠の場合は14週間前から）と、育児休業の申出（開始予定日の1か月前まで）の2つだけです。それ以外の「業務の棚卸し」「後任者への引き継ぎ」といった段取りは、当サイトが実務上の一般的な流れとして整理した目安であり、この順序・時期どおりに進めなければならないという決まりはありません。

大まかな流れとしては、(1) 妊娠が分かった段階で上司へ報告し就業規則を確認する、(2) 産前休業のおおむね3〜4か月前に開始予定日と復帰時期の見通しを共有し業務の棚卸しをする、(3) 産前休業のおおむね1〜2か月前に引き継ぎ資料を作り後任者と並走する、(4) 産前休業の直前に休業中の連絡方法を決める、という順で進めるケースが一般的です。時期の根拠は法令ではなく目安なので、切迫早産などで予定より早く休業に入ることも珍しくありません。引き継ぎの段取りは本人の体調に優先するものではなく、「前倒しできるものは前倒しする」方向でのみ使ってください。

## ステップ別チェックリスト

※以下は法令上の決まりではなく、段取りの目安です。法令上の期限には「（法令上の期限）」と明記しています。

### ステップ1: 妊娠がわかったら（妊娠初期）
- [ ] 直属の上司へ報告する（報告時期に決まりはない。つわりや通院で業務に影響が出る場合は体調を優先して早めに伝える方が調整しやすい）
- [ ] 会社の就業規則で、産休・育休・時短勤務・独自の休暇制度を確認する
- [ ] 妊娠を申し出ると、会社には制度の個別周知と意向確認の義務が生じる。説明がなければ求めてよい
- [ ] 母性健康管理指導事項連絡カード（母健連絡カード）の存在を知っておく

### ステップ2: 産前休業のおおむね3〜4か月前ごろ（妊娠中期）
- [ ] 産休・育休の開始予定日と、復帰の希望時期の見通しを上司と共有する
- [ ] 担当業務を棚卸しする（定常業務・繁忙期のある業務・自分しか知らない業務・外部との窓口を洗い出す）
- [ ] 後任者・分担先の検討を依頼する（誰が引き継ぐかを決めるのは会社の責任であり、本人が確保する義務はない）
- [ ] 育児休業給付金の見込みなど、休業中の収入を確認する

### ステップ3: 産前休業のおおむね1〜2か月前ごろ（妊娠後期）
- [ ] 引き継ぎ資料を作成する（手順書・関係者リスト・アカウントとアクセス権・進行中案件の状況と次のアクション・判断基準や経緯）
- [ ] 後任者と並走して実際に業務を回してもらう（資料を渡すだけでは引き継がれない）
- [ ] 社外の取引先・関係者に後任者を紹介する
- [ ] 定期的な会議体・メーリングリスト・共有フォルダの権限を後任者に移す
- [ ] 育児休業を取得する場合、開始予定日の1ヶ月前までに会社へ申し出る（法令上の期限）
- [ ] 産前休業を取得する場合、出産予定日の6週間前（多胎妊娠の場合は14週間前）から請求できる（法令上の期限）

### ステップ4: 産前休業の直前
- [ ] 休業中の連絡方法と連絡してよい範囲を決めておく（休業中は労働義務がないため、対応する義務はない）
- [ ] 休業中に会社から届く書類の送付先を確認する
- [ ] 復職時期の目安と、その頃に再度相談する約束をしておく
- [ ] 引き継ぎ資料の所在を後任者・上司の双方が把握している状態にする
- [ ] 産後8週間のうち6週間は法律上いかなる業務にも就けないため、「産後すぐに少しだけ対応する」前提の計画は立てない（法令上の制約）

### ステップ5: 配偶者が産後パパ育休を取る場合（出産予定日の1〜2か月前）
- [ ] 出生時育児休業（産後パパ育休）は開始予定日の2週間前までに申し出る（法令上の期限。ただし労使協定により最長1か月前とされている場合があるため就業規則を確認する）
- [ ] 産後パパ育休（子の出生から8週間以内に、28日以内の範囲で2回まで分割取得可能）と育児休業（2回まで分割取得可能）をどう組み合わせるか、夫婦で分担を設計する
- [ ] 配偶者の妊娠を会社に申し出た時点で、会社には個別周知・意向確認の義務が生じる（本人の妊娠に限られない）

なお、復職後、生後1年に達しない子を育てる場合は、休憩時間とは別に1日2回各30分の育児時間を請求できます。復帰後の働き方を考える材料として押さえておくとよいでしょう。

## 出典・根拠

- 労働基準法（昭和二十二年法律第四十九号）第65条・第66条・第67条（e-Gov法令検索）
- 育児休業、介護休業等育児又は家族介護を行う労働者の福祉に関する法律（平成三年法律第七十六号）第5条・第6条・第9条の2・第9条の3・第21条（e-Gov法令検索）
- 厚生労働省「法改正のポイント｜育児休業制度特設サイト」

---
最終更新日: 2026-07-17

※本記事は一次情報をもとにした情報整理です。個別の状況については自治体・専門機関に確認してください。
