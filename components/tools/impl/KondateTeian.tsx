"use client";

import { useEffect, useMemo, useState } from "react";
import { NumberField, SelectField } from "@/components/ui/Field";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import {
  generate,
  rerollDay,
  rerollDish,
  nextSeed,
  searchExcludableIngredients,
  searchMains,
  suggestForFixedMain,
  suggestFromPantry,
  excludeNotice,
  reuseSentence,
  encodeConditions,
  decodeConditions,
  ingredientName,
  kondateData,
  KONDATE_DISCLAIMER,
  DEFAULT_CONDITIONS,
  MAX_EXCLUDE_IDS,
  type Conditions,
  type Course,
  type Day,
  type Failure,
  type GenreCondition,
  type Recipe,
  type WeekMenu,
} from "@/lib/tools/impl/kondate-teian";

/*
 * 献立自動提案（Q3-16）— specs/s-tools/06-kondate-teian.md
 *
 * ★開いた瞬間に献立が出ていること（§9.8）★ 必須項目は1つも作らない（§5）。
 * すべてクライアント内で即時計算（静的データ＋クライアント抽選。送信なし・登録なし・アプリDL不要）。
 * 制度データは使わない（§1.3）。栄養価・健康効果・アレルギー安全性の判断は一切しない（§2.2）。
 */

const D = kondateData;
const DAY_LABELS = ["1日目", "2日目", "3日目", "4日目", "5日目", "6日目", "7日目"];
const COURSE_LABELS: Record<Course, string> = { main: "主菜", side: "副菜", soup: "汁物" };

/** シードの生成は UI 層の責務（§9.1）。crypto が無い環境でも壊れないようにする */
function newSeed(): number {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] >>> 0;
  }
  return 0;
}

function DishRow({
  course,
  recipe,
  onReroll,
}: {
  course: Course;
  recipe: Recipe;
  onReroll: () => void;
}) {
  return (
    <li className="flex items-baseline justify-between gap-3 py-1">
      <div className="min-w-0">
        <span className="mr-2 text-sm text-ink-muted">{COURSE_LABELS[course]}</span>
        <span className="font-medium">{recipe.name}</span>
        <span className="ml-2 text-sm text-ink-muted tabular-nums">{recipe.cookTimeMin}分</span>
      </div>
      <button
        type="button"
        onClick={onReroll}
        className="shrink-0 rounded-card border border-line px-3 py-1 text-sm"
      >
        これを変える
      </button>
    </li>
  );
}

function DayCard({
  day,
  onRerollDay,
  onRerollDish,
}: {
  day: Day;
  onRerollDay: () => void;
  onRerollDish: (course: Course) => void;
}) {
  return (
    <div className="rounded-card border border-line p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="font-bold">{DAY_LABELS[day.index]}</p>
        <div className="flex items-center gap-3">
          <p className="text-sm text-ink-muted tabular-nums">
            目安 {day.totalTimeMin}分（順番に作った場合）
          </p>
          <button
            type="button"
            onClick={onRerollDay}
            className="rounded-card border border-line px-3 py-1 text-sm"
          >
            この日を引き直す
          </button>
        </div>
      </div>
      <ul className="mt-2">
        <DishRow course="main" recipe={day.main} onReroll={() => onRerollDish("main")} />
        <DishRow course="side" recipe={day.side} onReroll={() => onRerollDish("side")} />
        {day.soup && <DishRow course="soup" recipe={day.soup} onReroll={() => onRerollDish("soup")} />}
      </ul>
    </div>
  );
}

function FailureView({ failure }: { failure: Failure }) {
  return (
    <Callout tone="caution">
      <p className="font-medium">{failure.message}</p>
      {failure.relaxHints.length > 0 && (
        <>
          <p className="mt-2">条件をこう変えると作れます。</p>
          <ul className="mt-1 list-disc pl-5">
            {failure.relaxHints.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </>
      )}
    </Callout>
  );
}

export function KondateTeian() {
  const [conditions, setConditions] = useState<Conditions>(DEFAULT_CONDITIONS);
  // ★開いた瞬間に献立が出ている★ 初期シードは 0（サーバー描画と一致させ、初回描画をずらさない）
  const [seed, setSeed] = useState(0);
  const [nonces, setNonces] = useState<Record<string, number>>({});
  const [overrides, setOverrides] = useState<WeekMenu | null>(null);
  const [query, setQuery] = useState("");
  const [mainQuery, setMainQuery] = useState("");
  const [selectedMainId, setSelectedMainId] = useState<string | null>(null);
  const [fixedMainSeed, setFixedMainSeed] = useState(0);
  const [pantry, setPantry] = useState<string[]>([]);
  const [pantryQuery, setPantryQuery] = useState("");
  const [versionMismatch, setVersionMismatch] = useState(false);

  // URL に条件・シードがあれば読む。無ければシードを1回だけ作って URL へ書き戻す（§4.2）
  useEffect(() => {
    const decoded = decodeConditions(window.location.search.replace(/^\?/, ""));
    if (decoded.version !== null && decoded.version !== `${D.version}.${D.algorithmVersion}`) {
      setVersionMismatch(true);
      return;
    }
    if (decoded.seed !== null) {
      setConditions(decoded.conditions);
      setSeed(decoded.seed);
    } else {
      setSeed(newSeed());
    }
    // 初回のみ実行する（依存配列は空で固定）
  }, []);

  useEffect(() => {
    const q = encodeConditions(conditions, seed);
    window.history.replaceState(null, "", `?${q}`);
  }, [conditions, seed]);

  const base = useMemo(() => generate(conditions, seed), [conditions, seed]);

  // 引き直しの結果は base の上に積む（週の再生成が起きたら捨てる）
  useEffect(() => {
    setOverrides(null);
    setNonces({});
  }, [conditions, seed]);

  const result = overrides ? { ok: true as const, menu: overrides } : base;

  // 引き直し回数（nonce）は日・品ごとに独立して数える（§4.2）
  const handleRerollDay = (dayIndex: number) => {
    if (!result.ok) return;
    const key = `d${dayIndex}`;
    const n = (nonces[key] ?? 0) + 1;
    setNonces({ ...nonces, [key]: n });
    const r = rerollDay(result.menu, conditions, dayIndex, n);
    if (r.ok) setOverrides(r.menu);
  };

  const handleRerollDish = (dayIndex: number, course: Course) => {
    if (!result.ok) return;
    const key = `d${dayIndex}${course}`;
    const n = (nonces[key] ?? 0) + 1;
    setNonces({ ...nonces, [key]: n });
    const r = rerollDish(result.menu, conditions, dayIndex, course, n);
    if (r.ok) setOverrides(r.menu);
  };

  const setCond = (patch: Partial<Conditions>) => setConditions((c) => ({ ...c, ...patch }));

  const candidates = useMemo(() => searchExcludableIngredients(query, D.ingredients), [query]);
  const mainCandidates = useMemo(() => searchMains(mainQuery), [mainQuery]);
  const selectedMain = useMemo(
    () => (selectedMainId ? (D.recipes.find((r) => r.id === selectedMainId && r.course === "main") ?? null) : null),
    [selectedMainId],
  );
  const fixedMainResult = useMemo(
    () => (selectedMainId ? suggestForFixedMain(selectedMainId, conditions, fixedMainSeed) : null),
    [selectedMainId, conditions, fixedMainSeed],
  );
  const pantryCandidates = useMemo(
    () => searchExcludableIngredients(pantryQuery, D.ingredients),
    [pantryQuery],
  );
  const pantrySuggest = useMemo(
    () =>
      pantry.length === 0
        ? null
        : suggestFromPantry(pantry, { excludeIds: conditions.excludeIds, limit: 5 }),
    [pantry, conditions.excludeIds],
  );

  const notice = excludeNotice(conditions.excludeIds);
  const today = result.ok ? result.menu.days[0] : null;

  return (
    <div className="space-y-5">
      {/* ★免責①は常時表示（§8.3 / TC-39）。折りたたまない★ */}
      <Callout tone="caution">{KONDATE_DISCLAIMER.allergy}</Callout>

      {versionMismatch ? (
        <Callout tone="caution">
          レシピが更新されたため、この URL の献立は再現できません。同じ条件で新しく作る場合は、
          ページを開き直してください。
        </Callout>
      ) : !result.ok ? (
        <FailureView failure={result.failure} />
      ) : (
        <>
          {today && (
            <ResultCard
              label="今日の献立は"
              value={today.main.name}
              note={`${today.side.name}${today.soup ? `／${today.soup.name}` : ""}・目安 ${today.totalTimeMin}分（順番に作った場合）`}
            />
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSeed(nextSeed(seed))}
              className="rounded-card border border-line px-4 py-2 text-sm font-medium"
            >
              1週間分を引き直す
            </button>
            {notice && <p className="self-center text-sm text-ink-muted">{notice}</p>}
          </div>

          <div>
            <h2 className="text-base font-bold">1週間分の献立</h2>
            <div className="mt-2 space-y-2">
              {result.menu.days.map((d) => (
                <DayCard
                  key={d.index}
                  day={d}
                  onRerollDay={() => handleRerollDay(d.index)}
                  onRerollDish={(c) => handleRerollDish(d.index, c)}
                />
              ))}
            </div>
          </div>

          {result.menu.reuse.length > 0 && (
            <div>
              <h2 className="text-base font-bold">同じ食材を使い切れます</h2>
              <ul className="mt-2 list-disc pl-5 text-sm text-ink-muted">
                {result.menu.reuse.slice(0, 6).map((n) => (
                  <li key={n.ingredientId}>{reuseSentence(n)}</li>
                ))}
              </ul>
            </div>
          )}

          {result.menu.warnings.length > 0 && (
            <Callout>
              <ul className="list-disc pl-5">
                {result.menu.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </Callout>
          )}

          {conditions.servings !== 2 && (
            <Callout>
              人数は表示のためだけに使っています。レシピは2人分が基準なので、{conditions.servings}
              人分にするには材料をおよそ {(conditions.servings / 2).toFixed(1)} 倍にしてください。
            </Callout>
          )}
        </>
      )}

      {/* ---------------- 条件（気に入らなかった人が触るもの。§5） ---------------- */}
      <div>
        <h2 className="text-base font-bold">条件を変える</h2>
        <div className="mt-2 grid gap-4 sm:grid-cols-2">
          <NumberField
            label="人数"
            value={String(conditions.servings)}
            min={1}
            max={8}
            step="1"
            hint="大人2人＋子ども1人なら3人で。献立の中身は変わりません"
            onChange={(e) => setCond({ servings: Number(e.target.value) })}
          />
          <NumberField
            label="1日の合計調理時間の上限"
            value={String(conditions.maxTotalTimeMin)}
            min={10}
            max={180}
            step="5"
            hint="目安です（順番に作った場合）"
            onChange={(e) => setCond({ maxTotalTimeMin: Number(e.target.value) })}
          />
          <SelectField
            label="ジャンル"
            value={conditions.genre}
            hint="汁物はジャンルで絞りません（味噌汁は洋食の日にも出ます）"
            onChange={(e) => setCond({ genre: e.target.value as GenreCondition })}
          >
            <option value="any">おまかせ</option>
            <option value="japanese">和食</option>
            <option value="western">洋食</option>
            <option value="chinese">中華</option>
          </SelectField>
          <SelectField
            label="汁物をつける"
            value={conditions.includeSoup ? "yes" : "no"}
            hint="つけないと1日15分ほど短くなります"
            onChange={(e) => setCond({ includeSoup: e.target.value === "yes" })}
          >
            <option value="yes">つける</option>
            <option value="no">つけない</option>
          </SelectField>
        </div>
      </div>

      {/* ---------------- 副菜だけ提案してもらう（P4-T02。主菜固定→副菜・汁物だけ抽選） ---------------- */}
      <div>
        <h2 className="text-base font-bold">副菜だけ提案してもらう</h2>
        <p className="mt-1 text-sm text-ink-muted">
          作りたい主菜がもう決まっているときに、それに合う副菜・汁物だけを抽選します。上の「条件を変える」（人数以外）がここにも適用されます。
        </p>
        <div className="mt-2 flex flex-col gap-1">
          <label htmlFor="kondate-main-search" className="text-sm font-medium">
            主菜を選ぶ
          </label>
          <input
            id="kondate-main-search"
            type="search"
            value={mainQuery}
            placeholder="しょうが焼き / 麻婆豆腐 など"
            onChange={(e) => setMainQuery(e.target.value)}
            className="min-h-12 w-full rounded-card border border-line bg-paper px-4 text-base text-ink"
          />
        </div>
        {mainCandidates.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {mainCandidates.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className="rounded-card border border-line px-3 py-1 text-sm"
                  onClick={() => {
                    setSelectedMainId(r.id);
                    setFixedMainSeed(newSeed());
                    setMainQuery("");
                  }}
                >
                  {r.name}
                </button>
              </li>
            ))}
          </ul>
        )}
        {selectedMain && fixedMainResult && (
          <div className="mt-3">
            {fixedMainResult.ok ? (
              <div className="space-y-2">
                <ResultCard
                  label={`「${selectedMain.name}」に合わせるなら`}
                  value={fixedMainResult.day.side.name}
                  note={`${fixedMainResult.day.soup ? `汁物: ${fixedMainResult.day.soup.name}／` : ""}目安 ${fixedMainResult.day.totalTimeMin}分（順番に作った場合）`}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setFixedMainSeed(nextSeed(fixedMainSeed))}
                    className="rounded-card border border-line px-4 py-2 text-sm font-medium"
                  >
                    副菜・汁物を引き直す
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedMainId(null)}
                    className="rounded-card border border-line px-4 py-2 text-sm font-medium"
                  >
                    主菜を選び直す
                  </button>
                </div>
                {fixedMainResult.warnings.length > 0 && (
                  <Callout>
                    <ul className="list-disc pl-5">
                      {fixedMainResult.warnings.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  </Callout>
                )}
              </div>
            ) : (
              <FailureView failure={fixedMainResult.failure} />
            )}
          </div>
        )}
      </div>

      {/* ---------------- 使わない食材（★これはアレルギー対応ではありません。§8.3★） ---------------- */}
      <div>
        <h2 className="text-base font-bold">使わない食材</h2>
        <p className="mt-1 text-sm text-ink-muted">
          ※アレルギー対応ではありません。苦手・切らしている・家族が食べない食材を外すための機能です。
          指定した食材を含むレシピを献立から除きます（{MAX_EXCLUDE_IDS}件まで）。
        </p>
        <div className="mt-2 flex flex-col gap-1">
          <label htmlFor="kondate-exclude" className="text-sm font-medium">
            食材名で探す
          </label>
          <input
            id="kondate-exclude"
            type="search"
            value={query}
            placeholder="たまねぎ / 卵 / なす など"
            onChange={(e) => setQuery(e.target.value)}
            className="min-h-12 w-full rounded-card border border-line bg-paper px-4 text-base text-ink"
          />
        </div>
        {candidates.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {candidates.map((i) => (
              <li key={i.id}>
                <button
                  type="button"
                  className="rounded-card border border-line px-3 py-1 text-sm"
                  onClick={() => {
                    if (!conditions.excludeIds.includes(i.id) && conditions.excludeIds.length < MAX_EXCLUDE_IDS) {
                      setCond({ excludeIds: [...conditions.excludeIds, i.id].sort() });
                    }
                    setQuery("");
                  }}
                >
                  ＋{i.name}
                </button>
              </li>
            ))}
          </ul>
        )}
        {conditions.excludeIds.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {conditions.excludeIds.map((id) => (
              <li key={id}>
                <button
                  type="button"
                  className="rounded-card border border-line px-3 py-1 text-sm"
                  onClick={() => setCond({ excludeIds: conditions.excludeIds.filter((x) => x !== id) })}
                >
                  {ingredientName(id, D)} ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ---------------- 手持ち食材からの提案 ---------------- */}
      <div>
        <h2 className="text-base font-bold">家にある食材から探す</h2>
        <p className="mt-1 text-sm text-ink-muted">
          冷蔵庫にあるものを入れると、それを使う主菜・副菜を出します。抽選ではなく一致数の順です。
        </p>
        <div className="mt-2 flex flex-col gap-1">
          <label htmlFor="kondate-pantry" className="text-sm font-medium">
            家にある食材
          </label>
          <input
            id="kondate-pantry"
            type="search"
            value={pantryQuery}
            placeholder="豚こま / キャベツ / 卵 など"
            onChange={(e) => setPantryQuery(e.target.value)}
            className="min-h-12 w-full rounded-card border border-line bg-paper px-4 text-base text-ink"
          />
        </div>
        {pantryCandidates.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {pantryCandidates.map((i) => (
              <li key={i.id}>
                <button
                  type="button"
                  className="rounded-card border border-line px-3 py-1 text-sm"
                  onClick={() => {
                    if (!pantry.includes(i.id)) setPantry([...pantry, i.id].sort());
                    setPantryQuery("");
                  }}
                >
                  ＋{i.name}
                </button>
              </li>
            ))}
          </ul>
        )}
        {pantry.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {pantry.map((id) => (
              <li key={id}>
                <button
                  type="button"
                  className="rounded-card border border-line px-3 py-1 text-sm"
                  onClick={() => setPantry(pantry.filter((x) => x !== id))}
                >
                  {ingredientName(id, D)} ×
                </button>
              </li>
            ))}
          </ul>
        )}
        {pantrySuggest && (
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {(["main", "side"] as const).map((course) => (
              <div key={course}>
                <h3 className="text-sm font-bold">{COURSE_LABELS[course]}の候補</h3>
                {pantrySuggest[course].length === 0 ? (
                  <p className="mt-1 text-sm text-ink-muted">この食材を使う{COURSE_LABELS[course]}は見つかりませんでした。</p>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {pantrySuggest[course].map((m) => (
                      <li key={m.recipe.id} className="text-sm">
                        <span className="font-medium">{m.recipe.name}</span>
                        <span className="ml-2 text-ink-muted tabular-nums">{m.recipe.cookTimeMin}分</span>
                        <span className="ml-2 text-ink-muted">
                          {m.matched.map((id) => ingredientName(id, D)).join("・")}を使います
                          {m.missing.length > 0 &&
                            `／買い足し: ${m.missing.map((id) => ingredientName(id, D)).join("・")}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Callout>
        この画面の URL には条件とシードが入っています。コピーして送れば、相手の画面にも同じ献立が出ます。
        ブックマークすれば来週も同じ献立を開けます。
      </Callout>
    </div>
  );
}
