import { describe, expect, it } from "vitest";
import {
  ANCHOR_INU_DATE,
  calcInunohi,
  formatDateJa,
  isInuNoHi,
  isValidDateString,
  weekdayJa,
} from "@/components/tools/impl/Inunohi.calc";

/**
 * Q3-02 戌の日計算・安産祈願カレンダー
 * テストケースは specs/b-tools/02-inu-no-hi-calendar.md の「テストケース（10件）」表を反映。
 */

describe("isInuNoHi: アンカー日と2026年公開戌の日カレンダーとの整合", () => {
  it("アンカー日 2026-01-12 自身は戌の日である", () => {
    expect(isInuNoHi(ANCHOR_INU_DATE)).toBe(true);
  });

  it.each([
    "2026-01-12",
    "2026-01-24",
    "2026-02-05",
    "2026-02-17",
    "2026-03-01",
    "2026-04-30",
    "2026-06-17",
    "2026-09-09",
    "2026-12-26",
  ])("2026年公開戌の日カレンダー掲載日 %s は戌の日と判定される", (date) => {
    expect(isInuNoHi(date)).toBe(true);
  });

  it.each(["2026-01-13", "2026-01-23", "2026-04-29", "2026-05-01"])(
    "戌の日の翌日・前日 %s は戌の日ではない",
    (date) => {
      expect(isInuNoHi(date)).toBe(false);
    },
  );
});

describe("calcInunohi: 仕様書テストケース表（#1〜#10）", () => {
  it("#1 基準ケース（lmp=2026-01-01）", () => {
    const out = calcInunohi({ inputMode: "lmp", lmp: "2026-01-01", baseDate: "2026-01-01" });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.month5Start).toBe("2026-04-23");
    expect(out.result.firstInuNoHi).toBe("2026-04-30");
    expect(weekdayJa(out.result.firstInuNoHi)).toBe("木");
    expect(out.result.isPast).toBe(false);
  });

  it("#2 月またぎの探索（lmp=2026-02-14）", () => {
    const out = calcInunohi({ inputMode: "lmp", lmp: "2026-02-14", baseDate: "2026-02-14" });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.month5Start).toBe("2026-06-06");
    expect(out.result.firstInuNoHi).toBe("2026-06-17");
    expect(weekdayJa(out.result.firstInuNoHi)).toBe("水");
  });

  it("#3 5ヶ月開始日そのものが戌の日（探索0日目、lmp=2026-05-20）", () => {
    const out = calcInunohi({ inputMode: "lmp", lmp: "2026-05-20", baseDate: "2026-05-20" });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.month5Start).toBe("2026-09-09");
    expect(out.result.firstInuNoHi).toBe("2026-09-09");
    expect(weekdayJa(out.result.firstInuNoHi)).toBe("水");
  });

  it("#4 年またぎのLMP（lmp=2025-12-01）", () => {
    const out = calcInunohi({ inputMode: "lmp", lmp: "2025-12-01", baseDate: "2025-12-01" });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.month5Start).toBe("2026-03-23");
    expect(out.result.firstInuNoHi).toBe("2026-03-25");
    expect(weekdayJa(out.result.firstInuNoHi)).toBe("水");
  });

  it("#5 5ヶ月開始日が年をまたぐ（lmp=2026-09-15）", () => {
    const out = calcInunohi({ inputMode: "lmp", lmp: "2026-09-15", baseDate: "2026-09-15" });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.month5Start).toBe("2027-01-05");
    expect(out.result.firstInuNoHi).toBe("2027-01-07");
    expect(weekdayJa(out.result.firstInuNoHi)).toBe("木");
  });

  it("#6 月末日LMP（lmp=2026-06-30）", () => {
    const out = calcInunohi({ inputMode: "lmp", lmp: "2026-06-30", baseDate: "2026-06-30" });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.month5Start).toBe("2026-10-20");
    expect(out.result.firstInuNoHi).toBe("2026-10-27");
    expect(weekdayJa(out.result.firstInuNoHi)).toBe("火");
  });

  it("#7 探索区間がうるう年(2028)の2月29日をまたぐ（lmp=2027-11-05）", () => {
    const out = calcInunohi({ inputMode: "lmp", lmp: "2027-11-05", baseDate: "2027-11-05" });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.month5Start).toBe("2028-02-25");
    expect(out.result.firstInuNoHi).toBe("2028-03-02");
  });

  it("#8 edd入力（edd=2026-10-08）はlmp逆算で#1と同じ結果になる", () => {
    const out = calcInunohi({ inputMode: "edd", edd: "2026-10-08", baseDate: "2026-10-08" });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.month5Start).toBe("2026-04-23");
    expect(out.result.firstInuNoHi).toBe("2026-04-30");
    expect(weekdayJa(out.result.firstInuNoHi)).toBe("木");
  });

  it("#9 baseDateが最初の戌の日より後 → 経過済みバッジ＋次の戌の日を案内", () => {
    const out = calcInunohi({ inputMode: "lmp", lmp: "2026-01-01", baseDate: "2026-05-05" });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.firstInuNoHi).toBe("2026-04-30");
    expect(out.result.isPast).toBe(true);
    expect(out.result.nextInuNoHi).toBe("2026-05-12");
  });

  it("#9b 妊娠19週以降（firstから2周期以上経過）でも次の戌の日は基準日以降になる（G2検収指摘）", () => {
    // lmp=2025-09-01 → firstInuNoHi は2026年1月。基準日2026-07-17 時点で約6ヶ月経過
    const out = calcInunohi({ inputMode: "lmp", lmp: "2025-09-01", baseDate: "2026-07-17" });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.isPast).toBe(true);
    const next = out.result.nextInuNoHi;
    expect(next).not.toBeNull();
    // 基準日以降であること（過去日を「次」と案内しない）
    expect(next! >= "2026-07-17").toBe(true);
    // 12日周期上にあること（firstInuNoHi との差が12の倍数）
    const ms =
      new Date(`${next}T00:00:00Z`).getTime() -
      new Date(`${out.result.firstInuNoHi}T00:00:00Z`).getTime();
    expect((ms / 86400000) % 12).toBe(0);
  });

  it("#9c 基準日がちょうど戌の日なら当日を「次の戌の日」として返す", () => {
    // 2026-05-12 は #9 で戌の日と確認済み
    const out = calcInunohi({ inputMode: "lmp", lmp: "2026-01-01", baseDate: "2026-05-12" });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.isPast).toBe(true);
    expect(out.result.nextInuNoHi).toBe("2026-05-12");
  });

  it("#10 lmpがbaseDateより未来 → バリデーションエラー", () => {
    const out = calcInunohi({ inputMode: "lmp", lmp: "2026-05-01", baseDate: "2026-04-01" });
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.error).toBe("最終月経開始日は基準日以前の日付を入力してください。");
  });
});

describe("calcInunohi: 追加のエッジケース", () => {
  it("calendarCount を指定するとその件数分の戌の日が12日おきに並ぶ", () => {
    const out = calcInunohi({
      inputMode: "lmp",
      lmp: "2026-01-01",
      baseDate: "2026-01-01",
      calendarCount: 4,
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.calendar).toEqual([
      "2026-04-30",
      "2026-05-12",
      "2026-05-24",
      "2026-06-05",
    ]);
  });

  it("calendarCount=0 は範囲外エラー", () => {
    const out = calcInunohi({ inputMode: "lmp", lmp: "2026-01-01", calendarCount: 0 });
    expect(out.ok).toBe(false);
  });

  it("calendarCount=13 は範囲外エラー", () => {
    const out = calcInunohi({ inputMode: "lmp", lmp: "2026-01-01", calendarCount: 13 });
    expect(out.ok).toBe(false);
  });

  it("lmpが基準日より330日以上前はエラー", () => {
    const out = calcInunohi({ inputMode: "lmp", lmp: "2025-01-01", baseDate: "2026-01-01" });
    expect(out.ok).toBe(false);
  });

  it("edd未入力（inputMode=edd）はエラー", () => {
    const out = calcInunohi({ inputMode: "edd" });
    expect(out.ok).toBe(false);
  });

  it("不正なlmp（存在しない日付）はエラー", () => {
    const out = calcInunohi({ inputMode: "lmp", lmp: "2026-02-30" });
    expect(out.ok).toBe(false);
  });
});

describe("補助関数", () => {
  it("isValidDateString は実在しない日付を弾く", () => {
    expect(isValidDateString("2026-02-30")).toBe(false);
    expect(isValidDateString("2026-04-30")).toBe(true);
  });

  it("formatDateJa は「年月日（曜日）」形式で整形する", () => {
    expect(formatDateJa("2026-04-30")).toBe("2026年4月30日（木）");
  });
});
