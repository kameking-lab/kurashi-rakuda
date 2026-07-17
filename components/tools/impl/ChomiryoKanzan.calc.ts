/*
 * 調味料換算（Q3-14）の計算ロジック（純関数）。
 * ChomiryoKanzan.tsx から呼び出される。UIから分離することで vitest（node環境）から
 * 直接importしてテストできるようにしている（他のB級ツールと同じ構成）。
 * 比重データの本整備は Q2-4（packages/data 相当）で行い、ここは主要18種の参考値。
 */

/** 大さじ1杯（15ml）あたりのグラム数（一般的な調理用計量表の参考値） */
export const INGREDIENTS: { name: string; gPerTbsp: number }[] = [
  { name: "水", gPerTbsp: 15 },
  { name: "しょうゆ", gPerTbsp: 18 },
  { name: "みりん", gPerTbsp: 18 },
  { name: "料理酒", gPerTbsp: 15 },
  { name: "酢", gPerTbsp: 15 },
  { name: "みそ", gPerTbsp: 18 },
  { name: "砂糖（上白糖）", gPerTbsp: 9 },
  { name: "塩", gPerTbsp: 18 },
  { name: "小麦粉（薄力粉）", gPerTbsp: 9 },
  { name: "片栗粉", gPerTbsp: 9 },
  { name: "サラダ油", gPerTbsp: 12 },
  { name: "バター", gPerTbsp: 12 },
  { name: "マヨネーズ", gPerTbsp: 12 },
  { name: "ケチャップ", gPerTbsp: 18 },
  { name: "はちみつ", gPerTbsp: 21 },
  { name: "牛乳", gPerTbsp: 15 },
  { name: "生クリーム", gPerTbsp: 15 },
  { name: "めんつゆ", gPerTbsp: 18 },
];

export const UNITS = ["大さじ", "小さじ", "g", "ml"] as const;
export type Unit = (typeof UNITS)[number];

export function toMl(amount: number, unit: Unit, gPerTbsp: number): number {
  switch (unit) {
    case "大さじ":
      return amount * 15;
    case "小さじ":
      return amount * 5;
    case "ml":
      return amount;
    case "g":
      return amount / (gPerTbsp / 15);
  }
}

export function fmt(n: number): string {
  return (Math.round(n * 10) / 10).toLocaleString("ja-JP");
}
