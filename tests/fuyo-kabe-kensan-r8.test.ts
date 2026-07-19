/**
 * 扶養の壁2026 独立検算テスト（令和8年度税制改正ベース。YMYLダブルチェック: 実装者≠検算者）。
 *
 * ★経緯★ 2026-07-19 の全方向診断（docs/13 A-11）で、令和7年分ルール（課税最低限160万円・
 * 配偶者控除の壁123万円）で作った期待値と実装出力（178万円・136万円）が乖離した。
 * 原因は検算側が令和8年度税制改正（令和7年12月26日閣議決定の大綱）を見落としたこと。
 * 「検算者ですら最新改正を見落とす」教訓として、令和8年分の一次資料から導出した期待値を
 * 本テストに恒久化する（2026-07-20 司令塔セッションが一次資料を再取得して確定）。
 *
 * ★このファイルの期待値は、実装（lib/tools/impl/fuyo-kabe.ts）の中身を参照せずに
 *   一次資料だけから導出したもの★ 実装をリファクタリングしてこのテストが落ちた場合、
 *   どちらが一次資料に忠実かを原文で確認すること（条文・大綱が正）。
 *
 * 一次資料（2026-07-20 取得・照合）:
 * - 財務省「令和8年度税制改正の大綱の概要」（令和7年12月26日閣議決定）
 *   https://www.mof.go.jp/tax_policy/tax_reform/outline/fy2026/08taikou_gaiyou.pdf
 *   ・基礎控除: 合計所得2,350万円以下で+4万円（58万→62万円・恒久）
 *   ・特例加算（令和8・9年分）: 合計所得489万円以下 +42万円／489万円超655万円以下 +5万円
 *     → パート帯の基礎控除 = 62 + 42 = 104万円
 *   ・給与所得控除: 最低保障65万→69万円（恒久）+ 特例5万円（所得税は令和8・9年分）= 74万円
 *   ・「所得税の課税最低限を178万円まで特例的に先取りして引き上げる」= 74 + 104 = 178万円
 * - 扶養控除・配偶者控除等の所得要件（令和8年度改正・令和8年分以後）: 58万→62万円
 *   → 給与収入ベースの壁 = 62 + 74 = 136万円
 *   勤労学生控除の所得要件: 85万→89万円 → 収入 89 + 74 = 163万円
 *   特定親族特別控除: 合計所得123万円以下（上限は据置）→ 収入 123 + 74 = 197万円
 *   配偶者特別控除の消失: 合計所得133万円超（据置）→ 収入 133 + 74 = 207万円
 * - 社会保険（税制改正の対象外・金額据置）:
 *   106万円の壁 = 月額賃金8.8万円（日本年金機構・短時間労働者の適用要件）。
 *   令和8(2026)年10月に賃金要件の撤廃が予定（厚労省・年金制度改正法関連の周知資料。
 *   「予定」であり政令期日が変わった場合はデータ側更新に追随して本テストも出典ごと更新する）
 *   130万円の壁 = 被扶養者認定の年収130万円未満（協会けんぽ・日本年金機構）
 *   150万円の壁 = 19〜23歳の被扶養者認定の特例（令和7年10月〜）
 */
import { describe, expect, it } from "vitest";
import {
  evaluateWalls,
  isFuyoKoujoEligible,
  isWageRequirementActive,
  kazeiSaiteiGen,
  kisoKoujo,
  kyuyoKoujoMinimum,
  salaryIncome,
  taxableIncome,
  type FuyoInput,
} from "@/lib/tools/impl/fuyo-kabe";
import seido from "@/data/seido/fuyou-kabe.json";

/** 一次資料から独立に導出した令和8年分の期待値（円） */
const EXPECTED = {
  kyuyoKoujoMin: 740_000, // 69万（恒久）+ 5万（令和8・9年分特例）
  kisoKoujoPart: 1_040_000, // 62万（恒久）+ 42万（合計所得489万円以下の特例）
  kisoKoujoMid: 670_000, // 62万 + 5万（489万円超655万円以下）
  kisoKoujoBase: 620_000, // 62万のみ（655万円超2,350万円以下）
  kazeiSaiteiGen: 1_780_000, // 74万 + 104万
  walls: {
    "shotokuzei-honnin": 1_780_000,
    "fuyou-koujo": 1_360_000, // 62万 + 74万
    "tokutei-shinzoku": 1_970_000, // 123万 + 74万
    "haiguusha-tokubetsu": 2_070_000, // 133万 + 74万
    "kinrou-gakusei": 1_630_000, // 89万 + 74万
    "shaho-106": 1_060_000, // 8.8万×12=105.6万の通称
    "shaho-130": 1_300_000,
    "shaho-150": 1_500_000,
    juuminzei: null, // 級地・条例差のため確定値を出さない（データ設計どおり）
  } as Record<string, number | null>,
};

describe("扶養の壁2026 独立検算（令和8年度税制改正・一次資料由来）", () => {
  it("データの壁金額が一次資料からの独立導出値と一致する", () => {
    const walls = (
      seido as { data: { walls: { items: { key: string; amount2026: number | null }[] } } }
    ).data.walls.items;
    for (const [key, amount] of Object.entries(EXPECTED.walls)) {
      const wall = walls.find((w) => w.key === key);
      expect(wall, `壁 ${key} がデータに存在する`).toBeDefined();
      expect(wall?.amount2026, `壁 ${key} の金額`).toBe(amount);
    }
  });

  it("給与所得控除の最低保障は74万円（69万+特例5万）", () => {
    expect(kyuyoKoujoMinimum()).toBe(EXPECTED.kyuyoKoujoMin);
  });

  it("基礎控除は 104万／67万／62万 の3段（合計所得489万・655万境界）", () => {
    expect(kisoKoujo(0)).toBe(EXPECTED.kisoKoujoPart);
    expect(kisoKoujo(4_890_000)).toBe(EXPECTED.kisoKoujoPart); // 489万円以下（境界含む）
    expect(kisoKoujo(4_890_001)).toBe(EXPECTED.kisoKoujoMid);
    expect(kisoKoujo(6_550_000)).toBe(EXPECTED.kisoKoujoMid); // 655万円以下（境界含む）
    expect(kisoKoujo(6_550_001)).toBe(EXPECTED.kisoKoujoBase);
  });

  it("課税最低限は178万円で、178万円ちょうどまで課税所得が0", () => {
    expect(kazeiSaiteiGen()).toBe(EXPECTED.kazeiSaiteiGen);
    expect(taxableIncome(1_780_000, { isStudent: false })).toBe(0);
    expect(taxableIncome(1_800_000, { isStudent: false })).toBeGreaterThan(0);
  });

  it("給与所得 = 収入 − 74万円（最低保障域: 収入163万円以下で検証）", () => {
    // 収入136万円の壁の根拠: 給与所得 62万円ちょうど
    expect(salaryIncome(1_100_000)).toBe(360_000);
    expect(salaryIncome(1_300_000)).toBe(560_000);
    expect(salaryIncome(1_360_000)).toBe(620_000);
    expect(salaryIncome(1_500_000)).toBe(760_000);
    expect(salaryIncome(1_630_000)).toBe(890_000);
  });

  it("配偶者控除・扶養控除の壁は収入136万円ちょうどが適格の上限", () => {
    expect(isFuyoKoujoEligible(1_360_000)).toBe(true);
    expect(isFuyoKoujoEligible(1_360_001)).toBe(false);
  });

  it("社保106万円の賃金要件は2026年9月まで有効・10月から撤廃（予定）", () => {
    expect(isWageRequirementActive("2026-09")).toBe(true);
    expect(isWageRequirementActive("2026-10")).toBe(false);
  });

  // 本番実測（docs/13 の実機診断で入力したパート主婦3ケース）と同じ入力での黒箱照合。
  // 期待値は一次資料の壁定義から論理的に導出（110万<130万<136万<150万<178万）。
  const base: FuyoInput = {
    salary: 0,
    age: 30,
    target: "spouse",
    isStudent: false,
    employerSize: "unknown",
    weeklyHours: 20,
    overTwoMonths: true,
    supporterSalary: 6_000_000,
    sameHousehold: true,
    baseMonth: "2026-06",
  };
  const wallStatus = (salary: number) => {
    const results = evaluateWalls({ ...base, salary });
    return (key: string) => results.find((w) => w.key === key)?.status;
  };

  it("年収110万円: 130万・136万・178万の壁はすべて手前、106万は勤務先規模不明で要確認", () => {
    const s = wallStatus(1_100_000);
    expect(s("shaho-130")).toBe("safe");
    expect(s("fuyou-koujo")).toBe("safe");
    expect(s("shotokuzei-honnin")).toBe("safe");
    expect(s("shaho-106")).toBe("unknown"); // 110万>106万だが employerSize=unknown
  });

  it("年収130万円: 130万円の壁（130万円未満が要件）を超過、136万円の壁は手前", () => {
    const s = wallStatus(1_300_000);
    expect(s("shaho-130")).toBe("crossed"); // 130万ちょうどは「未満」を満たさない
    expect(s("fuyou-koujo")).toBe("safe");
    expect(s("shotokuzei-honnin")).toBe("safe");
  });

  it("年収150万円: 136万円の壁を超過（配偶者特別控除へ切替）、178万・207万は手前", () => {
    const s = wallStatus(1_500_000);
    expect(s("fuyou-koujo")).toBe("crossed");
    expect(s("shotokuzei-honnin")).toBe("safe");
    expect(s("haiguusha-tokubetsu")).toBe("safe");
  });
});
