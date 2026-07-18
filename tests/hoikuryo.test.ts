import { describe, it, expect } from "vitest";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import {
  calc,
  feeOf,
  fiscalYearOf,
  fullFreeAmendment,
  getMunicipality,
  isAge3plusFree,
  isAge2Free,
  isAllZero,
  isFiscalYearMismatch,
  isIncomeInputUseful,
  isTimeBandApplicable,
  municipalities,
  multiChildInfo,
  resolveEqualOnlyTier,
  resolveTier,
  resolveTimeBandKey,
  toSeidoDataset,
  type HoikuryoInput,
  type HoikuryoTier,
  type HoikuryoMunicipality,
} from "@/lib/tools/impl/hoikuryo";
import { upcomingChanges } from "@/lib/tools/seido";

/**
 * 保育料計算 全国版 のテスト（specs/s-tools/01-hoikuryo-keisan.md §6）。
 *
 * 期待値はすべて data/seido/hoikuryo/*.json から直接引いたもの。
 * ★このテストが守っているもの★
 *   - A/B/C階層を所得割額（0円）で判別しないこと
 *   - 境界の +1 規約を二重適用しないこと
 *   - 階層表がある前提で書かないこと（練馬1行／東京23区は全階層0円）
 *   - 大阪の 2026-09-01 以降は tiers を参照しないこと
 *   - 日付は固定値で渡す（Date.now() を直接参照しない）
 */

/** 既定の入力（§6 の前提: under3 / standard / 第1子 / 2026-06） */
function input(over: Partial<HoikuryoInput> & { municipalityId: string }): HoikuryoInput {
  return {
    month: "2026-06",
    age: "under3",
    need: "standard",
    taxStatus: "incomeTaxed",
    income: null,
    birthOrder: 1,
    isSingleParentOrDisability: false,
    ...over,
  };
}

const feeOfCalc = (over: Partial<HoikuryoInput> & { municipalityId: string }) =>
  calc(input(over))?.fee;

describe("収集済み自治体（87件）", () => {
  it("data/seido/hoikuryo/*.json と municipalities が1対1（自動生成＝手書き配列を廃止）", () => {
    // ★件数をハードコードしない★ データファイルと配列の一致だけを検査する（コンフリクト税の撲滅）
    const dir = join(process.cwd(), "data", "seido", "hoikuryo");
    const fileSlugs = readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => f.replace(/.json$/, "")).sort();
    const muniIds = municipalities.map((m) => m.id).sort();
    expect(muniIds).toEqual(fileSlugs); // 全ファイルが登録され、余計な登録も無い（過不足なし）
    expect(municipalities.length).toBe(fileSlugs.length);
  });

  it("全自治体が妥当な構造を持つ（id/名称/6桁コード/tiers/出典/免責/境界）", () => {
    for (const m of municipalities) {
      expect(m.id, m.id + " id").toBeTruthy();
      expect(m.name, m.id + " name").toBeTruthy();
      expect(String(m.municipalityCode), m.id + " code").toMatch(/^[0-9]{6}$/);
      expect(m.tiers.length, m.id + " tiers").toBeGreaterThanOrEqual(1);
      expect(m.sources.length, m.id + " sources").toBeGreaterThan(0);
      expect(m.disclaimer.length, m.id + " disclaimer").toBeGreaterThan(20);
      for (const t of m.tiers) {
        expect(t.incomeMin, m.id + " " + t.tier + " min").toBeGreaterThanOrEqual(0);
        if (t.incomeMax !== null) expect(t.incomeMax, m.id + " " + t.tier + " max").toBeGreaterThanOrEqual(t.incomeMin);
      }
    }
  });

  it("municipalityCode 順に並び、コードは重複しない（自動生成の決定的順序）", () => {
    const codes = municipalities.map((m) => String(m.municipalityCode));
    expect(codes).toEqual([...codes].sort((a, b) => a.localeCompare(b)));
    expect(new Set(codes).size, "コード重複なし").toBe(codes.length);
  });

  /**
   * ★このテストの「未収集自治体」は、収集が進むたびに実際に未収集のものへ差し替える★
   * さいたま市は当初この役を担っていたが収集済みになったため、中核市（未着手）に差し替えた。
   * 収録済みの id を書くとテストは通るが「未収集なら金額を出さない」ことを検査しなくなる。
   */
  it("T-25: 未収集自治体（宇都宮市等）は選択肢に存在しない＝金額を出さない", () => {
    expect(getMunicipality("tochigi-utsunomiya")).toBeUndefined();
    expect(calc(input({ municipalityId: "tochigi-utsunomiya" }))).toBeNull();
  });

  it("全自治体が3歳以上児無償・出典・免責を持つ（ハードコードせず値を読む）", () => {
    for (const m of municipalities) {
      expect(isAge3plusFree(m)).toBe(true);
      expect(m.sources.length).toBeGreaterThan(0);
      expect(m.disclaimer.length).toBeGreaterThan(20);
    }
  });

  it("共通の制度データ層（SeidoNotice）へ変換できる", () => {
    const ds = toSeidoDataset(getMunicipality("osaka-osaka")!);
    expect(ds.fiscalYear).toBe(2026);
    expect(ds.name).toContain("大阪市");
    // 大阪の 2026-09-01 全員無償化が「次回改定予定」として出る
    expect(upcomingChanges(ds, "2026-07-17")[0].date).toBe("2026-09-01");
  });
});

describe("★中核市・中国四国九州最終バッチ★ 松江・呉・佐世保・鳥取", () => {
  it("4市を登録し、R8階層数と代表境界を保持する", () => {
    expect(getMunicipality("shimane-matsue")?.tiers).toHaveLength(16);
    expect(feeOfCalc({ municipalityId: "shimane-matsue", income: 48600 })).toBe(10000);

    const kure = getMunicipality("hiroshima-kure")!;
    expect(kure.tiers).toHaveLength(1);
    expect(feeOfCalc({ municipalityId: "hiroshima-kure", income: 100000 })).toBeNull();
    expect(fullFreeAmendment(kure, "2026-10")?.effectiveFrom).toBe("2026-10-01");

    expect(getMunicipality("nagasaki-sasebo")?.tiers).toHaveLength(11);
    expect(feeOfCalc({ municipalityId: "nagasaki-sasebo", income: 97000 })).toBe(33600);

    expect(getMunicipality("tottori-tottori")?.tiers).toHaveLength(13);
    expect(feeOfCalc({ municipalityId: "tottori-tottori", income: 77101 })).toBe(23800);
  });

  it("4市ともR8・中核市・公式出典を持つ", () => {
    for (const id of ["shimane-matsue", "hiroshima-kure", "nagasaki-sasebo", "tottori-tottori"]) {
      const m = getMunicipality(id)!;
      expect(m.fiscalYear, id).toBe(2026);
      expect(m.municipalityType, id).toBe("中核市");
      expect(m.sources.length, id).toBeGreaterThan(0);
    }
  });
});

describe("★山形市★ 二人親第1子の階層額・未満境界・3歳以上児無償（東日本）", () => {
  const yamagata = { municipalityId: "yamagata-yamagata" };

  it("生活保護・非課税は0円、均等割のみ（所得割0）はC=9,200円", () => {
    expect(feeOfCalc({ ...yamagata, taxStatus: "welfare" })).toBe(0);
    expect(feeOfCalc({ ...yamagata, taxStatus: "nonTaxable" })).toBe(0);
    expect(feeOfCalc({ ...yamagata, taxStatus: "equalOnly" })).toBe(9200);
  });

  it("所得割で D1〜D7 の二人親第1子・保育標準時間の額を返す", () => {
    expect(feeOfCalc({ ...yamagata, income: 10000 })).toBe(12700); // D1 <15,000
    expect(feeOfCalc({ ...yamagata, income: 15000 })).toBe(16900); // D2 15,000以上
    expect(feeOfCalc({ ...yamagata, income: 48600 })).toBe(20900); // D3 48,600以上（未満境界）
    expect(feeOfCalc({ ...yamagata, income: 96999 })).toBe(20900); // D3-3 77,101〜97,000未満
    expect(feeOfCalc({ ...yamagata, income: 97000 })).toBe(35600); // D4
    expect(feeOfCalc({ ...yamagata, income: 397000 })).toBe(56700); // D7 397,000以上
  });

  it("保育短時間はD7で55,800円", () => {
    expect(feeOfCalc({ ...yamagata, income: 397000, need: "short" })).toBe(55800);
  });

  it("3歳以上児は所得によらず0円（無償化）", () => {
    expect(feeOfCalc({ ...yamagata, age: "age3plus", income: 500000 })).toBe(0);
  });
});

describe("★甲府市★ C1(均等割のみ)とC2(所得割<48,600)の区別・未満境界・3歳以上児無償（東日本）", () => {
  const kofu = { municipalityId: "yamanashi-kofu" };

  it("生活保護・非課税は0円、均等割のみ（所得割0）はC1=10,400円（特別世帯4,400は本体に載せない）", () => {
    expect(feeOfCalc({ ...kofu, taxStatus: "welfare" })).toBe(0);
    expect(feeOfCalc({ ...kofu, taxStatus: "nonTaxable" })).toBe(0);
    expect(feeOfCalc({ ...kofu, taxStatus: "equalOnly" })).toBe(10400);
  });

  it("所得割<48,600はC2=14,200円（均等割のみのC1と別）", () => {
    expect(feeOfCalc({ ...kofu, income: 30000 })).toBe(14200);
  });

  it("D1〜D10の二人親第1子・保育標準時間の額を返す（未満境界）", () => {
    expect(feeOfCalc({ ...kofu, income: 48600 })).toBe(17200); // D1 48,600以上
    expect(feeOfCalc({ ...kofu, income: 96999 })).toBe(27400); // D4 85,000〜97,000未満
    expect(feeOfCalc({ ...kofu, income: 97000 })).toBe(29800); // D5
    expect(feeOfCalc({ ...kofu, income: 301000 })).toBe(48400); // D10 301,000以上
  });

  it("保育短時間はD10で47,600円", () => {
    expect(feeOfCalc({ ...kofu, income: 301000, need: "short" })).toBe(47600);
  });

  it("3歳以上児は所得によらず0円（無償化）", () => {
    expect(feeOfCalc({ ...kofu, age: "age3plus", income: 500000 })).toBe(0);
  });
});

describe("★長野市★ C階層が均等割のみと所得割<48,600を包含・第2子以降無償（東日本）", () => {
  const nagano = { municipalityId: "nagano-nagano" };

  it("生活保護・非課税は0円、均等割のみ（所得割0）はC=4,950円", () => {
    expect(feeOfCalc({ ...nagano, taxStatus: "welfare" })).toBe(0);
    expect(feeOfCalc({ ...nagano, taxStatus: "nonTaxable" })).toBe(0);
    expect(feeOfCalc({ ...nagano, taxStatus: "equalOnly" })).toBe(4950);
  });

  it("所得割<48,600も同じC階層=4,950円（均等割のみと同額・同一階層）", () => {
    expect(feeOfCalc({ ...nagano, income: 30000 })).toBe(4950);
  });

  it("D1〜D11の二人親第1子・保育標準時間の額を返す（未満境界）", () => {
    expect(feeOfCalc({ ...nagano, income: 48600 })).toBe(7100); // D1 48,600以上
    expect(feeOfCalc({ ...nagano, income: 57700 })).toBe(14200); // D1-2 57,700以上
    expect(feeOfCalc({ ...nagano, income: 97000 })).toBe(31500); // D4
    expect(feeOfCalc({ ...nagano, income: 397000 })).toBe(56700); // D11 397,000以上
  });

  it("保育短時間はD11で55,700円", () => {
    expect(feeOfCalc({ ...nagano, income: 397000, need: "short" })).toBe(55700);
  });

  it("3歳以上児は所得によらず0円（無償化）", () => {
    expect(feeOfCalc({ ...nagano, age: "age3plus", income: 500000 })).toBe(0);
  });
});

describe("★東日本 第3弾（盛岡・郡山・水戸・前橋）★ 二人親/一般・第1子の階層額・3歳以上児無償", () => {
  it("盛岡市: 均等割のみ=5,400／所得割<48,600=D1 7,400／48,600以上=D2 10,600／最上位D14 66,000", () => {
    const m = { municipalityId: "iwate-morioka" };
    expect(feeOfCalc({ ...m, taxStatus: "welfare" })).toBe(0);
    expect(feeOfCalc({ ...m, taxStatus: "equalOnly" })).toBe(5400);
    expect(feeOfCalc({ ...m, income: 30000 })).toBe(7400);
    expect(feeOfCalc({ ...m, income: 48600 })).toBe(10600);
    expect(feeOfCalc({ ...m, income: 397000 })).toBe(66000);
    expect(feeOfCalc({ ...m, income: 397000, need: "short" })).toBe(64800);
    expect(feeOfCalc({ ...m, age: "age3plus", income: 500000 })).toBe(0);
  });

  it("郡山市: 均等割のみ=階層3 11,000／所得割<38,000=階層4 15,000／最上位階層18 70,000", () => {
    const m = { municipalityId: "fukushima-koriyama" };
    expect(feeOfCalc({ ...m, taxStatus: "nonTaxable" })).toBe(0);
    expect(feeOfCalc({ ...m, taxStatus: "equalOnly" })).toBe(11000);
    expect(feeOfCalc({ ...m, income: 30000 })).toBe(15000);
    expect(feeOfCalc({ ...m, income: 397000 })).toBe(70000);
    expect(feeOfCalc({ ...m, age: "age3plus", income: 500000 })).toBe(0);
  });

  it("水戸市: 均等割のみ=階層3 10,000／所得割<48,600=階層4 14,000／最上位階層13 58,000", () => {
    const m = { municipalityId: "ibaraki-mito" };
    expect(feeOfCalc({ ...m, taxStatus: "welfare" })).toBe(0);
    expect(feeOfCalc({ ...m, taxStatus: "equalOnly" })).toBe(10000);
    expect(feeOfCalc({ ...m, income: 30000 })).toBe(14000);
    expect(feeOfCalc({ ...m, income: 397000 })).toBe(58000);
    expect(feeOfCalc({ ...m, income: 397000, need: "short" })).toBe(57000);
    expect(feeOfCalc({ ...m, age: "age3plus", income: 500000 })).toBe(0);
  });

  it("前橋市: 均等割のみ=C1 7,000／所得割24,300〜48,600未満=C3 8,800／最上位D11 46,800", () => {
    const m = { municipalityId: "gunma-maebashi" };
    expect(feeOfCalc({ ...m, taxStatus: "nonTaxable" })).toBe(0);
    expect(feeOfCalc({ ...m, taxStatus: "equalOnly" })).toBe(7000);
    expect(feeOfCalc({ ...m, income: 30000 })).toBe(8800);
    expect(feeOfCalc({ ...m, income: 288100 })).toBe(46800);
    expect(feeOfCalc({ ...m, income: 288100, need: "short" })).toBe(46100);
    expect(feeOfCalc({ ...m, age: "age3plus", income: 500000 })).toBe(0);
  });
});

describe("★横浜市★ 境界の +1 規約（原典「〜以下」→ 収集時に +1 済み）", () => {
  const yokohama = { municipalityId: "kanagawa-yokohama" };

  it("T-01: 所得割 57,701円 → D5 16,500円（境界の下側を含む）", () => {
    const r = calc(input({ ...yokohama, income: 57701 }))!;
    expect(r.fee).toBe(16500);
    expect(r.tier?.tier).toBe("D5");
  });

  it("T-02: 所得割 57,700円 → D4 14,500円（境界の上側は含まない）", () => {
    const r = calc(input({ ...yokohama, income: 57700 }))!;
    expect(r.fee).toBe(14500);
    expect(r.tier?.tier).toBe("D4");
  });

  it("T-03: 所得割 77,100円 → D5 16,500円（原典「77,100円以下」）", () => {
    expect(feeOfCalc({ ...yokohama, income: 77100 })).toBe(16500);
  });

  it("T-04: 所得割 77,101円 → D6 20,400円", () => {
    const r = calc(input({ ...yokohama, income: 77101 }))!;
    expect(r.fee).toBe(20400);
    expect(r.tier?.tier).toBe("D6");
  });

  it("T-05: 所得割 397,001円・保育短時間 → D27 76,100円（最上位・上限なし）", () => {
    const r = calc(input({ ...yokohama, income: 397001, need: "short" }))!;
    expect(r.fee).toBe(76100);
    expect(r.tier?.tier).toBe("D27");
    expect(r.tier?.incomeMax).toBeNull();
  });

  it("所得割 1円 → D1 8,200円（C階層 incomeMax:1 に落ちない）", () => {
    const r = calc(input({ ...yokohama, income: 1 }))!;
    expect(r.tier?.tier).toBe("D1");
    expect(r.fee).toBe(8200);
  });
});

describe("★A/B/C は所得割額0円では判別できない★（同じ0円で結果が3通り）", () => {
  const yokohama = { municipalityId: "kanagawa-yokohama" };

  it("T-06: 均等割のみ課税（所得割0円）→ C階層 6,700円（0円ではない）", () => {
    const r = calc(input({ ...yokohama, taxStatus: "equalOnly", income: 0 }))!;
    expect(r.fee).toBe(6700);
    expect(r.tier?.tier).toBe("C");
  });

  it("T-07: 住民税非課税（所得割0円）→ B階層 0円", () => {
    const r = calc(input({ ...yokohama, taxStatus: "nonTaxable", income: 0 }))!;
    expect(r.fee).toBe(0);
    expect(r.tier?.tier).toBe("B");
    expect(r.tier?.isNonTaxable).toBe(true);
  });

  it("T-08: 生活保護（所得割0円）→ A階層 0円", () => {
    const r = calc(input({ ...yokohama, taxStatus: "welfare", income: 0 }))!;
    expect(r.fee).toBe(0);
    expect(r.tier?.tier).toBe("A");
    expect(r.tier?.isWelfare).toBe(true);
  });

  it("T-29: 所得割課税なのに所得割額0円 → 階層を特定せず金額を出さない", () => {
    const r = calc(input({ ...yokohama, taxStatus: "incomeTaxed", income: 0 }))!;
    expect(r.fee).toBeNull();
    expect(r.tier).toBeNull();
    expect(r.tierIssue).toBe("noMatch");
  });

  it("T-30: 所得割額に負の数 → 金額を出さない（最寄りの階層に丸めない）", () => {
    const r = calc(input({ ...yokohama, income: -1 }))!;
    expect(r.fee).toBeNull();
    expect(r.tierIssue).toBe("noMatch");
  });

  it("上級者モードで所得割額が未入力なら階層を確定しない", () => {
    const r = calc(input({ ...yokohama, income: null }))!;
    expect(r.fee).toBeNull();
    expect(r.tierIssue).toBe("needIncome");
  });
});

describe("T-09: 3歳以上児は所得に関係なく0円（freeTuition.age3plusFree を読む）", () => {
  it("横浜市 / age3plus / 所得割 397,001円 → 0円", () => {
    const r = calc(
      input({ municipalityId: "kanagawa-yokohama", age: "age3plus", income: 397001 }),
    )!;
    expect(r.fee).toBe(0);
    expect(r.basis).toBe("age3plusFree");
  });

  it("収集済み41自治体すべてで3歳以上児は0円", () => {
    for (const m of municipalities) {
      expect(feeOfCalc({ municipalityId: m.id, age: "age3plus", income: 500000 })).toBe(0);
    }
  });
});

describe("★大阪市★ 原典「未満」表記はそのまま（+1 しない）", () => {
  const osaka = { municipalityId: "osaka-osaka" };

  it("T-11: 前処理後 46,000円 → 第5 11,800円（46,000 を含む）", () => {
    const r = calc(input({ ...osaka, income: 46000 }))!;
    expect(r.fee).toBe(11800);
    expect(r.tier?.tier).toBe("第5");
  });

  it("T-12: 前処理後 45,999円 → 第4 10,100円", () => {
    const r = calc(input({ ...osaka, income: 45999 }))!;
    expect(r.fee).toBe(10100);
    expect(r.tier?.tier).toBe("第4");
  });

  it("T-13: 前処理後 536,000円・保育短時間 → 第23 70,000円（最上位）", () => {
    const r = calc(input({ ...osaka, income: 536000, need: "short" }))!;
    expect(r.fee).toBe(70000);
    expect(r.tier?.tier).toBe("第23");
  });

  it("T-10: 6/8換算後 60,000円 → 第9 21,500円（課税明細の80,000円のままなら第11 24,900円で誤り）", () => {
    // ★前処理（6/8換算）はツールでは行わない（換算率・端数処理の構造化データが無いため）。
    //   入力は「前処理後の額」であることを UI が bracketBasis.note で明示する。
    expect(feeOfCalc({ ...osaka, income: 60000 })).toBe(21500);
    // 換算せずに入れると別階層になる＝前処理の説明が必須であることの裏付け
    const wrong = calc(input({ ...osaka, income: 80000 }))!;
    expect(wrong.tier?.tier).toBe("第11");
    expect(wrong.fee).toBe(24900);
    expect(getMunicipality("osaka-osaka")!.bracketBasis.note).toContain("6／8");
  });
});

describe("★大阪市の 2026-09-01★ 以降は tiers を参照せず一律0円", () => {
  const osaka = { municipalityId: "osaka-osaka" };

  it("T-14: 2026-09 / 所得割 536,000円 → 0円（全員無償化）", () => {
    const r = calc(input({ ...osaka, month: "2026-09", income: 536000 }))!;
    expect(r.fee).toBe(0);
    expect(r.basis).toBe("amendmentFullFree");
    expect(r.tier).toBeNull(); // tiers を参照していない
    expect(r.fullFree?.effectiveFrom).toBe("2026-09-01");
  });

  it("T-15: 2026-08 / 所得割 536,000円 → 70,600円（8月分までは tiers 有効）", () => {
    const r = calc(input({ ...osaka, month: "2026-08", income: 536000 }))!;
    expect(r.fee).toBe(70600);
    expect(r.basis).toBe("tier");
    expect(r.tier?.tier).toBe("第23");
  });

  it("施行日は固定した日付で判定する（Date.now() を参照しない）", () => {
    const m = getMunicipality("osaka-osaka")!;
    expect(fullFreeAmendment(m, "2026-08")).toBeNull();
    expect(fullFreeAmendment(m, "2026-09")).not.toBeNull();
    expect(fullFreeAmendment(m, "2027-03")).not.toBeNull();
  });

  it("無償化前の月には「これから無償になる」予告を出せる", () => {
    const r = calc(input({ ...osaka, month: "2026-06", income: 60000 }))!;
    expect(r.upcomingFullFree?.effectiveFrom).toBe("2026-09-01");
    expect(r.fee).toBe(21500); // 予告は出すが、6月分の金額は tiers から出す
  });

  it("大阪市・呉市以外には全員無償化の予定が無い", () => {
    for (const m of munici…5211 tokens truncated…は境界値どおり階層が変わる", () => {
    expect(feeOfCalc({ municipalityId: "chiba-funabashi", age: "age3plus", income: 999999 })).toBe(0);
    expect(feeOfCalc({ municipalityId: "chiba-funabashi", income: 48599 })).toBe(10100); // C3
    expect(feeOfCalc({ municipalityId: "chiba-funabashi", income: 48600 })).toBe(15000); // D1-1
    expect(feeOfCalc({ municipalityId: "chiba-funabashi", income: 349000 })).toBe(60000); // D12(最上位)
  });

  it("★鹿児島市★ 6/8換算なし・境界値どおり階層が変わる（中核市は政令市特有の税率調整がない）", () => {
    expect(feeOfCalc({ municipalityId: "kagoshima-kagoshima", income: 48599 })).toBe(14500); // C2
    expect(feeOfCalc({ municipalityId: "kagoshima-kagoshima", income: 48600 })).toBe(19200); // D1
    expect(feeOfCalc({ municipalityId: "kagoshima-kagoshima", income: 396999 })).toBe(51000); // D6
    expect(feeOfCalc({ municipalityId: "kagoshima-kagoshima", income: 397000 })).toBe(66300); // D7(最上位)
  });

  it("5市とも出典・免責・次回確認日を持つ（ハードコードせず値を読む）", () => {
    for (const id of [
      "chiba-funabashi",
      "saitama-kawaguchi",
      "kagoshima-kagoshima",
      "tokyo-hachioji",
      "hyogo-himeji",
    ]) {
      const m = getMunicipality(id)!;
      expect(m.sources.length, id).toBeGreaterThan(0);
      expect(m.disclaimer.length, id).toBeGreaterThan(0);
      expect(m.municipalityType, id).toBe("中核市");
      const ds = toSeidoDataset(m);
      expect(ds.sources.length, id).toBeGreaterThan(0);
    }
  });
});

describe("★中核市バッチ2★ 松山・西宮・東大阪・大分・倉敷（人口順6・8・9・10・11位、P2-D01）", () => {
  it("★松山市★ 境界値どおり階層が変わる（中核市は6/8換算なし）", () => {
    expect(feeOfCalc({ municipalityId: "ehime-matsuyama", income: 55999 })).toBe(17500); // C2
    expect(feeOfCalc({ municipalityId: "ehime-matsuyama", income: 56000 })).toBe(21000); // C3
    expect(feeOfCalc({ municipalityId: "ehime-matsuyama", income: 342000 })).toBe(57000); // C11(最上位)
  });

  it("★西宮市★ A/B階層は incomeMax:0 表記でも非課税0円と識別できる", () => {
    const m = getMunicipality("hyogo-nishinomiya")!;
    expect(m.tiers.find((t) => t.tier === "A")?.incomeMax).toBe(0);
    expect(feeOfCalc({ municipalityId: "hyogo-nishinomiya", taxStatus: "welfare", income: null })).toBe(0);
    expect(feeOfCalc({ municipalityId: "hyogo-nishinomiya", income: 48599 })).toBe(10400); // C1
    expect(feeOfCalc({ municipalityId: "hyogo-nishinomiya", income: 397000 })).toBe(84400); // C9(最上位)
  });

  it("★東大阪市★ 大阪市の全員無償化には追随していない（独自の年齢別無償化スケジュール）", () => {
    const m = getMunicipality("osaka-higashiosaka")!;
    expect(m.freeTuition?.age3plusFree?.value).toBe(true);
    // 大阪市のような amendments[].impact「一律0円」の全員無償化は東大阪市には存在しない
    expect(fullFreeAmendment(m, "2026-09-01")).toBeNull();
    expect(feeOfCalc({ municipalityId: "osaka-higashiosaka", income: 57699 })).toBe(21750); // D01B
    expect(feeOfCalc({ municipalityId: "osaka-higashiosaka", income: 397000 })).toBe(75400); // D05(最上位)
  });

  it("★大分市★ 非課税階層が2行（B1・B2）でも resolveTier は最初の1件を返す", () => {
    const m = getMunicipality("oita-oita")!;
    expect(m.tiers.filter((t) => t.isNonTaxable).map((t) => t.tier)).toEqual(["B1", "B2"]);
    const res = resolveTier(m, "nonTaxable", null);
    expect(res.tier?.tier).toBe("B1");
    const equalOnly = resolveEqualOnlyTier(m);
    expect(equalOnly?.tier).toBe("C");
    expect(feeOfCalc({ municipalityId: "oita-oita", taxStatus: "equalOnly", income: null })).toBe(9800);
  });

  it("★倉敷市★ 17階層のうち境界値どおりの階層が選ばれる", () => {
    expect(feeOfCalc({ municipalityId: "okayama-kurashiki", income: 10999 })).toBe(14400); // C2
    expect(feeOfCalc({ municipalityId: "okayama-kurashiki", income: 11000 })).toBe(17000); // C3
    expect(feeOfCalc({ municipalityId: "okayama-kurashiki", income: 397000 })).toBe(55000); // C15(最上位)
  });

  it("5市とも出典・免責・municipalityType=中核市を持つ", () => {
    for (const id of [
      "ehime-matsuyama",
      "hyogo-nishinomiya",
      "osaka-higashiosaka",
      "oita-oita",
      "okayama-kurashiki",
    ]) {
      const m = getMunicipality(id)!;
      expect(m.sources.length, id).toBeGreaterThan(0);
      expect(m.disclaimer.length, id).toBeGreaterThan(0);
      expect(m.municipalityType, id).toBe("中核市");
    }
  });
});

describe("★中核市バッチ3★ 尼崎・金沢・豊田・豊中・富山（地域分割・中部/近畿担当、P2-D01）", () => {
  it("★尼崎市★ 境界値どおり階層が変わる（C2→D1の境界48,600円）", () => {
    expect(feeOfCalc({ municipalityId: "hyogo-amagasaki", income: 48599 })).toBe(13200); // C2
    expect(feeOfCalc({ municipalityId: "hyogo-amagasaki", income: 48600 })).toBe(21000); // D1
    expect(feeOfCalc({ municipalityId: "hyogo-amagasaki", income: 397000 })).toBe(76100); // D10(最上位)
  });

  it("★金沢市★ 均等割のみ課税（C階層）は非課税・生活保護と区別される", () => {
    const m = getMunicipality("ishikawa-kanazawa")!;
    const equalOnly = resolveEqualOnlyTier(m);
    expect(equalOnly?.tier).toBe("C");
    expect(feeOfCalc({ municipalityId: "ishikawa-kanazawa", taxStatus: "equalOnly", income: null })).toBe(
      9500,
    );
    expect(feeOfCalc({ municipalityId: "ishikawa-kanazawa", taxStatus: "nonTaxable", income: null })).toBe(
      0,
    );
  });

  it("★豊田市★ 一般世帯/要保護者等世帯で重複する所得区分でも一般世帯側の額が解決される", () => {
    const m = getMunicipality("aichi-toyota")!;
    expect(m.tiers.filter((t) => t.incomeMin === 1 && t.incomeMax === 48600)).toHaveLength(2);
    // C01(一般)・C91(要保護者等)とも0円のため、どちらが解決されても結果は同じ
    expect(feeOfCalc({ municipalityId: "aichi-toyota", income: 48599 })).toBe(0);
    expect(feeOfCalc({ municipalityId: "aichi-toyota", income: 77101 })).toBe(12000); // D01(最初の有料階層)
  });

  it("★豊中市★ 非課税階層が均等割のみ課税世帯も含む統合型のため、equalOnly解決は null", () => {
    const m = getMunicipality("osaka-toyonaka")!;
    expect(resolveEqualOnlyTier(m)).toBeNull();
    expect(feeOfCalc({ municipalityId: "osaka-toyonaka", income: 48599 })).toBe(10700); // 第3
    expect(feeOfCalc({ municipalityId: "osaka-toyonaka", income: 397000 })).toBe(78000); // 第8(最上位)
  });

  it("★富山市★ 均等割のみ課税は第3階層に統合され、境界どおり階層が変わる", () => {
    const m = getMunicipality("toyama-toyama")!;
    expect(resolveEqualOnlyTier(m)?.tier).toBe("第3階層");
    expect(feeOfCalc({ municipalityId: "toyama-toyama", taxStatus: "equalOnly", income: null })).toBe(6500);
    expect(feeOfCalc({ municipalityId: "toyama-toyama", income: 48600 })).toBe(23000); // 第4階層
  });

  it("5市とも出典・免責・municipalityType=中核市を持つ", () => {
    for (const id of [
      "hyogo-amagasaki",
      "ishikawa-kanazawa",
      "aichi-toyota",
      "osaka-toyonaka",
      "toyama-toyama",
    ]) {
      const m = getMunicipality(id)!;
      expect(m.sources.length, id).toBeGreaterThan(0);
      expect(m.disclaimer.length, id).toBeGreaterThan(0);
      expect(m.municipalityType, id).toBe("中核市");
    }
  });
});

describe("★中核市バッチ4★ 吹田・岐阜・枚方・岡崎・一宮（中部・近畿担当、P2-D01）", () => {
  it("★吹田市★ 境界値どおり階層が変わる（D1→D2の境界48,600円）", () => {
    expect(feeOfCalc({ municipalityId: "osaka-suita", income: 48599 })).toBe(8200); // D1
    expect(feeOfCalc({ municipalityId: "osaka-suita", income: 48600 })).toBe(10000); // D2
    expect(feeOfCalc({ municipalityId: "osaka-suita", income: 472000 })).toBe(78000); // D13(最上位)
  });

  it("★岐阜市★ 均等割のみ課税（第3階層）は非課税（第2階層）と区別される", () => {
    const m = getMunicipality("gifu-gifu")!;
    const equalOnly = resolveEqualOnlyTier(m);
    expect(equalOnly?.tier).toBe("第3階層");
    expect(feeOfCalc({ municipalityId: "gifu-gifu", taxStatus: "equalOnly", income: null })).toBe(14900);
    expect(feeOfCalc({ municipalityId: "gifu-gifu", taxStatus: "nonTaxable", income: null })).toBe(0);
  });

  it("★枚方市★ 大阪市の全員無償化には追随せず、独自の第2子以降無償化のみ（年齢・所得制限なし）", () => {
    const m = getMunicipality("osaka-hirakata")!;
    expect(fullFreeAmendment(m, "2026-09-01")).toBeNull();
    expect(resolveEqualOnlyTier(m)?.tier).toBe("3");
    expect(feeOfCalc({ municipalityId: "osaka-hirakata", income: 446000 })).toBe(52000); // 4-14(最上位)
  });

  it("★岡崎市★ 均等割のみ課税（C階層）は0円ではなく実額を負担する", () => {
    const m = getMunicipality("aichi-okazaki")!;
    expect(resolveEqualOnlyTier(m)?.tier).toBe("C");
    expect(feeOfCalc({ municipalityId: "aichi-okazaki", taxStatus: "equalOnly", income: null })).toBe(9700);
    expect(feeOfCalc({ municipalityId: "aichi-okazaki", income: 330000 })).toBe(50000); // D8(最上位)
  });

  it("★一宮市★ C1（均等割のみ課税）はB（非課税）と同じincome範囲でも別階層として解決される", () => {
    const m = getMunicipality("aichi-ichinomiya")!;
    expect(resolveEqualOnlyTier(m)?.tier).toBe("C1");
    expect(feeOfCalc({ municipalityId: "aichi-ichinomiya", taxStatus: "equalOnly", income: null })).toBe(
      8200,
    );
    expect(feeOfCalc({ municipalityId: "aichi-ichinomiya", income: 694000 })).toBe(51000); // D15(最上位)
  });

  it("5市とも出典・免責・municipalityType=中核市を持つ", () => {
    for (const id of [
      "osaka-suita",
      "gifu-gifu",
      "osaka-hirakata",
      "aichi-okazaki",
      "aichi-ichinomiya",
    ]) {
      const m = getMunicipality(id)!;
      expect(m.sources.length, id).toBeGreaterThan(0);
      expect(m.disclaimer.length, id).toBeGreaterThan(0);
      expect(m.municipalityType, id).toBe("中核市");
    }
  });
});

describe("★中核市バッチ5★ 豊橋・高槻・大津・和歌山・奈良（中部・近畿担当、P2-D01）", () => {
  it("★豊橋市★ 境界値どおり階層が変わる（4-1→4-2の境界57,700円）", () => {
    expect(feeOfCalc({ municipalityId: "aichi-toyohashi", income: 57699 })).toBe(0); // 4-1
    expect(feeOfCalc({ municipalityId: "aichi-toyohashi", income: 57700 })).toBe(15700); // 4-2
    expect(feeOfCalc({ municipalityId: "aichi-toyohashi", income: 397000 })).toBe(58000); // 10(最上位)
  });

  it("★奈良市★ 均等割のみ課税（C1）は非課税と区別され、重複所得帯は最初の一般世帯行が解決される", () => {
    const m = getMunicipality("nara-nara")!;
    expect(resolveEqualOnlyTier(m)?.tier).toBe("C1");
    expect(feeOfCalc({ municipalityId: "nara-nara", taxStatus: "equalOnly", income: null })).toBe(4000);
    expect(feeOfCalc({ municipalityId: "nara-nara", income: 397000 })).toBe(64800); // D9(最上位)
  });

  it("★高槻市★ A階層は生活保護と非課税の両方を兼ねる（isWelfare/isNonTaxableとも true）", () => {
    const m = getMunicipality("osaka-takatsuki")!;
    const tierA = m.tiers.find((t) => t.tier === "A")!;
    expect(tierA.isWelfare).toBe(true);
    expect(tierA.isNonTaxable).toBe(true);
    expect(resolveEqualOnlyTier(m)?.tier).toBe("B1");
    expect(feeOfCalc({ municipalityId: "osaka-takatsuki", income: 397000 })).toBe(69000); // B13(最上位)
  });

  it("★大津市★ D8→D9の境界（重複のない一意区間）で階層が変わる", () => {
    expect(feeOfCalc({ municipalityId: "shiga-otsu", income: 96999 })).toBe(29600); // D8
    expect(feeOfCalc({ municipalityId: "shiga-otsu", income: 97000 })).toBe(34200); // D9
    expect(feeOfCalc({ municipalityId: "shiga-otsu", income: 397000 })).toBe(76300); // D16(最上位)
  });

  it("★和歌山市★ 境界値どおり階層が変わる（C4→C6の境界48,600円）", () => {
    expect(feeOfCalc({ municipalityId: "wakayama-wakayama", income: 48599 })).toBe(13600); // C4
    expect(feeOfCalc({ municipalityId: "wakayama-wakayama", income: 48600 })).toBe(18000); // C6
    expect(feeOfCalc({ municipalityId: "wakayama-wakayama", income: 397000 })).toBe(74000); // D7(最上位)
  });

  it("5市とも出典・免責・municipalityType=中核市を持つ", () => {
    for (const id of [
      "aichi-toyohashi",
      "nara-nara",
      "osaka-takatsuki",
      "shiga-otsu",
      "wakayama-wakayama",
    ]) {
      const m = getMunicipality(id)!;
      expect(m.sources.length, id).toBeGreaterThan(0);
      expect(m.disclaimer.length, id).toBeGreaterThan(0);
      expect(m.municipalityType, id).toBe("中核市");
    }
  });
});

describe("階層と金額の取り出し（スキーマ規約）", () => {
  it("fees は optional。undefined を null として扱い、0 と取り違えない", () => {
    const tier = { tier: "X", incomeMin: 0, incomeMax: null, fees: {} };
    expect(feeOf(tier, "under3", "standard")).toBeNull();
    expect(feeOf({ ...tier, fees: { under3: { standard: 0 } } }, "under3", "standard")).toBe(0);
    expect(feeOf({ ...tier, fees: { under3: { standard: 0 } } }, "under3", "short")).toBeNull();
  });

  it("incomeMin は以上・incomeMax は未満（全自治体の階層で一貫）", () => {
    for (const m of municipalities) {
      for (const t of m.tiers) {
        expect(t.incomeMin).toBeGreaterThanOrEqual(0);
        if (t.incomeMax !== null) expect(t.incomeMax).toBeGreaterThanOrEqual(t.incomeMin);
      }
    }
  });

  it("課税状況に対応する階層が無ければ null を返す（丸めない）", () => {
    const m = getMunicipality("tokyo-nerima")!;
    expect(resolveTier(m, "welfare", null)).toEqual({ tier: null, reason: "noTierForStatus" });
    expect(resolveTier(m, "nonTaxable", null)).toEqual({ tier: null, reason: "noTierForStatus" });
  });

  it("保育標準時間と保育短時間で金額が変わる（横浜 D27: 77,500 / 76,100）", () => {
    expect(feeOfCalc({ municipalityId: "kanagawa-yokohama", income: 397001 })).toBe(77500);
    expect(feeOfCalc({ municipalityId: "kanagawa-yokohama", income: 397001, need: "short" })).toBe(
      76100,
    );
  });
});

describe("★中核市（東日本・第1弾）★ 柏市・川越市（P2-D01 東日本）", () => {
  it("★柏市★ 27階層。所得割の境界で階層が変わり、標準/短時間で額が異なる（6/8換算なし）", () => {
    const m = getMunicipality("chiba-kashiwa")!;
    expect(m.fiscalYear).toBe(2026);
    expect(m.tiers).toHaveLength(27);
    // 3-2(所得割5,000円未満)=7,700 / 3-3(5,000〜18,599)=9,500 の境界
    expect(feeOfCalc({ municipalityId: "chiba-kashiwa", income: 4999 })).toBe(7700);
    expect(feeOfCalc({ municipalityId: "chiba-kashiwa", income: 5000 })).toBe(9500);
    // 最上位 8-3(500,000円以上) 標準71,300 / 短時間70,080
    expect(feeOfCalc({ municipalityId: "chiba-kashiwa", income: 500000 })).toBe(71300);
    expect(feeOfCalc({ municipalityId: "chiba-kashiwa", income: 500000, need: "short" })).toBe(70080);
    // 3歳以上は無償化により0円
    expect(feeOfCalc({ municipalityId: "chiba-kashiwa", age: "age3plus", income: 999999 })).toBe(0);
    // 非課税・生活保護は0円
    expect(feeOfCalc({ municipalityId: "chiba-kashiwa", taxStatus: "nonTaxable", income: null })).toBe(0);
  });

  it("★川越市★ 21階層（A・B・C・D1〜D18）。均等割のみ6,000円、D2境界、最上位D18。政令市転入者のみ6%換算（自市全体には非適用）", () => {
    const m = getMunicipality("saitama-kawagoe")!;
    expect(m.fiscalYear).toBe(2026);
    expect(m.tiers).toHaveLength(21);
    // C(均等割のみ)=6,000 / D1(所得割15,000円未満)=6,500
    expect(feeOfCalc({ municipalityId: "saitama-kawagoe", taxStatus: "equalOnly", income: null })).toBe(6000);
    expect(feeOfCalc({ municipalityId: "saitama-kawagoe", income: 14999 })).toBe(6500);
    // D2(15,000〜48,600未満)=7,400 の下端
    expect(feeOfCalc({ municipalityId: "saitama-kawagoe", income: 15000 })).toBe(7400);
    // 最上位 D18(365,000円以上)=59,300 / 短時間58,200
    expect(feeOfCalc({ municipalityId: "saitama-kawagoe", income: 365000 })).toBe(59300);
    expect(feeOfCalc({ municipalityId: "saitama-kawagoe", income: 365000, need: "short" })).toBe(58200);
    // 3歳以上は無償化により0円
    expect(feeOfCalc({ municipalityId: "saitama-kawagoe", age: "age3plus", income: 999999 })).toBe(0);
  });
});

describe("★年齢クラス拡張 age2（青森市ブロッカー解消・後方互換）★", () => {
  // 青森市はR8から2歳児クラス以上を独自無償化し、0・1歳児クラスのみ課税する。
  // 従来の under3(0〜2歳一律) では表現できないため age2 区分と freeTuition.age2Free を追加した。

  it("既存69自治体すべてで age2 は未使用＝従来挙動を壊さない（後方互換）", () => {
    for (const m of municipalities) {
      // どの自治体も age2Free を持たない（＝under3が0〜2歳を一律に扱う既存動作）
      expect(isAge2Free(m), `${m.id} は age2Free 非設定`).toBe(false);
      // ageClasses に age2 区分は無い（UIの選択肢に2歳児クラスは出ない）
      expect((m.ageClasses ?? []).some((a) => a.key === "age2"), `${m.id} ageClasses`).toBe(false);
      // 全階層に age2 の fees は無い＝feeOf は null（誤った数値を返さない）
      for (const t of m.tiers) {
        expect(feeOf(t, "age2", "standard"), `${m.id} ${t.tier} age2`).toBeNull();
      }
      // age2 を問い合わせても金額を出さない（誤値でなく null）
      const r = calc({
        municipalityId: m.id,
        month: "2026-06",
        age: "age2",
        need: "standard",
        taxStatus: "incomeTaxed",
        income: null,
        birthOrder: 1,
        isSingleParentOrDisability: false,
      });
      // 既存自治体は age2 の fees も age2Free も無いので、fee は 0 にならない（null か、階層次第で無償化以外）
      expect(r?.basis, `${m.id} age2 basis`).not.toBe("age2Free");
    }
  });

  it("feeOf: age2 の fees を持つ階層はその額を返す（新機構）", () => {
    const tier: HoikuryoTier = {
      tier: "D1",
      incomeMin: 1,
      incomeMax: 48600,
      fees: {
        under3: { standard: 30000, short: 29500 },
        age2: { standard: 0, short: 0 },
        age3plus: { standard: 0, short: 0 },
      },
    };
    expect(feeOf(tier, "under3", "standard")).toBe(30000); // 0・1歳児クラスは課税
    expect(feeOf(tier, "age2", "standard")).toBe(0); // 2歳児クラスは0円
    expect(feeOf(tier, "age3plus", "standard")).toBe(0);
  });

  it("isAge2Free: freeTuition.age2Free.value===true でのみ true", () => {
    const base = { tiers: [] } as unknown as HoikuryoMunicipality;
    expect(isAge2Free({ ...base, freeTuition: { age2Free: { value: true } } } as HoikuryoMunicipality)).toBe(true);
    expect(isAge2Free({ ...base, freeTuition: { age2Free: { value: false } } } as HoikuryoMunicipality)).toBe(false);
    expect(isAge2Free({ ...base } as HoikuryoMunicipality)).toBe(false);
    // age3plusFree と独立（片方だけ true でももう片方は false）
    expect(isAge2Free({ ...base, freeTuition: { age3plusFree: { value: true } } } as HoikuryoMunicipality)).toBe(false);
  });
});
