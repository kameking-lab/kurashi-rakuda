/*
 * 子育て世帯の給付金・助成金 総ざらいチェッカー（P2-T02）— 計算ロジック本体（純関数）。
 * 仕様: specs/s-tools/18-kosodate-kyufu-sougou-check.md
 *
 * SSOT: data/seido/kosodate-kyufu-sougou-check.json。
 * ★このファイルは金額・所得制限・給付率を一切持たない（designNote）★。
 *   本ツールも金額計算はせず、「どの制度が自分に関係しうるか」「どこに問い合わせるか」への
 *   道案内に徹する。各制度の詳細計算は個別ツール（児童手当・児童扶養手当等）に委ねる。
 */
import seido from "@/data/seido/kosodate-kyufu-sougou-check.json";
import type { SeidoDataset } from "@/lib/tools/seido";

export const kosodateKyufuDataset = seido as unknown as SeidoDataset;
export const KOSODATE_KYUFU_DISCLAIMER = seido.disclaimer;

/** {value,...} 形式なら value を、素の値ならそのまま返す */
function val<T>(node: unknown): T {
  if (node && typeof node === "object" && "value" in (node as Record<string, unknown>)) {
    return (node as { value: T }).value;
  }
  return node as T;
}

export type LifeStage = "妊娠" | "出産・育児" | "未就学" | "小学生" | "中学生" | "高校生";

export const LIFE_STAGES: LifeStage[] = [
  "妊娠",
  "出産・育児",
  "未就学",
  "小学生",
  "中学生",
  "高校生",
];

export interface ProgramInfo {
  key: string;
  name: string;
  category: string;
  targetSummary: string;
  lifeStage: LifeStage[];
  /** すべての世帯が対象になりうるか（false＝所得等の条件による） */
  isUniversal: boolean;
  authority: string;
  applicationTo: string;
  hasApplicationDeadline: boolean;
  dataFile: string;
}

function normalize(p: Record<string, unknown>): ProgramInfo {
  return {
    key: val<string>(p.key),
    name: val<string>(p.name),
    category: val<string>(p.category),
    targetSummary: val<string>(p.targetSummary),
    lifeStage: val<LifeStage[]>(p.lifeStage),
    isUniversal: val<boolean>(p.isUniversal),
    authority: val<string>(p.authority),
    applicationTo: val<string>(p.applicationTo),
    hasApplicationDeadline: val<boolean>(p.hasApplicationDeadline),
    dataFile: val<string>(p.dataFile),
  };
}

export const ALL_PROGRAMS: ProgramInfo[] = (seido.data.programs as Record<string, unknown>[]).map(
  normalize,
);

export interface MatchInput {
  lifeStage: LifeStage;
  /** ひとり親世帯か（児童扶養手当を強調する） */
  singleParent?: boolean;
}

export interface MatchResult {
  ok: true;
  stage: LifeStage;
  /** ライフステージに該当する制度（isUniversal を先に、次に条件付き） */
  matched: ProgramInfo[];
  universalCount: number;
  conditionalCount: number;
  /** ひとり親向けに特に確認すべき制度キー */
  emphasizedKeys: string[];
}

export function matchPrograms(input: MatchInput): MatchResult {
  const matched = ALL_PROGRAMS.filter((p) => p.lifeStage.includes(input.lifeStage)).sort((a, b) => {
    if (a.isUniversal !== b.isUniversal) return a.isUniversal ? -1 : 1;
    return 0;
  });

  const emphasizedKeys: string[] = [];
  if (input.singleParent) {
    for (const p of matched) {
      if (p.key === "jidou-fuyou-teate") emphasizedKeys.push(p.key);
    }
  }

  return {
    ok: true,
    stage: input.lifeStage,
    matched,
    universalCount: matched.filter((p) => p.isUniversal).length,
    conditionalCount: matched.filter((p) => !p.isUniversal).length,
    emphasizedKeys,
  };
}

/** サイト内の関連ツールへの内部リンク（送客ではなく自ツールへの導線）。無い制度は null */
export const RELATED_TOOL_SLUG: Record<string, string | null> = {
  "jido-teate": "jido-teate",
  "ikukyu-kyufu": "sankyu-ikukyu-money",
  "shussan-oen-kofukin": null,
  "youji-kyouiku-mushouka": "youji-mushouka-checker",
  "jidou-fuyou-teate": "jidou-fuyou-teate",
  "kodomo-iryouhi-jyosei": "kodomo-iryouhi-jyosei",
  "koukou-shugaku-shienkin": null,
  "shugaku-enjo-seido": null,
};

export function relatedToolSlug(key: string): string | null {
  return RELATED_TOOL_SLUG[key] ?? null;
}
