import { describe, expect, it } from "vitest";
import {
  AUG_2026_SWITCH_DATE,
  calcKaigoShisetsuHiyou,
  resolvePeriod,
  ROOM_TYPES_ROKEN,
  ROOM_TYPES_TOKUYO,
  roomOptionsFor,
  STAGE_ORDER,
  shisetsuTypeInfo,
} from "@/components/tools/impl/KaigoShisetsuHiyouHayami.calc";

/** 仕様書 specs/b-tools/p2-t39-kaigo-shisetsu-hiyou-hayami.md の「テストケース表」を反映 */

const BASE = "2026-07-17";

describe("KaigoShisetsuHiyouHayami.calc — 仕様書テストケース表", () => {
  it("#1 特養・多床室・第1段階 → 食費300円/日・居住費0円/日・合計300円/日・月9,000円", () => {
    const r = calcKaigoShisetsuHiyou({ shisetsuKey: "tokuyo", roomType: "多床室", today: BASE });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const line = r.lines.find((l) => l.stageKey === "stage1");
    expect(line?.shokuhiPerDay).toBe(300);
    expect(line?.kyojuhiPerDay).toBe(0);
    expect(line?.totalPerDay).toBe(300);
    expect(line?.monthlyTotal30Days).toBe(9000);
  });

  it("#2 特養・ユニット型個室・第4段階 → 月105,330円（monthlyExampleUnit と一致）", () => {
    const r = calcKaigoShisetsuHiyou({
      shisetsuKey: "tokuyo",
      roomType: "ユニット型個室",
      today: BASE,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const line = r.lines.find((l) => l.stageKey === "stage4");
    expect(line?.shokuhiPerDay).toBe(1445);
    expect(line?.kyojuhiPerDay).toBe(2066);
    expect(line?.totalPerDay).toBe(3511);
    expect(line?.monthlyTotal30Days).toBe(105330);
    expect(r.monthlyExamples?.unit).toContain("約61,980円");
  });

  it("#3 特養・多床室・第4段階 → 月70,800円（monthlyExampleTokuyo と一致）", () => {
    const r = calcKaigoShisetsuHiyou({ shisetsuKey: "tokuyo", roomType: "多床室", today: BASE });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const line = r.lines.find((l) => l.stageKey === "stage4");
    expect(line?.totalPerDay).toBe(2360);
    expect(line?.monthlyTotal30Days).toBe(70800);
    expect(r.monthlyExamples?.multiBed).toContain("約27,450円");
  });

  it("#4 老健・多床室（室料を徴収しない場合）・第2段階 → 食費390円/日・居住費430円/日・月24,600円", () => {
    const r = calcKaigoShisetsuHiyou({
      shisetsuKey: "roken",
      roomType: "多床室（室料を徴収しない場合）",
      today: BASE,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const line = r.lines.find((l) => l.stageKey === "stage2");
    expect(line?.shokuhiPerDay).toBe(390);
    expect(line?.kyojuhiPerDay).toBe(430);
    expect(line?.totalPerDay).toBe(820);
    expect(line?.monthlyTotal30Days).toBe(24600);
  });

  it("#5 介護医療院・従来型個室・第1段階 → 食費300円/日・居住費550円/日・月25,500円（iryoinはkyojuhiRokenを共有）", () => {
    const r = calcKaigoShisetsuHiyou({
      shisetsuKey: "iryoin",
      roomType: "従来型個室",
      today: BASE,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const line = r.lines.find((l) => l.stageKey === "stage1");
    expect(line?.shokuhiPerDay).toBe(300);
    expect(line?.kyojuhiPerDay).toBe(550);
    expect(line?.totalPerDay).toBe(850);
    expect(line?.monthlyTotal30Days).toBe(25500);
  });

  it("#6 特定施設入居者生活介護（有料老人ホーム等） → 費用データなし・補足給付対象外", () => {
    const r = calcKaigoShisetsuHiyou({ shisetsuKey: "tokutei-shisetsu", today: BASE });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.hasCostData).toBe(false);
    expect(r.lines).toHaveLength(0);
    expect(r.minkan?.hojokyufuNotApplicable).toBe(true);
    expect(r.admissionRequirement).toBeUndefined();
    expect(r.minkan?.publicInfoSourceText).not.toMatch(/https?:\/\//);
  });

  it("#7 特養を選ぶと入所要件（要介護3以上）が定義される", () => {
    const r = calcKaigoShisetsuHiyou({ shisetsuKey: "tokuyo", today: BASE });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.admissionRequirement?.requiredLevelMin).toBe(3);
    expect(r.admissionRequirement?.requiredLevelValue).toContain("要介護3");
  });

  it("#8 特養以外は入所要件が定義されない", () => {
    for (const key of ["roken", "iryoin", "tokutei-shisetsu"] as const) {
      const r = calcKaigoShisetsuHiyou({ shisetsuKey: key, today: BASE });
      expect(r.ok).toBe(true);
      if (!r.ok) continue;
      expect(r.admissionRequirement).toBeUndefined();
    }
  });

  it("#9 不正な施設タイプはエラーを返す", () => {
    const r = calcKaigoShisetsuHiyou({ shisetsuKey: "invalid", today: BASE });
    expect(r.ok).toBe(false);
  });

  it("#10 ショートステイの食費（stage2）は通常と異なる値を使う", () => {
    const r = calcKaigoShisetsuHiyou({
      shisetsuKey: "tokuyo",
      roomType: "多床室",
      isShortStay: true,
      today: BASE,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const line = r.lines.find((l) => l.stageKey === "stage2");
    expect(line?.shokuhiPerDay).toBe(600);
    expect(line?.kyojuhiPerDay).toBe(430);
    expect(line?.totalPerDay).toBe(1030);
    expect(line?.monthlyTotal30Days).toBe(30900);
  });

  it("#11 ショートステイでも第4段階は基準費用額（kijunHiyou）を使う", () => {
    const r = calcKaigoShisetsuHiyou({
      shisetsuKey: "tokuyo",
      roomType: "多床室",
      isShortStay: true,
      today: BASE,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const line = r.lines.find((l) => l.stageKey === "stage4");
    expect(line?.shokuhiPerDay).toBe(1445);
    expect(line?.kyojuhiPerDay).toBe(915);
  });

  it("#12 2026年8月1日以降・特養・多床室・第3段階② → 改正後の値（kaigo-hoken.jsonのfromAug2026）", () => {
    const r = calcKaigoShisetsuHiyou({
      shisetsuKey: "tokuyo",
      roomType: "多床室",
      today: "2026-08-01",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.period).toBe("fromAug2026");
    const line = r.lines.find((l) => l.stageKey === "stage3b");
    expect(line?.shokuhiPerDay).toBe(1420);
    expect(line?.kyojuhiPerDay).toBe(530);
    expect(line?.totalPerDay).toBe(1950);
    expect(line?.monthlyTotal30Days).toBe(58500);
  });

  it("#13 2026年8月1日以降・老健・従来型個室・第3段階① → 改正後の値", () => {
    const r = calcKaigoShisetsuHiyou({
      shisetsuKey: "roken",
      roomType: "従来型個室",
      today: "2026-08-01",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const line = r.lines.find((l) => l.stageKey === "stage3a");
    expect(line?.shokuhiPerDay).toBe(680);
    expect(line?.kyojuhiPerDay).toBe(1370);
    expect(line?.totalPerDay).toBe(2050);
    expect(line?.monthlyTotal30Days).toBe(61500);
  });

  it("#14 2026年7月31日（境界の前日）は改正前の値を使う", () => {
    expect(resolvePeriod("2026-07-31")).toBe("beforeAug2026");
  });

  it("#15 2026年8月1日（境界日）は改正後の値を使う", () => {
    expect(resolvePeriod("2026-08-01")).toBe("fromAug2026");
  });

  it("#16 存在しない部屋タイプは既定値にフォールバックする（エラーにしない）", () => {
    const r = calcKaigoShisetsuHiyou({ shisetsuKey: "tokuyo", roomType: "和室", today: BASE });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.selectedRoomType).toBe(ROOM_TYPES_TOKUYO[0]);
  });

  it("#17 lines は常に5件、stage1〜stage4の固定順", () => {
    const r = calcKaigoShisetsuHiyou({ shisetsuKey: "tokuyo", today: BASE });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.lines.map((l) => l.stageKey)).toEqual(STAGE_ORDER);
    expect(r.lines).toHaveLength(5);
  });

  it("#18 段階のラベルは「第◯段階」", () => {
    const r = calcKaigoShisetsuHiyou({ shisetsuKey: "tokuyo", today: BASE });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.lines.map((l) => l.stageLabel)).toEqual([
      "第1段階",
      "第2段階",
      "第3段階①",
      "第3段階②",
      "第4段階",
    ]);
  });

  it("#19 shisetsuKey 未指定は既定で特養として計算される", () => {
    const r = calcKaigoShisetsuHiyou({ today: BASE });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.shisetsuKey).toBe("tokuyo");
  });

  it("#20 roomType 未指定（特養）は先頭の部屋タイプにフォールバックする", () => {
    const r = calcKaigoShisetsuHiyou({ shisetsuKey: "tokuyo", today: BASE });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.selectedRoomType).toBe("ユニット型個室");
  });

  it("#21 老健・医療院は「施設サービス」、有料老人ホーム等は「居宅サービス」である旨がcharacterに含まれない場合はserviceNameで区別できる", () => {
    const roken = shisetsuTypeInfo("roken");
    const iryoin = shisetsuTypeInfo("iryoin");
    const tokutei = shisetsuTypeInfo("tokutei-shisetsu");
    expect(roken?.serviceName).toContain("介護保健施設サービス");
    expect(iryoin?.serviceName).toContain("介護医療院サービス");
    expect(tokutei?.serviceName).toContain("居宅サービス");
  });

  it("#22 AUG_2026_SWITCH_DATE はデータから導出され、2026-08-01である（ハードコードでない回帰確認）", () => {
    expect(AUG_2026_SWITCH_DATE).toBe("2026-08-01");
  });

  it("#23 roomOptionsFor は施設グループごとに正しい選択肢を返す", () => {
    expect(roomOptionsFor("tokuyo")).toEqual(ROOM_TYPES_TOKUYO);
    expect(roomOptionsFor("roken")).toEqual(ROOM_TYPES_ROKEN);
    expect(roomOptionsFor("iryoin")).toEqual(ROOM_TYPES_ROKEN);
    expect(roomOptionsFor("tokutei-shisetsu")).toEqual([]);
  });

  it("#24 特養・従来型個室・第3段階① → 老健の同室タイプより基準費用額が低い（特養1,231円 vs 老健1,728円）", () => {
    const tokuyo = calcKaigoShisetsuHiyou({
      shisetsuKey: "tokuyo",
      roomType: "従来型個室",
      today: BASE,
    });
    const roken = calcKaigoShisetsuHiyou({
      shisetsuKey: "roken",
      roomType: "従来型個室",
      today: BASE,
    });
    expect(tokuyo.ok && roken.ok).toBe(true);
    if (!tokuyo.ok || !roken.ok) return;
    const tokuyoStage4 = tokuyo.lines.find((l) => l.stageKey === "stage4");
    const rokenStage4 = roken.lines.find((l) => l.stageKey === "stage4");
    expect(tokuyoStage4?.kyojuhiPerDay).toBe(1231);
    expect(rokenStage4?.kyojuhiPerDay).toBe(1728);
  });
});
