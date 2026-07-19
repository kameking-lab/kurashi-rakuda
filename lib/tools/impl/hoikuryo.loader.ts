/**
 * 保育料 個別自治体データの【オンデマンド読込】（診断 S-2 の根治）。
 *
 * ★なぜ動的 import なのか★
 * 全自治体の階層表（data/seido/hoikuryo/*.json、147件で約3.2MB・目標1,700超）をクライアントの
 * 初期バンドルに載せると、ツール詳細ページの First Load JS が自治体数に比例して際限なく肥大する
 * （診断 S-2）。そこで、セレクタは軽量索引（hoikuryo.index.generated.ts）だけを同梱し、
 * 選ばれた自治体の階層表はこの loader が JSON を1件ずつ動的 import する（＝自治体ごとに別チャンク・
 * 選択時にのみ転送）。自治体が増えても、増えるのは「使われたときだけ落ちてくる別チャンク」で、
 * 初期バンドルにも他ツールにも影響しない。
 *
 * テンプレートリテラルの動的 import は、バンドラが data/seido/hoikuryo/ をコンテキストとして解決し、
 * JSON ごとに遅延チャンクを生成する（webpack/Turbopack 共通の挙動）。id は必ず
 * municipalitiesIndex（同じディレクトリから生成）由来なので、実在するファイルにのみ解決される。
 */
import type { HoikuryoMunicipality } from "./hoikuryo";

/** 選択された自治体の階層表を1件だけ読み込む。未収集・OTHER 等は呼び出し側で弾く前提だが、防御的に null を返す。 */
export function loadMunicipality(id: string): Promise<HoikuryoMunicipality | null> {
  if (!id) return Promise.resolve(null);
  return import(`../../../data/seido/hoikuryo/${id}.json`)
    .then((mod) => ((mod as { default?: unknown }).default ?? mod) as unknown as HoikuryoMunicipality)
    .catch(() => null);
}
