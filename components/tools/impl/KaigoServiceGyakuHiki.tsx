"use client";

import { useMemo, useState } from "react";
import { ResultCard } from "@/components/ui/ResultCard";
import { Callout } from "@/components/ui/Callout";
import {
  WORRIES,
  SERVICE_CATEGORY_LABELS,
  SERVICE_CATEGORY_ORDER,
  getServicesForWorries,
  groupServicesByCategory,
  KUBUN_SHIKYU_GENDO_LEVELS,
} from "./KaigoServiceGyakuHiki.calc";

/*
 * 介護サービス種類 かんたん逆引き（P2-T40）
 * — specs/b-tools/p2-t40-kaigo-service-gyaku-hiki.md
 *
 * 「困りごと」を複数選択すると、該当する介護保険サービスの種類を名前・概要つきで
 * その場で逆引き表示する。すべてクライアント内で完結し、送信・保存は一切行わない。
 *
 * ★このUIが絶対に書かないもの★
 *   - サービス種類の名称・分類が data/seido/kaigo-hoken.json の数値データそのものであるかのような表示
 *     （実際は介護保険法第8条等に基づく一般的な整理。KaigoServiceGyakuHiki.calc.ts 冒頭コメント参照）
 *   - 「このサービスを使えば必ず解決する」という断定（あくまで一般的な対応の目安）
 *   - 要介護度の「状態像」（法令・告示に根拠がない）
 */

export function KaigoServiceGyakuHiki() {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const matched = useMemo(() => getServicesForWorries(Array.from(selected)), [selected]);
  const grouped = useMemo(() => groupServicesByCategory(matched), [matched]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <Callout>
        今、困っていることを当てはまるだけ選んでね。選んだ内容に応じて、関係しそうな介護保険サービスの種類をその場で表示するよ。送信や保存はしていないから、選んだ内容は画面を離れると残らないよ。
      </Callout>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">今、困っていること（複数選択できます）</legend>
        <div className="space-y-2">
          {WORRIES.map((w) => (
            <label
              key={w.id}
              className="flex min-h-12 items-start gap-3 rounded-card border border-line px-4 py-2"
            >
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 shrink-0"
                checked={selected.has(w.id)}
                onChange={() => toggle(w.id)}
              />
              <span>{w.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {selected.size === 0 && (
        <Callout>困りごとを選ぶと、該当するサービスの種類をここに表示するよ。</Callout>
      )}

      {selected.size > 0 && (
        <div className="space-y-4">
          <ResultCard
            label="該当しそうなサービスの種類"
            value={`${matched.length}`}
            unit="種類"
            note="選んだ困りごとの数だけでなく、重複するサービスは1件にまとめて数えているよ"
          />

          {SERVICE_CATEGORY_ORDER.map((cat) => {
            const items = grouped[cat];
            if (items.length === 0) return null;
            return (
              <div key={cat} className="rounded-card border border-line p-4 text-sm sm:text-base">
                <h2 className="text-base font-bold">{SERVICE_CATEGORY_LABELS[cat]}</h2>
                <ul className="mt-3 space-y-4">
                  {items.map((s) => (
                    <li key={s.key}>
                      <p className="font-medium">{s.name}</p>
                      <p className="mt-1 text-ink-muted">{s.overview}</p>
                      <p className="mt-1 text-xs text-ink-muted">
                        根拠: {s.legalBasis} ／ 選んだ困りごと: {s.matchedWorryLabels.join("、")}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          <Callout tone="caution">
            <p>
              これは一般的な対応の目安であり、「このサービスを使えば必ず解決する」というものではありません。実際にどのサービスをどれだけ使えるかは、要介護度・お住まいの地域・事業所の空き状況などによって変わります。
              <strong>
                実際の利用にあたっては、担当のケアマネジャー（居宅介護支援事業所）またはお住まいの市区町村・地域包括支援センターに必ずご相談ください。
              </strong>
            </p>
          </Callout>
        </div>
      )}

      <div className="rounded-card border border-line p-4 text-sm sm:text-base">
        <h2 className="text-base font-bold">介護保険サービスを使うための前提（参考情報）</h2>
        <p className="mt-2 text-ink-muted">
          介護保険のサービスを利用するには、原則として市区町村による要介護認定（要支援1・2または要介護1〜5）を受ける必要があります。
        </p>
        <p className="mt-2 text-ink-muted">
          居宅サービスは、1か月に利用できる金額の上限（区分支給限度基準額）が要介護度ごとに定められています。以下は「その他地域」（1単位=10円）で換算した参考額です。実際の1単位の単価は地域区分により異なります。
        </p>
        <ul className="mt-2 space-y-1 text-ink-muted">
          {KUBUN_SHIKYU_GENDO_LEVELS.map((lv) => (
            <li key={lv.key}>
              {lv.label}: {lv.units.toLocaleString("ja-JP")}単位（{lv.yenAt10.toLocaleString("ja-JP")}円相当）
            </li>
          ))}
        </ul>
        <p className="mt-2 text-ink-muted">
          この上限額は、本ツールが逆引き表示するサービスの種類そのものとは独立した参考情報です。実際の自己負担額の目安は「介護保険
          自己負担シミュレーター」で確認できます。
        </p>
      </div>
    </div>
  );
}
