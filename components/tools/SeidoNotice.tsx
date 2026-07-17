import {
  basisYearLabel,
  formatJaDate,
  upcomingChanges,
  type SeidoDataset,
} from "@/lib/tools/seido";

/**
 * 制度データ由来の注記（準拠年度・次回改定予定・免責）。
 * すべて data/seido/*.json から導出するため、制度が変わったときは
 * データを差し替えるだけで表示が追随する（コード修正不要）。
 *
 * 「根拠・計算式」セクションの末尾に置く想定（ToolShell の formula 内）。
 */
export function SeidoNotice({
  datasets,
  today,
}: {
  /** このツールが根拠にしている制度データ（複数可） */
  datasets: SeidoDataset[];
  /** 基準日（ISO）。次回改定予定の絞り込みに使う */
  today: string;
}) {
  const changes = datasets.flatMap((ds) =>
    upcomingChanges(ds, today).map((c) => ({ ...c, datasetName: ds.name })),
  );
  changes.sort((a, b) => a.date.localeCompare(b.date));

  return (
    <section className="mt-6 space-y-4 border-t border-line pt-4">
      <div>
        <h3 className="text-sm font-bold">このツールが使っている制度データ</h3>
        <ul className="mt-1 space-y-1 text-sm text-ink-muted">
          {datasets.map((ds) => (
            <li key={ds.id}>
              {ds.name} — {basisYearLabel(ds.fiscalYear)}（内容の確認日: {formatJaDate(ds.asOf)}）
            </li>
          ))}
        </ul>
      </div>

      {changes.length > 0 && (
        <div>
          <h3 className="text-sm font-bold">次回改定予定</h3>
          <ul className="mt-1 space-y-2 text-sm text-ink-muted">
            {changes.map((c) => (
              <li key={`${c.datasetName}-${c.date}-${c.summary.slice(0, 20)}`}>
                <span className="font-medium text-ink">
                  {formatJaDate(c.date)}
                  {c.isExpiry && "（この日から金額が変わります）"}
                </span>
                <br />
                {c.summary}
                {c.source && (
                  <>
                    {" "}
                    <a
                      href={c.source.landingUrl ?? c.source.url}
                      className="underline decoration-line underline-offset-4 hover:text-ink"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      （{c.source.publisher}）
                    </a>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="text-sm font-bold">ご利用にあたって</h3>
        {datasets.map((ds) => (
          <p key={ds.id} className="mt-1 text-sm text-ink-muted">
            {ds.disclaimer}
          </p>
        ))}
      </div>
    </section>
  );
}

/**
 * データの有効期限が切れているときの表示。
 * 古い金額を出し続けるより「更新中」と正直に言うほうが安全（YMYL）。
 */
export function SeidoExpiredNotice({ datasets }: { datasets: SeidoDataset[] }) {
  return (
    <div className="rounded-card border border-caution/40 p-4 text-sm">
      <p className="font-bold">制度データを更新中です</p>
      <p className="mt-1 text-ink-muted">
        {datasets.map((d) => d.name).join("・")}
        の金額は改定時期を迎えています。古い金額で誤った試算をお見せしないよう、
        計算を停止しています。最新の数値に更新するまでお待ちください。
      </p>
    </div>
  );
}
