/*
 * 調味料換算（Q3-14）の計算ロジック（純関数）。
 * ChomiryoKanzan.tsx から呼び出される。UIから分離することで vitest（node環境）から
 * 直接importしてテストできるようにしている（他のB級ツールと同じ構成）。
 * 比重データのSSOTは data/tables/chomiryo-hijuu.json（2026-07-17 移設。ここに数値を書かない）。
 * 出典の特定性向上と食材拡充は Q2-4 の課題。
 */
import hijuu from "@/data/tables/chomiryo-hijuu.json";

/** 大さじ1杯（15ml）あたりのグラム数（一般的な調理用計量表の参考値） */
export const INGREDIENTS: { name: string; gPerTbsp: number }[] = hijuu.items;

export const UNITS = ["大さじ", "小さじ", "g", "ml"] as const;
export type Unit = (typeof UNITS)[number];

export function toMl(amount: number, unit: Unit, gPerTbsp: number): number {
  switch (unit) {
    case "大さじ":
      return amount * hijuu.tbspMl;
    case "小さじ":
      return amount * hijuu.tspMl;
    case "ml":
      return amount;
    case "g":
      return amount / (gPerTbsp / hijuu.tbspMl);
  }
}

export function fmt(n: number): string {
  return (Math.round(n * 10) / 10).toLocaleString("ja-JP");
}
