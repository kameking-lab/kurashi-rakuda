import { describe, expect, it } from "vitest";
import {
  SERVICE_CATALOG,
  SERVICE_MAP,
  WORRIES,
  WORRY_MAP,
  getServicesForWorries,
  groupServicesByCategory,
  SERVICE_CATEGORY_ORDER,
  KUBUN_SHIKYU_GENDO_LEVELS,
  YOKAIGO_LEVELS,
} from "@/components/tools/impl/KaigoServiceGyakuHiki.calc";

/*
 * 介護サービス種類 かんたん逆引き（P2-T40）のテスト。
 * テストケース表は specs/b-tools/p2-t40-kaigo-service-gyaku-hiki.md と対応する。
 */

describe("SERVICE_CATALOG / WORRIES（データの健全性）", () => {
  it("#1 サービスの key はすべて一意である", () => {
    const keys = new Set(SERVICE_CATALOG.map((s) => s.key));
    expect(keys.size).toBe(SERVICE_CATALOG.length);
  });

  it("#2 困りごとの id はすべて一意である", () => {
    const ids = new Set(WORRIES.map((w) => w.id));
    expect(ids.size).toBe(WORRIES.length);
  });

  it("#3 すべての困りごとの serviceKeys は SERVICE_CATALOG に実在する", () => {
    for (const w of WORRIES) {
      for (const key of w.serviceKeys) {
        expect(SERVICE_MAP.has(key)).toBe(true);
      }
    }
  });

  it("#4 すべてのサービスに空でない name・overview・legalBasis がある", () => {
    for (const s of SERVICE_CATALOG) {
      expect(s.name.length).toBeGreaterThan(0);
      expect(s.overview.length).toBeGreaterThan(0);
      expect(s.legalBasis.length).toBeGreaterThan(0);
    }
  });

  it("#5 すべての困りごとに少なくとも1つの該当サービスがある", () => {
    for (const w of WORRIES) {
      expect(w.serviceKeys.length).toBeGreaterThan(0);
    }
  });
});

describe("getServicesForWorries（逆引きロジック）", () => {
  it("#6 未選択（空配列）は空配列を返す", () => {
    expect(getServicesForWorries([])).toEqual([]);
  });

  it("#7 未知のIDは無視され、例外を投げない", () => {
    expect(() => getServicesForWorries(["not-a-real-worry-id"])).not.toThrow();
    expect(getServicesForWorries(["not-a-real-worry-id"])).toEqual([]);
  });

  it("#8 「一人で入浴するのが不安」→ 訪問介護・訪問入浴介護・通所介護を含む", () => {
    const result = getServicesForWorries(["nyuyoku"]);
    const keys = result.map((r) => r.key);
    expect(keys).toContain("houmon_kaigo");
    expect(keys).toContain("houmon_nyuyoku");
    expect(keys).toContain("tsusho_kaigo");
  });

  it("#9 「少しの間だけ預けたい」→ 短期入所生活介護・短期入所療養介護のみ", () => {
    const result = getServicesForWorries(["azukari_tanki"]);
    const keys = result.map((r) => r.key).sort();
    expect(keys).toEqual(["tanki_ryouyou", "tanki_seikatsu"].sort());
  });

  it("#10 「施設に入所して介護を受けたい」→ 施設サービス3種+特定施設を含む", () => {
    const result = getServicesForWorries(["nyuusho"]);
    const keys = result.map((r) => r.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        "shisetsu_tokuyou",
        "shisetsu_roken",
        "shisetsu_iryouin",
        "tokutei_shisetsu",
      ]),
    );
    expect(result.length).toBe(4);
  });

  it("#11 複数の困りごとを選ぶと、重複するサービスは1件にまとめられる", () => {
    // 「日中一人が心配」と「相談したい」はどちらも keikaku_kyotaku を含む
    const result = getServicesForWorries(["minaoshi_hitori", "sodan"]);
    const keikakuHits = result.filter((r) => r.key === "keikaku_kyotaku");
    expect(keikakuHits.length).toBe(1);
    expect(keikakuHits[0].matchedWorryLabels.length).toBe(2);
  });

  it("#12 1つの困りごとに対応するサービスは matchedWorryLabels が1件のみ", () => {
    const result = getServicesForWorries(["azukari_tanki"]);
    for (const s of result) {
      expect(s.matchedWorryLabels).toEqual([WORRY_MAP.get("azukari_tanki")!.label]);
    }
  });

  it("#13 表示順は SERVICE_CATALOG の定義順を維持する", () => {
    const result = getServicesForWorries(["nyuyoku", "azukari_tanki"]);
    const catalogOrder = SERVICE_CATALOG.map((s) => s.key);
    const resultKeys = result.map((r) => r.key);
    const indices = resultKeys.map((k) => catalogOrder.indexOf(k));
    const sorted = [...indices].sort((a, b) => a - b);
    expect(indices).toEqual(sorted);
  });

  it("#14 すべての困りごとを選ぶと SERVICE_CATALOG の全件が該当する", () => {
    const allWorryIds = WORRIES.map((w) => w.id);
    const result = getServicesForWorries(allWorryIds);
    expect(result.length).toBe(SERVICE_CATALOG.length);
  });

  it("#15 重複したIDを渡しても同じ結果になる（べき等性）", () => {
    const once = getServicesForWorries(["nyuyoku"]);
    const twice = getServicesForWorries(["nyuyoku", "nyuyoku"]);
    expect(twice.map((r) => r.key)).toEqual(once.map((r) => r.key));
    for (const s of twice) {
      expect(s.matchedWorryLabels.length).toBe(1);
    }
  });
});

describe("groupServicesByCategory", () => {
  it("#16 未選択時は全カテゴリが空配列", () => {
    const grouped = groupServicesByCategory([]);
    for (const cat of SERVICE_CATEGORY_ORDER) {
      expect(grouped[cat]).toEqual([]);
    }
  });

  it("#17 施設サービス系の困りごとは shisetsu カテゴリに正しく分類される", () => {
    const result = getServicesForWorries(["nyuusho"]);
    const grouped = groupServicesByCategory(result);
    expect(grouped.shisetsu.map((s) => s.key).sort()).toEqual(
      ["shisetsu_iryouin", "shisetsu_roken", "shisetsu_tokuyou"].sort(),
    );
    expect(grouped.tokutei.map((s) => s.key)).toEqual(["tokutei_shisetsu"]);
  });
});

describe("kaigo-hoken.json からの参考情報引用（数値のハードコード禁止の検証）", () => {
  it("#18 区分支給限度基準額（要介護3）は27,048単位・270,480円である", () => {
    const yokaigo3 = KUBUN_SHIKYU_GENDO_LEVELS.find((l) => l.key === "yokaigo3");
    expect(yokaigo3?.units).toBe(27048);
    expect(yokaigo3?.yenAt10).toBe(270480);
  });

  it("#19 区分支給限度基準額のレベルは8件（要支援1・2、要介護1〜5、経過的要介護）", () => {
    expect(KUBUN_SHIKYU_GENDO_LEVELS.length).toBe(8);
  });

  it("#20 要介護度区分（yokaigoNintei.levels）は非該当を含む8件である", () => {
    expect(YOKAIGO_LEVELS.length).toBe(8);
    expect(YOKAIGO_LEVELS.map((l) => l.key)).toContain("higaitou");
  });
});
