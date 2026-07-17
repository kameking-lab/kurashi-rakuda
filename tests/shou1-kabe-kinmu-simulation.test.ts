import { describe, expect, it } from "vitest";
import {
  calcShou1KabeKinmuSimulation,
  formatDuration,
  formatHHMM,
  getGradeWaitingStat,
  parseHHMM,
  WAITING_CHILDREN_TOTAL,
} from "@/components/tools/impl/Shou1KabeKinmuSimulation.calc";

/*
 * 小1の壁 勤務シミュレーション（学童時間×勤務時間）（P2-T36）のテスト。
 * テストケース表は specs/b-tools/p2-t36-shou1-kabe-kinmu-simulation.md と対応する。
 * 学童の閉所時刻・移動時間・退勤時刻はいずれもユーザー入力であり、全国一律値をデータから
 * 取得できない（gakudou-hoiku-kijun.json 参照）ため、時刻演算部分は制度データに依存しない。
 */

describe("calcShou1KabeKinmuSimulation", () => {
  it("#1 標準ケース・出勤時刻未入力", () => {
    const r = calcShou1KabeKinmuSimulation({
      gakudouHeishoJikoku: "18:00",
      gakudouKaraJitakuIdouMin: 10,
      taikinJikoku: "18:30",
      shokubaKaraJitakuIdouMin: 40,
      bufferMin: 10,
      shukkinJikoku: "",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.kodomoKitakuLabel).toBe("18:10");
    expect(r.oyaKitakuLabel).toBe("19:20");
    expect(r.hitoriJikan.minutes).toBe(70);
    expect(r.hitoriJikan.label).toBe("1時間10分");
    expect(r.workable).toBeNull();
  });

  it("#2 標準ケース・出勤時刻あり（実労働可能時間も算出）", () => {
    const r = calcShou1KabeKinmuSimulation({
      gakudouHeishoJikoku: "18:00",
      gakudouKaraJitakuIdouMin: 10,
      taikinJikoku: "18:30",
      shokubaKaraJitakuIdouMin: 40,
      bufferMin: 10,
      shukkinJikoku: "09:00",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.hitoriJikan.label).toBe("1時間10分");
    expect(r.taikinGenkai.possible).toBe(true);
    expect(r.taikinGenkai.label).toBe("17:20");
    expect(r.workable?.label).toBe("8時間20分");
    expect(r.workable?.minutes).toBe(500);
  });

  it("#3 親が先に帰宅する場合は一人になる時間0分", () => {
    const r = calcShou1KabeKinmuSimulation({
      gakudouHeishoJikoku: "18:00",
      gakudouKaraJitakuIdouMin: 10,
      taikinJikoku: "17:00",
      shokubaKaraJitakuIdouMin: 10,
      bufferMin: 5,
      shukkinJikoku: "",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.kodomoKitakuLabel).toBe("18:10");
    expect(r.oyaKitakuLabel).toBe("17:15");
    expect(r.hitoriJikan.minutes).toBe(0);
    expect(r.hitoriJikan.label).toBe("0分");
  });

  it("#4 移動時間・バッファすべて0で時刻も一致", () => {
    const r = calcShou1KabeKinmuSimulation({
      gakudouHeishoJikoku: "18:00",
      gakudouKaraJitakuIdouMin: 0,
      taikinJikoku: "18:00",
      shokubaKaraJitakuIdouMin: 0,
      bufferMin: 0,
      shukkinJikoku: "",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.kodomoKitakuLabel).toBe("18:00");
    expect(r.oyaKitakuLabel).toBe("18:00");
    expect(r.hitoriJikan.minutes).toBe(0);
  });

  it("#5 退勤が学童閉所より大幅に遅い異常値でもエラーにしない", () => {
    const r = calcShou1KabeKinmuSimulation({
      gakudouHeishoJikoku: "18:00",
      gakudouKaraJitakuIdouMin: 10,
      taikinJikoku: "20:00",
      shokubaKaraJitakuIdouMin: 30,
      bufferMin: 10,
      shukkinJikoku: "",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.hitoriJikan.minutes).toBe(150);
    expect(r.hitoriJikan.label).toBe("2時間30分");
  });

  it("#6 不正な時刻文字列（学童閉所時刻の時が24以上）はエラー", () => {
    const r = calcShou1KabeKinmuSimulation({
      gakudouHeishoJikoku: "25:00",
      gakudouKaraJitakuIdouMin: 10,
      taikinJikoku: "18:30",
      shokubaKaraJitakuIdouMin: 40,
      bufferMin: 10,
      shukkinJikoku: "",
    });
    expect(r.ok).toBe(false);
  });

  it("#7 不正な時刻文字列（退勤時刻の分が60以上）はエラー", () => {
    const r = calcShou1KabeKinmuSimulation({
      gakudouHeishoJikoku: "18:00",
      gakudouKaraJitakuIdouMin: 10,
      taikinJikoku: "9:60",
      shokubaKaraJitakuIdouMin: 40,
      bufferMin: 10,
      shukkinJikoku: "",
    });
    expect(r.ok).toBe(false);
  });

  it("#8 学童→自宅の移動時間が負数はエラー", () => {
    const r = calcShou1KabeKinmuSimulation({
      gakudouHeishoJikoku: "18:00",
      gakudouKaraJitakuIdouMin: -5,
      taikinJikoku: "18:30",
      shokubaKaraJitakuIdouMin: 40,
      bufferMin: 10,
      shukkinJikoku: "",
    });
    expect(r.ok).toBe(false);
  });

  it("#9 バッファが負数はエラー", () => {
    const r = calcShou1KabeKinmuSimulation({
      gakudouHeishoJikoku: "18:00",
      gakudouKaraJitakuIdouMin: 10,
      taikinJikoku: "18:30",
      shokubaKaraJitakuIdouMin: 40,
      bufferMin: -1,
      shukkinJikoku: "",
    });
    expect(r.ok).toBe(false);
  });

  it("#10 出勤時刻が不正な文字列はエラー", () => {
    const r = calcShou1KabeKinmuSimulation({
      gakudouHeishoJikoku: "18:00",
      gakudouKaraJitakuIdouMin: 10,
      taikinJikoku: "18:30",
      shokubaKaraJitakuIdouMin: 40,
      bufferMin: 10,
      shukkinJikoku: "abc",
    });
    expect(r.ok).toBe(false);
  });

  it("#11 子どもの帰宅時刻が24:00以上（日をまたぐ）はエラー", () => {
    const r = calcShou1KabeKinmuSimulation({
      gakudouHeishoJikoku: "23:50",
      gakudouKaraJitakuIdouMin: 60,
      taikinJikoku: "18:00",
      shokubaKaraJitakuIdouMin: 10,
      bufferMin: 5,
      shukkinJikoku: "",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/日をまたぐ/);
  });

  it("#12 親の帰宅時刻が24:00以上（日をまたぐ）はエラー", () => {
    const r = calcShou1KabeKinmuSimulation({
      gakudouHeishoJikoku: "18:00",
      gakudouKaraJitakuIdouMin: 10,
      taikinJikoku: "23:50",
      shokubaKaraJitakuIdouMin: 60,
      bufferMin: 30,
      shukkinJikoku: "",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/日をまたぐ/);
  });

  it("#13 移動時間が長すぎて退勤限界時刻が算出できない場合もhitoriJikanはブロックしない", () => {
    const r = calcShou1KabeKinmuSimulation({
      gakudouHeishoJikoku: "08:00",
      gakudouKaraJitakuIdouMin: 0,
      taikinJikoku: "00:00",
      shokubaKaraJitakuIdouMin: 700,
      bufferMin: 0,
      shukkinJikoku: "",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.kodomoKitakuLabel).toBe("08:00");
    expect(r.oyaKitakuLabel).toBe("11:40");
    expect(r.hitoriJikan.minutes).toBe(220);
    expect(r.hitoriJikan.label).toBe("3時間40分");
    expect(r.taikinGenkai.possible).toBe(false);
    expect(r.taikinGenkai.minutes).toBeNull();
  });

  it("#14 出勤時刻が退勤限界時刻より後の場合、実労働可能時間のみnullになる（エラーにしない）", () => {
    const r = calcShou1KabeKinmuSimulation({
      gakudouHeishoJikoku: "18:00",
      gakudouKaraJitakuIdouMin: 10,
      taikinJikoku: "18:30",
      shokubaKaraJitakuIdouMin: 40,
      bufferMin: 10,
      shukkinJikoku: "19:00",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.taikinGenkai.label).toBe("17:20");
    expect(r.workable).toBeNull();
  });

  it("#15 学童の閉所時刻が空文字はエラー", () => {
    const r = calcShou1KabeKinmuSimulation({
      gakudouHeishoJikoku: "",
      gakudouKaraJitakuIdouMin: 10,
      taikinJikoku: "18:30",
      shokubaKaraJitakuIdouMin: 40,
      bufferMin: 10,
      shukkinJikoku: "",
    });
    expect(r.ok).toBe(false);
  });

  it("移動時間・バッファがNaNの場合はエラー", () => {
    const r = calcShou1KabeKinmuSimulation({
      gakudouHeishoJikoku: "18:00",
      gakudouKaraJitakuIdouMin: NaN,
      taikinJikoku: "18:30",
      shokubaKaraJitakuIdouMin: 40,
      bufferMin: 10,
      shukkinJikoku: "",
    });
    expect(r.ok).toBe(false);
  });

  it("数値でない時刻文字列（学童閉所時刻）はエラー", () => {
    const r = calcShou1KabeKinmuSimulation({
      gakudouHeishoJikoku: "abc",
      gakudouKaraJitakuIdouMin: 10,
      taikinJikoku: "18:30",
      shokubaKaraJitakuIdouMin: 40,
      bufferMin: 10,
      shukkinJikoku: "",
    });
    expect(r.ok).toBe(false);
  });

  it("職場から自宅までの移動時間が負数はエラー", () => {
    const r = calcShou1KabeKinmuSimulation({
      gakudouHeishoJikoku: "18:00",
      gakudouKaraJitakuIdouMin: 10,
      taikinJikoku: "18:30",
      shokubaKaraJitakuIdouMin: -1,
      bufferMin: 10,
      shukkinJikoku: "",
    });
    expect(r.ok).toBe(false);
  });
});

describe("parseHHMM / formatHHMM / formatDuration", () => {
  it("正しい形式は分数に変換される", () => {
    expect(parseHHMM("18:00")).toBe(1080);
    expect(parseHHMM("00:00")).toBe(0);
    expect(parseHHMM("23:59")).toBe(1439);
  });

  it("不正な形式は null を返す", () => {
    expect(parseHHMM("24:00")).toBeNull();
    expect(parseHHMM("9:5")).toBeNull();
    expect(parseHHMM("")).toBeNull();
  });

  it("formatHHMM はゼロ埋めした HH:mm を返す", () => {
    expect(formatHHMM(0)).toBe("00:00");
    expect(formatHHMM(1050)).toBe("17:30");
  });

  it("formatDuration は時間・分を組み合わせて表示する", () => {
    expect(formatDuration(510)).toBe("8時間30分");
    expect(formatDuration(60)).toBe("1時間");
    expect(formatDuration(45)).toBe("45分");
    expect(formatDuration(0)).toBe("0分");
  });
});

describe("getGradeWaitingStat（学年別待機児童数の参考情報）", () => {
  it("学年を指定すると、その学年の待機児童数を返す", () => {
    const stat = getGradeWaitingStat(4);
    expect(stat?.grade).toBe(4);
    expect(stat?.count).toBe(5589);
  });

  it("null を渡すと null を返す（学年未選択）", () => {
    expect(getGradeWaitingStat(null)).toBeNull();
  });

  it("全国合計の待機児童数は data/seido/gakudou-hoiku-kijun.json 由来の値と一致する", () => {
    expect(WAITING_CHILDREN_TOTAL).toBe(16330);
  });
});
