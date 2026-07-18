import { describe, it, expect } from "vitest";
import {
  calc,
  feeOf,
  fiscalYearOf,
  fullFreeAmendment,
  getMunicipality,
  isAge3plusFree,
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

describe("収集済み自治体（69件）", () => {
  it("69自治体を収録しており、id はファイル名と一致する", () => {
    expect(municipalities).toHaveLength(69);
    expect(municipalities.map((m) => m.id)).toEqual([
      "fukuoka-kurume",
      "hiroshima-fukuyama",
      "kagawa-takamatsu",
      "yamaguchi-shimonoseki",
      "kochi-kochi",
      "miyazaki-miyazaki",
      "nagasaki-nagasaki",
      "naha-okinawa",
      "hokkaido-sapporo",
      "miyagi-sendai",
      "yamagata-yamagata",
      "saitama-saitama",
      "saitama-kawaguchi",
      "saitama-kawagoe",
      "chiba-chiba",
      "chiba-funabashi",
      "chiba-kashiwa",
      "tokyo-chiyoda",
      "tokyo-chuo",
      "tokyo-minato",
      "tokyo-shinjuku",
      "tokyo-bunkyo",
      "tokyo-taito",
      "tokyo-sumida",
      "tokyo-koto",
      "tokyo-shinagawa",
      "tokyo-meguro",
      "tokyo-ota",
      "tokyo-setagaya",
      "tokyo-shibuya",
      "tokyo-nakano",
      "tokyo-suginami",
      "tokyo-toshima",
      "tokyo-kita",
      "tokyo-arakawa",
      "tokyo-nerima",
      "tokyo-adachi",
      "tokyo-edogawa",
      "tokyo-hachioji",
      "kanagawa-yokohama",
      "kanagawa-kawasaki",
      "kanagawa-sagamihara",
      "niigata-niigata",
      "yamanashi-kofu",
      "nagano-nagano",
      "toyama-toyama",
      "ishikawa-kanazawa",
      "shizuoka-shizuoka",
      "shizuoka-hamamatsu",
      "aichi-nagoya",
      "aichi-toyota",
      "kyoto-kyoto",
      "osaka-osaka",
      "osaka-sakai",
      "osaka-toyonaka",
      "osaka-higashiosaka",
      "hyogo-kobe",
      "hyogo-himeji",
      "hyogo-amagasaki",
      "hyogo-nishinomiya",
      "okayama-okayama",
      "okayama-kurashiki",
      "hiroshima-hiroshima",
      "ehime-matsuyama",
      "fukuoka-kitakyushu",
      "fukuoka-fukuoka",
      "kumamoto-kumamoto",
      "oita-oita",
      "kagoshima-kagoshima",
    ]);
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

  it("他の自治体には全員無償化の予定が無い（大阪固有の分岐であること）", () => {
    for (const m of municipalities.filter((x) => x.id !== "osaka-osaka")) {
      expect(fullFreeAmendment(m, "2027-03")).toBeNull();
    }
  });
});

describe("★札幌市の C1 例外★ 均等割のみ課税は B（0円）ではなく C1（11,000円）", () => {
  const sapporo = { municipalityId: "hokkaido-sapporo" };

  it("T-16: 均等割のみ課税 → C1 11,000円", () => {
    const r = calc(input({ ...sapporo, taxStatus: "equalOnly", income: 0 }))!;
    expect(r.fee).toBe(11000);
    expect(r.tier?.tier).toBe("C1");
  });

  it("T-17: 所得割 48,600円 → D1 15,680円（C1 の incomeMax:48600 を含まない側）", () => {
    const r = calc(input({ ...sapporo, income: 48600 }))!;
    expect(r.fee).toBe(15680);
    expect(r.tier?.tier).toBe("D1");
  });

  it("所得割 48,599円 → C1 11,000円（C1 は所得割課税世帯も受ける二重の役割）", () => {
    const r = calc(input({ ...sapporo, income: 48599 }))!;
    expect(r.fee).toBe(11000);
    expect(r.tier?.tier).toBe("C1");
  });

  it("T-18: 所得割 397,000円 → D9 75,900円（最上位 incomeMax:null）", () => {
    const r = calc(input({ ...sapporo, income: 397000 }))!;
    expect(r.fee).toBe(75900);
    expect(r.tier?.tier).toBe("D9");
  });

  it("非課税は B 階層 0円（incomeMax:0 を null と誤読しない）", () => {
    const r = calc(input({ ...sapporo, taxStatus: "nonTaxable" }))!;
    expect(r.tier?.tier).toBe("B");
    expect(r.tier?.incomeMax).toBe(0);
    expect(r.fee).toBe(0);
  });
});

describe("T-19/T-20: 第2子以降は金額を自動計算しない（数え方・方式が自治体ごとに違う）", () => {
  it("T-19: 札幌 / 第2子 → 第2子以降0円が明示されている（原文のカウント方法つき）", () => {
    const r = calc(input({ municipalityId: "hokkaido-sapporo", income: 397000, birthOrder: 2 }))!;
    expect(r.multiChild.isFree).toBe(true);
    expect(r.multiChild.countingRule?.value).toContain("生計を一にする兄又は姉");
    // 表の額（第1子）自体は変えない
    expect(r.fee).toBe(75900);
  });

  it("T-20: 川崎 / 第2子 → 半額（0.5・rate）を断定せず原文を提示する", () => {
    const r = calc(input({ municipalityId: "kanagawa-kawasaki", income: 475300, birthOrder: 2 }))!;
    expect(r.fee).toBe(82800);
    expect(r.tier?.tier).toBe("C25");
    expect(r.multiChild.isFree).toBe(false);
    expect(r.multiChild.kind).toBe("described");
    expect(r.multiChild.secondChild?.value).toBe(0.5);
    expect(r.multiChild.secondChild?.unit).toBe("rate");
  });

  it("横浜の第2子は文字列（専用の金額列）＝0円と誤判定しない", () => {
    const r = calc(input({ municipalityId: "kanagawa-yokohama", income: 397001, birthOrder: 2 }))!;
    expect(r.multiChild.isFree).toBe(false);
    expect(typeof r.multiChild.secondChild?.value).toBe("string");
  });

  it("名古屋の第2子は「2分の1」の文字列＝数値として扱わない", () => {
    const info = multiChildInfo(getMunicipality("aichi-nagoya")!, 2);
    expect(info.isFree).toBe(false);
    expect(String(info.secondChild?.value)).toContain("2分の1");
  });

  /**
   * ★「政令市の第2子は無償」と決め打ちしてはならない★
   * 札幌・福岡・北九州は第2子以降が一律無償だが、熊本市は「半額」かつ原則同時利用が要件。
   * 近隣・同格の自治体からの類推でツールが 0円 と答えると誤る。
   */
  it("熊本の第2子は「半額」の文字列＝無償として扱わない", () => {
    const info = multiChildInfo(getMunicipality("kumamoto-kumamoto")!, 2);
    expect(info.isFree).toBe(false);
    expect(info.kind).toBe("described");
    expect(String(info.secondChild?.value)).toContain("半額");
  });

  it("第2子が無償と答えるのは secondChild.value が数値の0の自治体だけ（文字列を0円にしない）", () => {
    for (const m of municipalities) {
      const info = multiChildInfo(m, 2);
      const raw = m.freeTuition?.multiChildPolicy?.secondChild?.value;
      expect(info.isFree, `${m.id}: secondChild.value=${JSON.stringify(raw)}`).toBe(raw === 0);
    }
  });

  it("第1子なら多子軽減の案内を出さない", () => {
    const r = calc(input({ municipalityId: "hokkaido-sapporo", income: 397000, birthOrder: 1 }))!;
    expect(r.multiChild.kind).toBe("none");
  });
});

describe("★川崎市★ 均等割のみは C1（有料）、非課税は B（0円）", () => {
  it("T-21: 均等割のみ課税 → C1 5,300円", () => {
    const r = calc(input({ municipalityId: "kanagawa-kawasaki", taxStatus: "equalOnly" }))!;
    expect(r.fee).toBe(5300);
    expect(r.tier?.tier).toBe("C1");
  });

  it("非課税 → B 0円（同じ所得割0円でも結果が違う）", () => {
    const r = calc(input({ municipalityId: "kanagawa-kawasaki", taxStatus: "nonTaxable" }))!;
    expect(r.fee).toBe(0);
    expect(r.tier?.tier).toBe("B");
  });

  it("所得割相当額 475,299円 → C24 81,500円 / 475,300円 → C25 82,800円", () => {
    expect(feeOfCalc({ municipalityId: "kanagawa-kawasaki", income: 475299 })).toBe(81500);
    expect(feeOfCalc({ municipalityId: "kanagawa-kawasaki", income: 475300 })).toBe(82800);
  });
});

describe("★名古屋市★ 年度が違うデータ（fiscalYear: 2025）", () => {
  it("T-22: 所得割 518,000円 / 2026-06 → Ｃ16 64,000円だが年度不一致を必ず知らせる", () => {
    const r = calc(input({ municipalityId: "aichi-nagoya", income: 518000 }))!;
    expect(r.fee).toBe(64000);
    expect(r.tier?.tier).toBe("Ｃ16階層");
    expect(r.fiscalYearMismatch).toBe(true);
    expect(r.underReview[0].summary).toContain("令和8年度版が未公表");
  });

  it("令和7年度（2025-06）の試算なら年度不一致にならない＝データ更新で警告が自動的に消える", () => {
    const r = calc(input({ municipalityId: "aichi-nagoya", month: "2025-06", income: 518000 }))!;
    expect(r.fiscalYearMismatch).toBe(false);
  });

  it("年度は4月始まり（2026-03 は令和7年度、2026-04 は令和8年度）", () => {
    expect(fiscalYearOf("2026-03")).toBe(2025);
    expect(fiscalYearOf("2026-04")).toBe(2026);
    const m = getMunicipality("aichi-nagoya")!;
    expect(isFiscalYearMismatch(m, "2026-03")).toBe(false);
    expect(isFiscalYearMismatch(m, "2026-04")).toBe(true);
  });

  /**
   * ★令和8年度版が未公表の自治体は fiscalYear:2025 のまま収録する★（名古屋市方式）
   * どの自治体がR7版かを列挙すると、R8版が公表されて差し替えるたびにテストが壊れる。
   * 代わりに「R7版なら年度不一致を知らせ、かつ under-review の改正メモを必ず持つ」という
   * 規約そのものをデータから導いて検査する。
   */
  it("令和7年度版に留まる自治体だけが年度不一致になり、必ず under-review の改正メモを持つ", () => {
    const r7 = municipalities.filter((m) => m.fiscalYear === 2025);
    expect(r7.length).toBeGreaterThan(0);
    for (const m of r7) {
      expect(isFiscalYearMismatch(m, "2026-06"), m.id).toBe(true);
      expect(
        m.amendments?.some((a) => a.status === "under-review"),
        `${m.id} は令和7年度版のため under-review の改正メモが必須`,
      ).toBe(true);
    }
    for (const m of municipalities.filter((m) => m.fiscalYear === 2026)) {
      expect(isFiscalYearMismatch(m, "2026-06"), m.id).toBe(false);
    }
  });
});

describe("★階層表がある前提にしない★ 練馬（1行）・東京23区（全階層0円）", () => {
  it("T-23: 練馬 / 所得割 1,000,000円 → 0円（tiers は1行）", () => {
    const m = getMunicipality("tokyo-nerima")!;
    expect(m.tiers).toHaveLength(1);
    const r = calc(input({ municipalityId: "tokyo-nerima", income: 1000000 }))!;
    expect(r.fee).toBe(0);
    expect(r.tier?.tier).toBe("全階層(区分なし)");
  });

  it("練馬は所得割額を聞いても階層が動かない → 上級者モードを開かない", () => {
    expect(isIncomeInputUseful(getMunicipality("tokyo-nerima")!)).toBe(false);
    // 所得割額が未入力でも 0円 と答えられる
    expect(feeOfCalc({ municipalityId: "tokyo-nerima", income: null })).toBe(0);
  });

  it("練馬には生活保護階層が無いが、全階層0円なので0円と答えられる", () => {
    const r = calc(input({ municipalityId: "tokyo-nerima", taxStatus: "welfare" }))!;
    expect(r.fee).toBe(0);
    expect(r.basis).toBe("allZeroFallback");
    expect(r.tier).toBeNull();
  });

  it("T-27: 杉並 / 所得割 1,300,000円 → 0円（D29・全32階層0円）", () => {
    const r = calc(input({ municipalityId: "tokyo-suginami", income: 1300000 }))!;
    expect(r.fee).toBe(0);
    expect(r.tier?.tier).toBe("D29");
    expect(isAllZero(getMunicipality("tokyo-suginami")!, "under3", "standard")).toBe(true);
  });

  it("世田谷は均等割のみに対応する階層が無いが、全階層0円なので0円と答えられる", () => {
    expect(resolveEqualOnlyTier(getMunicipality("tokyo-setagaya")!)).toBeNull();
    const r = calc(input({ municipalityId: "tokyo-setagaya", taxStatus: "equalOnly" }))!;
    expect(r.fee).toBe(0);
    expect(r.basis).toBe("allZeroFallback");
  });

  it("★東京23区6区・大阪(R8/9〜)は全世帯0円★（無償化の根拠つきで言い切れる）", () => {
    const free = [
      "tokyo-setagaya",
      "tokyo-nerima",
      "tokyo-ota",
      "tokyo-edogawa",
      "tokyo-adachi",
      "tokyo-suginami",
    ];
    for (const id of free) {
      const r = calc(input({ municipalityId: id, income: 1000000 }))!;
      expect(r.fee).toBe(0);
      // 0円の根拠（自治体独自の無償化）と出典が data から取れる
      expect(r.municipality.freeTuition?.localExtension).toBeTruthy();
      expect(r.municipality.sources[0].url).toContain("http");
    }
    expect(feeOfCalc({ municipalityId: "osaka-osaka", month: "2026-09", income: 1000000 })).toBe(0);
  });

  it("最下位D階層の incomeMin:0 が B/C と重複しても、課税状況で先に分岐する", () => {
    // 江戸川 D1 は incomeMin:0。均等割のみ課税なら C 階層に解決される
    const r = calc(input({ municipalityId: "tokyo-edogawa", taxStatus: "equalOnly" }))!;
    expect(r.tier?.tier).toBe("C");
    const d = calc(input({ municipalityId: "tokyo-edogawa", income: 1000 }))!;
    expect(d.tier?.tier).toBe("D1");
  });
});

describe("★足立区★ 保育料0円は答えられるが D1〜D25 の階層は特定できない", () => {
  it("T-24: 所得割 300,000円 → 0円・階層は D階層（細分は未公表）", () => {
    const r = calc(input({ municipalityId: "tokyo-adachi", income: 300000 }))!;
    expect(r.fee).toBe(0);
    expect(r.tier?.tier).toBe("D階層");
    expect(r.tier?.incomeMax).toBeNull();
    expect(r.underReview.some((a) => a.summary.includes("D1からD25階層"))).toBe(true);
  });

  it("D階層に境界が無いため所得割額の直接入力は提供しない", () => {
    expect(isIncomeInputUseful(getMunicipality("tokyo-adachi")!)).toBe(false);
    expect(feeOfCalc({ municipalityId: "tokyo-adachi", income: null })).toBe(0);
  });

  it("A階層の incomeMax:null に引きずられず、生活保護はフラグで判定する", () => {
    const r = calc(input({ municipalityId: "tokyo-adachi", taxStatus: "welfare" }))!;
    expect(r.tier?.tier).toBe("A階層");
    expect(r.tier?.isWelfare).toBe(true);
  });

  it("所得割額を入力できる自治体（横浜・大阪等）では上級者モードを開く", () => {
    for (const id of ["kanagawa-yokohama", "osaka-osaka", "hokkaido-sapporo", "tokyo-setagaya"]) {
      expect(isIncomeInputUseful(getMunicipality(id)!)).toBe(true);
    }
  });
});

describe("T-26: 福岡市（表題が「（案）」のまま）", () => {
  it("所得割 397,000円 → D11 83,200円。金額は出すが確定版でないことを告げられる", () => {
    const r = calc(input({ municipalityId: "fukuoka-fukuoka", income: 397000 }))!;
    expect(r.fee).toBe(83200);
    expect(r.tier?.tier).toBe("D11");
    expect(r.underReview.some((a) => a.summary.includes("（案）"))).toBe(true);
  });

  it("均等割のみ → C1 14,200円（非課税 B の0円と区別する）", () => {
    expect(feeOfCalc({ municipalityId: "fukuoka-fukuoka", taxStatus: "equalOnly" })).toBe(14200);
    expect(feeOfCalc({ municipalityId: "fukuoka-fukuoka", taxStatus: "nonTaxable" })).toBe(0);
  });
});

describe("T-28: 上級者モードには前処理の説明が必ず添えられる（データから取れる）", () => {
  it("横浜: 調整控除のみ控除する旨と、適用しない控除5件が data にある", () => {
    const m = getMunicipality("kanagawa-yokohama")!;
    expect(m.bracketBasis.note).toContain("調整控除額");
    expect(m.bracketBasis.deductionsIgnored).toHaveLength(5);
    expect(m.bracketBasis.deductionsIgnored![0]).toContain("住宅借入金等特別税額控除");
  });

  it("前処理の説明・税年度ルールが41自治体すべてに存在する", () => {
    for (const m of municipalities) {
      expect(m.bracketBasis.note.length).toBeGreaterThan(0);
      expect(m.bracketBasis.taxYearRule.length).toBeGreaterThan(0);
    }
  });

  it("★川崎だけ定額減税の向きが逆★（適用後の額で算定）が data に記録されている", () => {
    const m = getMunicipality("kanagawa-kawasaki")!;
    expect(m.bracketBasis.note).toContain("定額減税");
    expect(m.bracketBasis.note).toContain("適用した後の金額で保育料を算定");
  });

  it("足立の deductionsIgnored は空（未確認）＝勝手に他自治体の控除を流用しない", () => {
    expect(getMunicipality("tokyo-adachi")!.bracketBasis.deductionsIgnored).toEqual([]);
  });
});

describe("★京都市★ 保育利用時間バンド（timeBands・6段階）", () => {
  const kyoto = { municipalityId: "kyoto-kyoto" };
  const m = () => getMunicipality("kyoto-kyoto")!;

  it("timeBands が6バンド・既定は最長の11時間（過小表示を避ける）", () => {
    const tb = m().timeBands!;
    expect(tb.bands.map((b) => b.key)).toEqual(["8.5h", "9h", "9.5h", "10h", "10.5h", "11h"]);
    expect(tb.defaultBandKey).toBe("11h");
    expect(isTimeBandApplicable(m(), "standard")).toBe(true);
    // 保育短時間認定は1区分＝バンド選択を出さない
    expect(isTimeBandApplicable(m(), "short")).toBe(false);
  });

  it("バンド未指定は 11h に解決される（従来の額と同じ＝後方互換）", () => {
    const r = calc(input({ ...kyoto, income: 397000 }))!;
    expect(r.tier?.tier).toBe("㉒");
    expect(r.fee).toBe(94400);
    expect(r.timeBand?.key).toBe("11h");
  });

  it("★過大表示の解消★ 最上位㉒で 8.5時間を選ぶと 80,300円（11時間比 −14,100円）", () => {
    const r = calc(input({ ...kyoto, income: 397000, timeBand: "8.5h" }))!;
    expect(r.fee).toBe(80300);
    expect(94400 - r.fee!).toBe(14100);
    expect(r.timeBand?.key).toBe("8.5h");
    expect(r.timeBand?.label).toContain("８．５時間");
  });

  it("中間バンドも解決できる（㉒: 9h 83,100 / 9.5h 86,000 / 10h 88,800 / 10.5h 91,600）", () => {
    for (const [band, fee] of [
      ["9h", 83100],
      ["9.5h", 86000],
      ["10h", 88800],
      ["10.5h", 91600],
    ] as const) {
      expect(feeOfCalc({ ...kyoto, income: 397000, timeBand: band })).toBe(fee);
    }
  });

  it("保育短時間認定はバンドの影響を受けない（㉒: 77,500円のまま）", () => {
    const r = calc(input({ ...kyoto, income: 397000, need: "short", timeBand: "8.5h" }))!;
    expect(r.fee).toBe(77500);
    expect(r.timeBand).toBeNull();
  });

  it("不正なバンドキーは既定（11h）に解決される（エラーにせず安全側）", () => {
    expect(feeOfCalc({ ...kyoto, income: 397000, timeBand: "12h" })).toBe(94400);
    expect(resolveTimeBandKey(m(), "standard", "unknown")).toBe("11h");
    expect(resolveTimeBandKey(m(), "short", "8.5h")).toBeNull();
  });

  it("境界: 原典「〜円以下」は +1 規約（77,100円→⑨ / 77,101円→⑩）", () => {
    const t9 = calc(input({ ...kyoto, income: 77100 }))!;
    expect(t9.tier?.tier).toBe("⑨");
    expect(t9.fee).toBe(24700);
    const t10 = calc(input({ ...kyoto, income: 77101 }))!;
    expect(t10.tier?.tier).toBe("⑩");
    expect(t10.fee).toBe(25800);
  });

  it("A/B/C: 生活保護①0円・非課税②0円・均等割のみ③はバンド別に有料", () => {
    expect(feeOfCalc({ ...kyoto, taxStatus: "welfare" })).toBe(0);
    expect(feeOfCalc({ ...kyoto, taxStatus: "nonTaxable" })).toBe(0);
    const c = calc(input({ ...kyoto, taxStatus: "equalOnly" }))!;
    expect(c.tier?.tier).toBe("③");
    expect(c.fee).toBe(4600); // 既定 11h
    expect(feeOfCalc({ ...kyoto, taxStatus: "equalOnly", timeBand: "8.5h" })).toBe(4000);
    expect(feeOfCalc({ ...kyoto, taxStatus: "equalOnly", need: "short" })).toBe(3800);
  });

  it("データ整合: 有料20階層すべてが全6バンドを持ち、11h＝standard・時間が長いほど高い（単調非減少）", () => {
    const banded = m().tiers.filter((t) => t.fees.under3?.standardByBand);
    expect(banded).toHaveLength(20); // ③〜㉒（①②は0円のためバンドなし）
    const order = ["8.5h", "9h", "9.5h", "10h", "10.5h", "11h"];
    for (const t of banded) {
      const byBand = t.fees.under3!.standardByBand!;
      expect(Object.keys(byBand).sort(), t.tier).toEqual([...order].sort());
      expect(byBand["11h"], t.tier).toBe(t.fees.under3!.standard);
      for (let i = 1; i < order.length; i++) {
        expect(byBand[order[i]], `${t.tier} ${order[i]}`).toBeGreaterThanOrEqual(
          byBand[order[i - 1]],
        );
      }
      // 保育短時間は最短バンドよりさらに安いか同額（8時間まで）
      expect(t.fees.under3!.short!, t.tier).toBeLessThanOrEqual(byBand["8.5h"]);
    }
  });

  it("★他68自治体への影響なし★ timeBands を持つのは京都市のみで、バンド指定は金額を変えない", () => {
    const others = municipalities.filter((x) => x.id !== "kyoto-kyoto");
    expect(others).toHaveLength(68);
    for (const o of others) {
      expect(o.timeBands, o.id).toBeUndefined();
      expect(isTimeBandApplicable(o, "standard"), o.id).toBe(false);
    }
    // バンドを指定しても timeBands の無い自治体では無視される（横浜 D27）
    const withBand = calc(
      input({ municipalityId: "kanagawa-yokohama", income: 397001, timeBand: "8.5h" }),
    )!;
    expect(withBand.fee).toBe(77500);
    expect(withBand.timeBand).toBeNull();
  });
});

describe("★中核市バッチ1★ 船橋・川口・鹿児島・八王子・姫路（人口順1〜5位、P2-D01）", () => {
  it("★八王子市★ 階層表が無く全額0円（東京23区とは別に、都の負担軽減事業で無償化）", () => {
    const m = getMunicipality("tokyo-hachioji")!;
    expect(m.tiers).toHaveLength(1);
    expect(isIncomeInputUseful(m)).toBe(false);
    const r = calc(input({ municipalityId: "tokyo-hachioji", income: null }))!;
    expect(r.fee).toBe(0);
    expect(r.basis).toBe("tier");
    expect(r.tierIssue).toBeNull();
  });

  it("★姫路市★ fiscalYear が2025のため2026年度の試算では fiscalYearMismatch が立つ", () => {
    const m = getMunicipality("hyogo-himeji")!;
    expect(m.fiscalYear).toBe(2025);
    expect(isFiscalYearMismatch(m, "2026-06")).toBe(true);
    // 未確定でも令和7年度の値として金額は出す（3歳未満・C1未満の境界）
    expect(feeOfCalc({ municipalityId: "hyogo-himeji", income: 48599 })).toBe(13500);
    expect(feeOfCalc({ municipalityId: "hyogo-himeji", income: 48600 })).toBe(19600);
  });

  it("★川口市★ 均等割のみ課税（第3階層）は非課税（第2階層=0円）と区別される", () => {
    const m = getMunicipality("saitama-kawaguchi")!;
    const equalOnly = resolveEqualOnlyTier(m);
    expect(equalOnly?.tier).toBe("第3階層");
    expect(feeOfCalc({ municipalityId: "saitama-kawaguchi", taxStatus: "equalOnly", income: null })).toBe(
      6000,
    );
    expect(feeOfCalc({ municipalityId: "saitama-kawaguchi", taxStatus: "nonTaxable", income: null })).toBe(
      0,
    );
  });

  it("★船橋市★ 3歳以上児は無償化で0円、3歳未満児は境界値どおり階層が変わる", () => {
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
