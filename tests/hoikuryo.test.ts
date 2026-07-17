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
  municipalities,
  multiChildInfo,
  resolveEqualOnlyTier,
  resolveTier,
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

describe("収集済み自治体（27件）", () => {
  it("27自治体を収録しており、id はファイル名と一致する", () => {
    expect(municipalities).toHaveLength(27);
    expect(municipalities.map((m) => m.id)).toEqual([
      "hokkaido-sapporo",
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
      "kanagawa-yokohama",
      "kanagawa-kawasaki",
      "aichi-nagoya",
      "osaka-osaka",
      "fukuoka-fukuoka",
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

  it("収集済み27自治体すべてで3歳以上児は0円", () => {
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

  it("名古屋以外の26自治体は令和8年度（2026-06）で年度不一致にならない", () => {
    for (const m of municipalities.filter((x) => x.id !== "aichi-nagoya")) {
      expect(isFiscalYearMismatch(m, "2026-06")).toBe(false);
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

  it("前処理の説明・税年度ルールが27自治体すべてに存在する", () => {
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
