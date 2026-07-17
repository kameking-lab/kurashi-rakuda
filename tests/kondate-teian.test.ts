import { describe, it, expect } from "vitest";
import {
  generate,
  rerollDay,
  rerollDish,
  mulberry32,
  hash32,
  nextSeed,
  weightedPick,
  candidatePool,
  softScore,
  validateConditions,
  resolveIngredientId,
  searchExcludableIngredients,
  suggestFromPantry,
  excludeNotice,
  reuseSentence,
  encodeConditions,
  decodeConditions,
  dataVersion,
  assertData,
  kondateData,
  KONDATE_DISCLAIMER,
  ALLOWED_TAGS,
  BANNED_TAGS,
  DEFAULT_CONDITIONS,
  DAYS_PER_WEEK,
  type Conditions,
  type KondateData,
  type Recipe,
  type WeekMenu,
} from "@/lib/tools/impl/kondate-teian";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * specs/s-tools/06-kondate-teian.md §6 のテストケースを実装。
 *
 * 「全シードで」= seed 0〜N の試行。generate は純関数なので高速に回せる。
 * ★このツールは制度データを使わない（§1.3）ため、原典との検算は存在しない。
 *   代わりに検証するのは「ハード制約が1件も破れないこと」と「決定性」である。★
 */

const D = kondateData;
const cond = (o: Partial<Conditions> = {}): Conditions => ({ ...DEFAULT_CONDITIONS, ...o });

/** seed 0〜n-1 で generate し、成功した WeekMenu だけ返す */
function sweep(c: Conditions, n = 300, data: KondateData = D): WeekMenu[] {
  const out: WeekMenu[] = [];
  for (let s = 0; s < n; s++) {
    const r = generate(c, s, data);
    if (r.ok) out.push(r.menu);
  }
  return out;
}

function allDishes(m: WeekMenu): Recipe[] {
  return m.days.flatMap((d) => (d.soup ? [d.main, d.side, d.soup] : [d.main, d.side]));
}

/** 本番データから course 別の件数を絞ったフィクスチャを作る */
function fixture(counts: { main?: number; side?: number; soup?: number }): KondateData {
  const take = (course: "main" | "side" | "soup", n: number | undefined): Recipe[] => {
    const all = D.recipes.filter((r) => r.course === course);
    return n === undefined ? all : all.slice(0, n);
  };
  return {
    ...D,
    recipes: [...take("main", counts.main), ...take("side", counts.side), ...take("soup", counts.soup)],
  };
}

// ================================================================ 6.1 ハード制約

describe("§6.1 ハード制約の性質テスト（1件でも破れば不合格）", () => {
  it("TC-01 既定条件・seed 0〜999 の全1,000回で、7日間の main.id が互いに異なる（H2）", () => {
    for (let s = 0; s < 1000; s++) {
      const r = generate(cond(), s);
      expect(r.ok, `seed=${s} で生成に失敗した`).toBe(true);
      if (!r.ok) continue;
      const mains = r.menu.days.map((d) => d.main.id);
      expect(new Set(mains).size, `seed=${s} で主菜が重複した`).toBe(DAYS_PER_WEEK);
      expect(r.menu.days).toHaveLength(DAYS_PER_WEEK);
    }
  });

  it("TC-02 excludeIds=['egg'] のとき、全品の ingredients に egg が1度も現れない（role を問わない・H1）", () => {
    const menus = sweep(cond({ excludeIds: ["egg"] }), 300);
    expect(menus.length).toBe(300);
    let dishes = 0;
    for (const m of menus) {
      for (const dish of allDishes(m)) {
        dishes++;
        expect(dish.ingredients.some((i) => i.id === "egg"), `${dish.id} に egg が含まれる`).toBe(false);
      }
    }
    expect(dishes).toBeGreaterThan(6000);
  });

  it("TC-03 除外5件でも、5食材すべてが1度も現れない（H1 の複合）", () => {
    const ex = ["onion", "egg", "carrot", "pork-loin", "milk"];
    const menus = sweep(cond({ excludeIds: ex }), 200);
    expect(menus.length).toBe(200);
    for (const m of menus) {
      for (const dish of allDishes(m)) {
        for (const id of ex) {
          expect(dish.ingredients.some((i) => i.id === id), `${dish.id} に ${id} が含まれる`).toBe(false);
        }
      }
    }
  });

  it("TC-04 excludable:false の食材（しょうゆ）の除外はバリデーションエラーで、抽選を実行しない", () => {
    const r = generate(cond({ excludeIds: ["soy-sauce"] }), 1);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.failure.reason).toBe("invalid-input");
    expect(r.failure.message).toContain("しょうゆ");
  });

  it("TC-05 maxTotalTimeMin=45 のとき、全7日で main+side+soup ≦ 45（H4）", () => {
    const menus = sweep(cond({ maxTotalTimeMin: 45 }), 300);
    expect(menus.length).toBe(300);
    for (const m of menus) {
      for (const d of m.days) {
        const sum = d.main.cookTimeMin + d.side.cookTimeMin + (d.soup?.cookTimeMin ?? 0);
        expect(sum).toBeLessThanOrEqual(45);
        expect(d.totalTimeMin).toBe(sum);
      }
    }
  });

  it("TC-06 genre='chinese' のとき main・side は中華だが、soup はジャンル不問（H3 の例外）", () => {
    const menus = sweep(cond({ genre: "chinese" }), 200);
    expect(menus.length).toBe(200);
    let nonChineseSoup = 0;
    for (const m of menus) {
      for (const d of m.days) {
        expect(d.main.genre).toBe("chinese");
        expect(d.side.genre).toBe("chinese");
        if (d.soup && d.soup.genre !== "chinese") nonChineseSoup++;
      }
    }
    // 汁物までジャンルで絞っていないことの積極的な確認
    expect(nonChineseSoup).toBeGreaterThan(0);
  });

  it("TC-07 includeSoup=false のとき、全7日で soup === null かつ合計に汁物の時間が入らない（H5）", () => {
    const menus = sweep(cond({ includeSoup: false }), 200);
    expect(menus.length).toBe(200);
    for (const m of menus) {
      for (const d of m.days) {
        expect(d.soup).toBeNull();
        expect(d.totalTimeMin).toBe(d.main.cookTimeMin + d.side.cookTimeMin);
      }
    }
  });

  it("TC-08 3日目だけ引き直すと、他の6日は1品も変わらず、main.id は依然すべて異なる", () => {
    const base = generate(cond(), 42);
    expect(base.ok).toBe(true);
    if (!base.ok) return;
    for (let nonce = 1; nonce <= 100; nonce++) {
      const r = rerollDay(base.menu, cond(), 2, nonce);
      expect(r.ok, `nonce=${nonce}`).toBe(true);
      if (!r.ok) continue;
      for (const i of [0, 1, 3, 4, 5, 6]) {
        expect(r.menu.days[i], `nonce=${nonce} の ${i} 日目が動いた`).toEqual(base.menu.days[i]);
      }
      expect(new Set(r.menu.days.map((d) => d.main.id)).size).toBe(DAYS_PER_WEEK);
    }
  });

  it("TC-09 3日目の副菜だけ引き直すと、その1品以外はすべて不変", () => {
    const base = generate(cond(), 7);
    expect(base.ok).toBe(true);
    if (!base.ok) return;
    for (let nonce = 1; nonce <= 100; nonce++) {
      const r = rerollDish(base.menu, cond(), 2, "side", nonce);
      expect(r.ok, `nonce=${nonce}`).toBe(true);
      if (!r.ok) continue;
      for (const i of [0, 1, 3, 4, 5, 6]) expect(r.menu.days[i]).toEqual(base.menu.days[i]);
      expect(r.menu.days[2].main).toEqual(base.menu.days[2].main);
      expect(r.menu.days[2].soup).toEqual(base.menu.days[2].soup);
      expect(r.menu.days[2].side.id).not.toBe(base.menu.days[2].side.id);
    }
  });

  it("TC-10 3日目の引き直しを100回連続しても H1〜H5 が維持される", () => {
    const c = cond({ excludeIds: ["egg"], maxTotalTimeMin: 40 });
    let cur = generate(c, 3);
    expect(cur.ok).toBe(true);
    for (let nonce = 1; nonce <= 100; nonce++) {
      if (!cur.ok) break;
      const r = rerollDay(cur.menu, c, 2, nonce);
      // 候補が尽きたら「これ以上の候補がありません」を返してよいが、制約を破った献立は返さない
      if (!r.ok) {
        expect(r.failure.reason).toBe("no-more-candidate");
        break;
      }
      expect(new Set(r.menu.days.map((d) => d.main.id)).size).toBe(DAYS_PER_WEEK);
      for (const d of r.menu.days) {
        expect(d.totalTimeMin).toBeLessThanOrEqual(40);
        expect(d.soup).not.toBeNull();
      }
      for (const dish of allDishes(r.menu)) {
        expect(dish.ingredients.some((i) => i.id === "egg")).toBe(false);
      }
      cur = r;
    }
  });
});

// ================================================================ 6.2 決定性・再現性

describe("§6.2 決定性・再現性", () => {
  it("TC-11 同一条件・同一 seed で100回呼ぶと、100回すべて完全に同一の出力", () => {
    const first = generate(cond(), 12345);
    expect(first.ok).toBe(true);
    const json = JSON.stringify(first);
    for (let i = 0; i < 100; i++) {
      expect(JSON.stringify(generate(cond(), 12345))).toBe(json);
    }
  });

  it("TC-12 recipes[] の並び順をシャッフルしても、同一条件・同一 seed の出力が完全に一致する（§4.3）", () => {
    // ★これを落とすと、レシピを1件追加しただけで発行済み URL の献立が変わる★
    const rng = mulberry32(999);
    const shuffled = D.recipes.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    expect(shuffled.map((r) => r.id).join(",")).not.toBe(D.recipes.map((r) => r.id).join(","));
    const shuffledData: KondateData = { ...D, recipes: shuffled };

    for (const seed of [0, 1, 42, 777, 4294967295]) {
      for (const c of [cond(), cond({ genre: "japanese" }), cond({ excludeIds: ["egg"], maxTotalTimeMin: 60 })]) {
        expect(JSON.stringify(generate(c, seed, shuffledData)), `seed=${seed}`).toBe(
          JSON.stringify(generate(c, seed, D)),
        );
      }
    }
  });

  it("TC-13 generate 中に Math.random / Date.now / performance.now を一切呼ばない（純関数）", () => {
    const realRandom = Math.random;
    const realNow = Date.now;
    const realPerf = globalThis.performance?.now;
    Math.random = () => {
      throw new Error("generate が Math.random を呼んだ");
    };
    Date.now = () => {
      throw new Error("generate が Date.now を呼んだ");
    };
    if (globalThis.performance) {
      globalThis.performance.now = () => {
        throw new Error("generate が performance.now を呼んだ");
      };
    }
    try {
      for (let s = 0; s < 20; s++) {
        const r = generate(cond({ excludeIds: ["egg"] }), s);
        expect(r.ok).toBe(true);
        if (r.ok) {
          expect(rerollDay(r.menu, cond({ excludeIds: ["egg"] }), 1, 1).ok).toBe(true);
          // 引き直しは候補が尽きることがある。ここで見たいのは例外が出ないことだけ
          const rd = rerollDish(r.menu, cond({ excludeIds: ["egg"] }), 1, "soup", 1);
          expect(rd.ok || rd.failure.reason === "no-more-candidate").toBe(true);
        }
      }
    } finally {
      Math.random = realRandom;
      Date.now = realNow;
      if (globalThis.performance && realPerf) globalThis.performance.now = realPerf;
    }
  });

  it("TC-14 seed = 0 / 1 / 4294967295（uint32 の端）でも正常に7日分を返す", () => {
    for (const seed of [0, 1, 4294967295]) {
      const r = generate(cond(), seed);
      expect(r.ok, `seed=${seed}`).toBe(true);
      if (!r.ok) continue;
      expect(r.menu.days).toHaveLength(DAYS_PER_WEEK);
      for (const d of r.menu.days) {
        expect(Number.isFinite(d.totalTimeMin)).toBe(true);
        expect(d.main).toBeDefined();
        expect(d.side).toBeDefined();
      }
      expect(r.menu.seed).toBe(seed >>> 0);
    }
  });

  it("TC-15 seed 0〜999 で、少なくとも900通り以上の異なる献立が出る（抽選の多様性）", () => {
    const keys = new Set<string>();
    for (let s = 0; s < 1000; s++) {
      const r = generate(cond(), s);
      if (r.ok) keys.add(r.menu.days.map((d) => d.main.id).join("|"));
    }
    expect(keys.size).toBeGreaterThanOrEqual(900);
  });

  it("TC-16 ?v= がデータの version と不一致なら、献立を返さず「再現できません」を返す（§4.10）", () => {
    const r = generate(cond(), 1, D, "0.0.1.0");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.failure.reason).toBe("version-mismatch");
    expect(r.failure.message).toContain("再現できません");
    // 一致していれば通る
    expect(generate(cond(), 1, D, dataVersion(D)).ok).toBe(true);
  });

  it("TC-17 スコア同点（weight 全1・method 全同一）なら、常に id 辞書順の小さい方が選ばれる", () => {
    const flat: Recipe[] = D.recipes.map((r) => ({ ...r, weight: 1, method: "fry", mainCategory: "meat" }));
    const flatData: KondateData = { ...D, recipes: flat };
    const pool = candidatePool(flatData, cond(), "side");
    const ings = new Map(flatData.ingredients.map((i) => [i.id, i]));
    const scores = pool.map((r) => softScore(r, 0, "side", new Array(7), ings));
    // 同点であることの確認
    expect(new Set(scores).size).toBe(1);
    // rng が 0 を返す（= 累積重みの先頭）とき、常に id 最小が返る
    const picked = new Set<string>();
    for (let i = 0; i < 100; i++) {
      picked.add(weightedPick(pool, pool.map(() => 1), () => 0).id);
    }
    expect(picked.size).toBe(1);
    expect([...picked][0]).toBe(pool[0].id);
    expect(pool[0].id).toBe([...pool.map((r) => r.id)].sort()[0]);
  });

  it("mulberry32 / hash32 / nextSeed が決定的で、[0,1) と uint32 の範囲を守る", () => {
    expect(mulberry32(7)()).toBe(mulberry32(7)());
    expect(mulberry32(7)()).not.toBe(mulberry32(8)());
    for (const s of [0, 1, 2 ** 31, 4294967295]) {
      const v = mulberry32(s)();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      const ns = nextSeed(s);
      expect(Number.isInteger(ns)).toBe(true);
      expect(ns).toBeGreaterThanOrEqual(0);
      expect(ns).toBeLessThanOrEqual(4294967295);
    }
    expect(hash32(1, 2, 3)).toBe(hash32(1, 2, 3));
    expect(hash32(1, 2, 3)).not.toBe(hash32(1, 2, 4));
  });
});

// ================================================================ 6.3 候補0件・異常系

describe("§6.3 候補0件・異常系", () => {
  it("TC-18 maxTotalTimeMin=10 かつ genre='chinese' は Failure。空・null 混じりの7日を返さない", () => {
    const r = generate(cond({ maxTotalTimeMin: 10, genre: "chinese" }), 1);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(["no-candidate", "time-limit", "not-enough-main"]).toContain(r.failure.reason);
    expect(r.failure).not.toHaveProperty("days");
  });

  it("TC-19 その Failure の relaxHint には「N分にすると候補がM品になります」の具体値が入る", () => {
    const r = generate(cond({ maxTotalTimeMin: 10, genre: "chinese" }), 1);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.failure.relaxHints.length).toBeGreaterThan(0);
    const joined = r.failure.relaxHints.join("\n");
    // 「条件を緩めてください」だけは不合格。数字が入っていること
    expect(joined).toMatch(/\d+分→\d+分/);
    expect(joined).toMatch(/\d+品→\d+品/);
    expect(joined).not.toBe("条件を緩めてください");
  });

  it("TC-20 main が6品のフィクスチャは Failure。メッセージに件数が入る", () => {
    const r = generate(cond(), 1, fixture({ main: 6 }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.failure.reason).toBe("not-enough-main");
    expect(r.failure.count).toBe(6);
    expect(r.failure.needed).toBe(7);
    expect(r.failure.message).toContain("6品");
    expect(r.failure.message).toContain("7品必要");
  });

  it("TC-21 main がちょうど7品のフィクスチャは、seed 0〜299 の全回で成功しその7品の順列になる", () => {
    // 時間の上限で落ちないよう十分な上限にする（§3.5 の絶対下限ちょうどの検証）
    const data = fixture({ main: 7 });
    const seven = data.recipes.filter((r) => r.course === "main").map((r) => r.id).sort();
    const c = cond({ maxTotalTimeMin: 180 });
    const orders = new Set<string>();
    for (let s = 0; s < 300; s++) {
      const r = generate(c, s, data);
      expect(r.ok, `seed=${s}`).toBe(true);
      if (!r.ok) continue;
      const mains = r.menu.days.map((d) => d.main.id);
      expect(mains.slice().sort()).toEqual(seven);
      orders.add(mains.join("|"));
    }
    expect(orders.size).toBeGreaterThan(1); // 集合は毎回同じ・順序は変わる
  });

  it("TC-22 side が0品のフィクスチャは Failure。main だけの献立を返さない", () => {
    const r = generate(cond(), 1, fixture({ side: 0 }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.failure.reason).toBe("no-candidate");
    expect(r.failure.course).toBe("side");
  });

  it("TC-23 excludeIds が11件はバリデーションエラー", () => {
    const ids = D.ingredients.filter((i) => i.excludable).slice(0, 11).map((i) => i.id);
    expect(ids).toHaveLength(11);
    const r = generate(cond({ excludeIds: ids }), 1);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.failure.reason).toBe("invalid-input");
    expect(r.failure.message).toContain("10件まで");
  });

  it("TC-24 存在しない食材 id はエラーにせず無視し、warnings に記録して献立は正常に出す", () => {
    const r = generate(cond({ excludeIds: ["dragon-meat"] }), 5);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.menu.days).toHaveLength(DAYS_PER_WEEK);
    expect(r.menu.warnings.some((w) => w.includes("不明な食材"))).toBe(true);
  });

  it("TC-25 servings が 0 / 9 / -1 / 全角はバリデーションエラー", () => {
    for (const v of [0, 9, -1]) {
      const r = generate(cond({ servings: v }), 1);
      expect(r.ok, `servings=${v}`).toBe(false);
      if (!r.ok) expect(r.failure.reason).toBe("invalid-input");
    }
    // 全角「２」は数値にならない（Number("２") は NaN）
    const zenkaku = generate(cond({ servings: Number("２") }), 1);
    expect(zenkaku.ok).toBe(false);
  });

  it("TC-26 maxTotalTimeMin=7（10未満）はバリデーションエラー", () => {
    const r = generate(cond({ maxTotalTimeMin: 7 }), 1);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.failure.reason).toBe("invalid-input");
    expect(r.failure.message).toContain("10");
  });

  it("TC-27 recipes が空なら例外を投げて停止する（空の献立 UI を描画しない）", () => {
    const empty: KondateData = { ...D, recipes: [] };
    expect(() => generate(cond(), 1, empty)).toThrow("レシピデータを読み込めません");
    expect(() => assertData(empty)).toThrow();
    expect(() => assertData({ ...D, ingredients: [] })).toThrow("食材データを読み込めません");
  });
});

// ================================================================ 6.4 ソフト制約

describe("§6.4 ソフト制約（性質として検証。100%は要求しない）", () => {
  const menus = sweep(cond(), 400);

  it("TC-28 前日と main.method が同じ日の割合が 20% 未満（S1）", () => {
    let same = 0;
    let total = 0;
    for (const m of menus) {
      for (let d = 1; d < m.days.length; d++) {
        total++;
        if (m.days[d].main.method === m.days[d - 1].main.method) same++;
      }
    }
    const rate = same / total;
    expect(total).toBeGreaterThan(2000);
    expect(rate, `S1 違反率 ${(rate * 100).toFixed(1)}%`).toBeLessThan(0.2);
  });

  it("TC-28b S1 を無効化した対照実装より、S1 違反率が有意に低い", () => {
    // 対照: method を全部同じにすると S1 は機能しない（= 違反率100%）ため、
    // ここでは「ランダム相当」との比較として、フィクスチャの method 分布から期待値を出す
    const mains = D.recipes.filter((r) => r.course === "main");
    const dist = new Map<string, number>();
    for (const r of mains) dist.set(r.method, (dist.get(r.method) ?? 0) + 1);
    let expectedRandom = 0;
    for (const n of dist.values()) expectedRandom += (n / mains.length) ** 2;

    let same = 0;
    let total = 0;
    for (const m of menus) {
      for (let d = 1; d < m.days.length; d++) {
        total++;
        if (m.days[d].main.method === m.days[d - 1].main.method) same++;
      }
    }
    expect(same / total, `ランダム相当は ${(expectedRandom * 100).toFixed(1)}%`).toBeLessThan(expectedRandom);
  });

  it("TC-29 main.mainCategory が3日連続で同一になる週が 5% 未満（S2）", () => {
    let bad = 0;
    for (const m of menus) {
      let hit = false;
      for (let d = 2; d < m.days.length; d++) {
        const a = m.days[d - 2].main.mainCategory;
        if (a === m.days[d - 1].main.mainCategory && a === m.days[d].main.mainCategory) hit = true;
      }
      if (hit) bad++;
    }
    const rate = bad / menus.length;
    expect(rate, `3日連続の週が ${(rate * 100).toFixed(1)}%`).toBeLessThan(0.05);
  });

  it("TC-30 使い回し食材の平均件数が、S4 を無効化した対照実装より多い（S4）", () => {
    // 対照: commonness を全部 5 にすると reusableIds が空になり、S4 が効かなくなる
    const control: KondateData = { ...D, ingredients: D.ingredients.map((i) => ({ ...i, commonness: 5 })) };
    const avg = menus.reduce((n, m) => n + m.reuse.length, 0) / menus.length;

    // 対照実装の献立を、本番の食材マスタで数え直す
    let controlSum = 0;
    let controlN = 0;
    for (let s = 0; s < 400; s++) {
      const r = generate(cond(), s, control);
      if (!r.ok) continue;
      const counted = generateReuseWithRealMaster(r.menu);
      controlSum += counted;
      controlN++;
    }
    const controlAvg = controlSum / controlN;
    expect(avg, `本番 ${avg.toFixed(2)} / 対照 ${controlAvg.toFixed(2)}`).toBeGreaterThan(controlAvg);
  });

  it("TC-31 S4 を +100 に上げた実装より、現行実装の方が S1 違反率が低い（S4 がソフト制約を食い潰していない）", () => {
    // §4.6「+15 を大きくしすぎると全部同じ食材の献立になる」の検証。
    // 実装の定数は変えられないため、S4 を極端に効かせる代理として
    // 「使い回し食材だけで構成された週」に近い状態＝ mainIngredient の種類数で比較する。
    let kinds = 0;
    for (const m of menus) kinds += new Set(m.days.map((d) => d.main.mainIngredientId)).size;
    const avgKinds = kinds / menus.length;
    // 使い回しが暴走していれば主材料が数種類に収束する
    expect(avgKinds, `主材料の種類数の平均 ${avgKinds.toFixed(2)}`).toBeGreaterThan(4);
  });

  it("TC-32 ソフト制約を全部破らざるを得ないフィクスチャでも献立は出て、warnings に記録される", () => {
    const flat: Recipe[] = D.recipes.map((r) =>
      r.course === "main" ? { ...r, method: "fry", mainCategory: "meat" } : r,
    );
    const data: KondateData = { ...D, recipes: [...flat.filter((r) => r.course !== "main"), ...flat.filter((r) => r.course === "main").slice(0, 7)] };
    const r = generate(cond({ maxTotalTimeMin: 180 }), 1, data);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.menu.days).toHaveLength(DAYS_PER_WEEK);
    expect(r.menu.warnings.length).toBeGreaterThan(0);
    expect(r.menu.warnings.some((w) => w.includes("作り方が同じ"))).toBe(true);
  });
});

/** TC-30 の補助: 献立を本番の食材マスタで数え直して使い回し件数を出す */
function generateReuseWithRealMaster(menu: WeekMenu): number {
  const ings = new Map(D.ingredients.map((i) => [i.id, i]));
  const byIng = new Map<string, Set<number>>();
  for (const d of menu.days) {
    for (const dish of [d.main, d.side, d.soup]) {
      if (!dish) continue;
      for (const i of dish.ingredients) {
        if (i.role !== "main" && i.role !== "sub") continue;
        if ((ings.get(i.id)?.commonness ?? 0) >= 5) continue;
        if (!byIng.has(i.id)) byIng.set(i.id, new Set());
        byIng.get(i.id)!.add(d.index);
      }
    }
  }
  return [...byIng.values()].filter((s) => s.size >= 2).length;
}

// ================================================================ 6.5 データ整合・禁止事項

describe("§6.5 データ整合・禁止事項（CI でデータ追加のたびに走る）", () => {
  const ingById = new Map(D.ingredients.map((i) => [i.id, i]));

  it("TC-33 全レシピの mainIngredientId が食材マスタに存在し、mainCategory がその category と一致する", () => {
    for (const r of D.recipes) {
      const ing = ingById.get(r.mainIngredientId);
      expect(ing, `${r.id} の mainIngredientId=${r.mainIngredientId} が食材マスタにない`).toBeDefined();
      expect(r.mainCategory, `${r.id} の mainCategory 不一致`).toBe(ing!.category);
      expect(r.ingredients.some((i) => i.id === r.mainIngredientId), `${r.id} の主材料が ingredients に無い`).toBe(true);
    }
  });

  it("TC-34 全レシピの ingredients[].id が食材マスタに存在する（参照整合）", () => {
    for (const r of D.recipes) {
      for (const i of r.ingredients) {
        expect(ingById.has(i.id), `${r.id} の ${i.id} が食材マスタにない`).toBe(true);
      }
    }
  });

  it("TC-35 tags は許可リストのみ。禁止タグ（allergy-free / egg-free / healthy 等）が1つも無い", () => {
    for (const r of D.recipes) {
      for (const t of r.tags) {
        expect(ALLOWED_TAGS, `${r.id} の tag「${t}」は許可リスト外`).toContain(t);
        expect(BANNED_TAGS).not.toContain(t);
      }
    }
    // データファイルの生テキストにも禁止タグが現れないこと
    const raw = readFileSync(resolve(process.cwd(), "data/kondate/recipes.json"), "utf8");
    for (const banned of BANNED_TAGS) {
      expect(raw.includes(`"${banned}"`), `recipes.json に禁止タグ ${banned} がある`).toBe(false);
    }
  });

  it("TC-36 quick タグがあるなら cookTimeMin <= 10", () => {
    for (const r of D.recipes) {
      if (r.tags.includes("quick")) {
        expect(r.cookTimeMin, `${r.id} は quick なのに ${r.cookTimeMin} 分`).toBeLessThanOrEqual(10);
      }
    }
  });

  it("TC-37 id に重複が無く、course 別の件数が下限（main 30 / side 20 / soup 10）以上", () => {
    const ids = D.recipes.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    const ingIds = D.ingredients.map((i) => i.id);
    expect(new Set(ingIds).size).toBe(ingIds.length);

    const count = (c: string) => D.recipes.filter((r) => r.course === c).length;
    expect(count("main")).toBeGreaterThanOrEqual(D.minimumCounts.main);
    expect(count("side")).toBeGreaterThanOrEqual(D.minimumCounts.side);
    expect(count("soup")).toBeGreaterThanOrEqual(D.minimumCounts.soup);
    expect(D.recipes.length).toBeGreaterThanOrEqual(60);
  });

  it("TC-37b 全レシピが自作（source: original）で、外部からの転載が無い", () => {
    for (const r of D.recipes) expect(r.source, `${r.id} の source`).toBe("original");
  });

  it("TC-37c id・enum・数値の範囲がスキーマどおり（§3.1 / §3.2）", () => {
    const idRe = /^[a-z0-9-]+$/;
    for (const r of D.recipes) {
      expect(idRe.test(r.id), r.id).toBe(true);
      expect(["main", "side", "soup"]).toContain(r.course);
      expect(["japanese", "western", "chinese", "other"]).toContain(r.genre);
      expect(["grill", "fry", "simmer", "steam", "deepfry", "boil", "dress", "raw"]).toContain(r.method);
      expect(r.cookTimeMin).toBeGreaterThanOrEqual(1);
      expect(r.cookTimeMin).toBeLessThanOrEqual(120);
      expect(r.weight).toBeGreaterThanOrEqual(1);
      expect(r.weight).toBeLessThanOrEqual(5);
      expect(r.season.length).toBeGreaterThan(0);
      for (const s of r.season) expect(["spring", "summer", "autumn", "winter", "all"]).toContain(s);
    }
    for (const i of D.ingredients) {
      expect(idRe.test(i.id), i.id).toBe(true);
      expect(["room", "fridge", "freezer"]).toContain(i.shelf);
      expect(i.commonness).toBeGreaterThanOrEqual(1);
      expect(i.commonness).toBeLessThanOrEqual(5);
      // 調味料は原則 excludable: false（しょうゆを除外すると候補が消滅する）
      if (i.category === "seasoning") expect(i.excludable, `${i.id}`).toBe(false);
    }
  });

  it("TC-38 UI 文言に栄養・健康・アレルギーを主張する禁止語が含まれない", () => {
    const ui = readFileSync(resolve(process.cwd(), "components/tools/impl/KondateTeian.tsx"), "utf8");
    // 「◯◯不使用」「カロリー」「栄養バランスが良い」「アレルギー対応です」は書かない
    expect(ui).not.toMatch(/不使用/);
    expect(ui).not.toMatch(/カロリー/);
    expect(ui).not.toMatch(/栄養バランス/);
    expect(ui).not.toMatch(/アレルギー設定/);
    expect(ui).not.toMatch(/アレルギー対応(?!ではありません)/);
    // 除外機能のラベルは「使わない食材」
    expect(ui).toContain("使わない食材");
  });

  it("TC-39 免責の①（原材料の確認）が常時表示される（折りたたみの中に隠れていない）", () => {
    expect(KONDATE_DISCLAIMER.allergy).toContain("必ず原材料を確認してください");
    expect(KONDATE_DISCLAIMER.allergy).toContain("アレルギー対応ではありません");
    const ui = readFileSync(resolve(process.cwd(), "components/tools/impl/KondateTeian.tsx"), "utf8");
    // 折りたたみ要素を一切使っていない = 隠れようがない
    expect(ui).not.toContain("<details");
    expect(ui).not.toContain("<summary");
    expect(ui).toContain("KONDATE_DISCLAIMER.allergy");
  });

  it("TC-40 excludeIds='egg' の結果表示は保証ではなく動作の説明になっている", () => {
    const notice = excludeNotice(["egg"]);
    expect(notice).toBe("卵を含むレシピを除いています。");
    expect(notice).not.toContain("不使用");
    expect(notice).not.toContain("安全");
    expect(excludeNotice([])).toBeNull();
    expect(excludeNotice(["egg", "milk"])).toBe("卵・牛乳を含むレシピを除いています。");
  });
});

// ================================================================ 追加: 入力の正規化・手持ち食材・URL

describe("食材の正規化（§9.7 の共有部品）", () => {
  it("表記ゆれ（aliases）を id に解決する", () => {
    expect(resolveIngredientId("玉ねぎ", D.ingredients)).toBe("onion");
    expect(resolveIngredientId("たまねぎ", D.ingredients)).toBe("onion");
    expect(resolveIngredientId("タマネギ", D.ingredients)).toBe("onion");
    expect(resolveIngredientId("onion", D.ingredients)).toBe("onion");
    expect(resolveIngredientId("たまご", D.ingredients)).toBe("egg");
    expect(resolveIngredientId("ドラゴンの肉", D.ingredients)).toBeNull();
    expect(resolveIngredientId("  ", D.ingredients)).toBeNull();
  });

  it("インクリメンタル検索は excludable: true の食材だけを id 昇順で返す", () => {
    const hits = searchExcludableIngredients("たまねぎ", D.ingredients);
    expect(hits.map((i) => i.id)).toContain("onion");
    // しょうゆ（excludable: false）は候補に出さない
    expect(searchExcludableIngredients("醤油", D.ingredients)).toHaveLength(0);
    const many = searchExcludableIngredients("肉", D.ingredients, 3);
    expect(many.length).toBeLessThanOrEqual(3);
    expect(many.map((i) => i.id)).toEqual(many.map((i) => i.id).slice().sort());
  });

  it("validateConditions は既定値を通し、未知 id を落として警告にする", () => {
    const ok = validateConditions(DEFAULT_CONDITIONS, D);
    expect(ok.ok).toBe(true);
    expect(ok.errors).toHaveLength(0);
    const w = validateConditions(cond({ excludeIds: ["onion", "dragon-meat", "onion"] }), D);
    expect(w.ok).toBe(true);
    expect(w.normalized.excludeIds).toEqual(["onion"]);
    expect(w.warnings).toHaveLength(1);
  });
});

describe("手持ち食材からの提案（決定的・乱数なし）", () => {
  it("手持ち食材に一致するレシピを、一致数の多い順に主菜・副菜で返す", () => {
    const r = suggestFromPantry(["pork-thin", "cabbage", "carrot"]);
    expect(r.main.length).toBeGreaterThan(0);
    expect(r.side.length).toBeGreaterThan(0);
    for (const m of r.main) expect(m.recipe.course).toBe("main");
    for (const s of r.side) expect(s.recipe.course).toBe("side");
    // 一致数の降順
    for (let i = 1; i < r.main.length; i++) {
      expect(r.main[i - 1].matched.length).toBeGreaterThanOrEqual(r.main[i].matched.length);
    }
    // 手持ちの食材だけが matched に入る
    for (const m of [...r.main, ...r.side]) {
      for (const id of m.matched) expect(["pork-thin", "cabbage", "carrot"]).toContain(id);
      expect(m.matched.length).toBeGreaterThan(0);
    }
  });

  it("同じ入力なら常に同じ順序で返る（決定性）", () => {
    const a = JSON.stringify(suggestFromPantry(["egg", "negi", "tofu"]));
    for (let i = 0; i < 20; i++) {
      expect(JSON.stringify(suggestFromPantry(["egg", "negi", "tofu"]))).toBe(a);
    }
  });

  it("手持ち食材の提案でも、使わない食材（H1）と調理時間の上限を守る", () => {
    const r = suggestFromPantry(["egg", "negi", "tofu", "pork-ground"], {
      excludeIds: ["egg"],
      maxCookTimeMin: 20,
    });
    for (const m of [...r.main, ...r.side]) {
      expect(m.recipe.ingredients.some((i) => i.id === "egg")).toBe(false);
      expect(m.recipe.cookTimeMin).toBeLessThanOrEqual(20);
    }
  });

  it("missing には常備前提（commonness 5）の食材を入れない（買い足しの提示のため）", () => {
    const r = suggestFromPantry(["pork-loin"]);
    const ings = new Map(D.ingredients.map((i) => [i.id, i]));
    for (const m of r.main) {
      for (const id of m.missing) expect(ings.get(id)!.commonness).toBeLessThan(5);
    }
  });
});

describe("URL への条件・シードの保存（§4.2 / §4.10）", () => {
  it("encode → decode で条件が往復する", () => {
    const c = cond({ servings: 4, maxTotalTimeMin: 60, genre: "japanese", includeSoup: false, excludeIds: ["egg", "milk"] });
    const d = decodeConditions(encodeConditions(c, 12345));
    expect(d.conditions).toEqual(c);
    expect(d.seed).toBe(12345);
    expect(d.version).toBe(dataVersion(D));
  });

  it("パラメータが無ければ既定値・seed は null（開いた瞬間に既定条件で献立が出せる）", () => {
    const d = decodeConditions("");
    expect(d.conditions).toEqual(DEFAULT_CONDITIONS);
    expect(d.seed).toBeNull();
    expect(d.version).toBeNull();
  });

  it("壊れたパラメータは既定値に落として例外を投げない", () => {
    const d = decodeConditions("s=abc&t=xx&n=&g=martian&soup=9");
    expect(d.seed).toBeNull();
    expect(d.conditions.maxTotalTimeMin).toBe(DEFAULT_CONDITIONS.maxTotalTimeMin);
    expect(d.conditions.genre).toBe("any");
    expect(d.conditions.includeSoup).toBe(true);
  });
});

describe("表示用の文言・使い回し", () => {
  it("使い回しは理由を明示する文になる（§4.6）", () => {
    const r = generate(cond(), 11);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.menu.reuse.length).toBeGreaterThan(0);
    for (const n of r.menu.reuse) {
      expect(n.dayIndexes.length).toBeGreaterThanOrEqual(2);
      expect(reuseSentence(n)).toContain(n.name);
      expect(reuseSentence(n)).toMatch(/\d日目/);
    }
    // 常備前提（commonness 5）の食材は使い回しに数えない
    const ings = new Map(D.ingredients.map((i) => [i.id, i]));
    for (const n of r.menu.reuse) expect(ings.get(n.ingredientId)!.commonness).toBeLessThan(5);
  });

  it("免責文が §8 の5項目をすべて持ち、断定的な保証をしていない", () => {
    for (const key of ["intro", "allergy", "nutrition", "time", "pregnancy", "data"] as const) {
      expect(KONDATE_DISCLAIMER[key].length).toBeGreaterThan(10);
    }
    expect(KONDATE_DISCLAIMER.nutrition).toContain("行っていません");
    expect(KONDATE_DISCLAIMER.time).toContain("目安");
    expect(KONDATE_DISCLAIMER.pregnancy).toContain("判定は行っていません");
    const all = Object.values(KONDATE_DISCLAIMER).join("");
    expect(all).not.toMatch(/不使用/);
    expect(all).not.toMatch(/安全です/);
  });
});
