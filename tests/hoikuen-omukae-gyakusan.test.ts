import { describe, expect, it } from "vitest";
import {
  calcGyakusan,
  formatDuration,
  formatHHMM,
  parseHHMM,
} from "@/components/tools/impl/HoikuenOmukaeGyakusan.calc";

/*
 * 保育園お迎え逆算 勤務可能時間計算（P2-T35）のテスト。
 * テストケース表は specs/b-tools/p2-t35-hoikuen-omukae-gyakusan.md と対応する。
 * 制度・統計データに依存しない純粋な時刻演算のため、data/tables 等の参照はない。
 */

describe("calcGyakusan", () => {
  it("#1 標準ケース・出勤時刻未入力（退勤限界のみ算出）", () => {
    const r = calcGyakusan({
      omukaeShimekiri: "18:00",
      shokubaToHoikuenMin: 20,
      hoikuenToShokubaMin: 25,
      bufferMin: 10,
      shukkinJikoku: "",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.taikinGenkaiLabel).toBe("17:30");
    expect(r.workable).toBeNull();
    expect(r.asaShuppatsu).toBeNull();
  });

  it("#2 標準ケース・出勤時刻あり（実労働可能時間も算出）", () => {
    const r = calcGyakusan({
      omukaeShimekiri: "18:00",
      shokubaToHoikuenMin: 20,
      hoikuenToShokubaMin: 25,
      bufferMin: 10,
      shukkinJikoku: "09:00",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.taikinGenkaiLabel).toBe("17:30");
    expect(r.workable?.label).toBe("8時間30分");
    expect(r.workable?.minutes).toBe(510);
  });

  it("#3 職場→保育園の移動時間0分", () => {
    const r = calcGyakusan({
      omukaeShimekiri: "18:00",
      shokubaToHoikuenMin: 0,
      hoikuenToShokubaMin: 25,
      bufferMin: 10,
      shukkinJikoku: "09:00",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.taikinGenkaiLabel).toBe("17:50");
    expect(r.workable?.label).toBe("8時間50分");
  });

  it("#4 バッファ0分", () => {
    const r = calcGyakusan({
      omukaeShimekiri: "18:00",
      shokubaToHoikuenMin: 20,
      hoikuenToShokubaMin: 25,
      bufferMin: 0,
      shukkinJikoku: "09:00",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.taikinGenkaiLabel).toBe("17:40");
    expect(r.workable?.label).toBe("8時間40分");
  });

  it("#5 移動時間・バッファすべて0", () => {
    const r = calcGyakusan({
      omukaeShimekiri: "18:00",
      shokubaToHoikuenMin: 0,
      hoikuenToShokubaMin: 0,
      bufferMin: 0,
      shukkinJikoku: "09:00",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.taikinGenkaiLabel).toBe("18:00");
    expect(r.workable?.label).toBe("9時間");
  });

  it("#6 退勤限界時刻がちょうど0:00になる境界値はエラーにしない", () => {
    const r = calcGyakusan({
      omukaeShimekiri: "00:30",
      shokubaToHoikuenMin: 20,
      hoikuenToShokubaMin: 25,
      bufferMin: 10,
      shukkinJikoku: "",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.taikinGenkaiLabel).toBe("00:00");
    expect(r.taikinGenkaiMin).toBe(0);
  });

  it("#7 退勤限界時刻が負になる（日をまたぐ）場合はエラー", () => {
    const r = calcGyakusan({
      omukaeShimekiri: "00:29",
      shokubaToHoikuenMin: 20,
      hoikuenToShokubaMin: 25,
      bufferMin: 10,
      shukkinJikoku: "",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/日をまたぐ/);
  });

  it("#8 出勤時刻が退勤限界時刻より後（勤務時間が負）はエラー", () => {
    const r = calcGyakusan({
      omukaeShimekiri: "18:00",
      shokubaToHoikuenMin: 20,
      hoikuenToShokubaMin: 25,
      bufferMin: 10,
      shukkinJikoku: "18:00",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/出勤時刻より前/);
  });

  it("#9 不正な時刻文字列（時が24以上）はエラー", () => {
    const r = calcGyakusan({
      omukaeShimekiri: "25:00",
      shokubaToHoikuenMin: 20,
      hoikuenToShokubaMin: 25,
      bufferMin: 10,
      shukkinJikoku: "",
    });
    expect(r.ok).toBe(false);
  });

  it("#10 不正な時刻文字列（分が60以上）はエラー", () => {
    const r = calcGyakusan({
      omukaeShimekiri: "9:60",
      shokubaToHoikuenMin: 20,
      hoikuenToShokubaMin: 25,
      bufferMin: 10,
      shukkinJikoku: "",
    });
    expect(r.ok).toBe(false);
  });

  it("#11 数値でない時刻文字列はエラー", () => {
    const r = calcGyakusan({
      omukaeShimekiri: "abc",
      shokubaToHoikuenMin: 20,
      hoikuenToShokubaMin: 25,
      bufferMin: 10,
      shukkinJikoku: "",
    });
    expect(r.ok).toBe(false);
  });

  it("#12 移動時間が負数はエラー", () => {
    const r = calcGyakusan({
      omukaeShimekiri: "18:00",
      shokubaToHoikuenMin: -5,
      hoikuenToShokubaMin: 25,
      bufferMin: 10,
      shukkinJikoku: "",
    });
    expect(r.ok).toBe(false);
  });

  it("#13 バッファが負数はエラー", () => {
    const r = calcGyakusan({
      omukaeShimekiri: "18:00",
      shokubaToHoikuenMin: 20,
      hoikuenToShokubaMin: 25,
      bufferMin: -1,
      shukkinJikoku: "",
    });
    expect(r.ok).toBe(false);
  });

  it("#14 出勤時刻が不正な文字列はエラー", () => {
    const r = calcGyakusan({
      omukaeShimekiri: "18:00",
      shokubaToHoikuenMin: 20,
      hoikuenToShokubaMin: 25,
      bufferMin: 10,
      shukkinJikoku: "abc",
    });
    expect(r.ok).toBe(false);
  });

  it("#15 朝の保育園出発目安がマイナスでも退勤限界・実労働可能時間はブロックしない", () => {
    const r = calcGyakusan({
      omukaeShimekiri: "18:00",
      shokubaToHoikuenMin: 20,
      hoikuenToShokubaMin: 600,
      bufferMin: 10,
      shukkinJikoku: "09:00",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.taikinGenkaiLabel).toBe("17:30");
    expect(r.workable?.label).toBe("8時間30分");
    expect(r.asaShuppatsu?.possible).toBe(false);
  });

  it("移動時間・バッファがNaNの場合はエラー", () => {
    const r = calcGyakusan({
      omukaeShimekiri: "18:00",
      shokubaToHoikuenMin: NaN,
      hoikuenToShokubaMin: 25,
      bufferMin: 10,
      shukkinJikoku: "",
    });
    expect(r.ok).toBe(false);
  });

  it("お迎え締切時刻が空文字の場合はエラー", () => {
    const r = calcGyakusan({
      omukaeShimekiri: "",
      shokubaToHoikuenMin: 20,
      hoikuenToShokubaMin: 25,
      bufferMin: 10,
      shukkinJikoku: "",
    });
    expect(r.ok).toBe(false);
  });
});

describe("parseHHMM", () => {
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
});

describe("formatHHMM / formatDuration", () => {
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
