#!/usr/bin/env node
/**
 * verify-seido.mjs — 制度データと出典ページの機械照合
 *
 * data/seido/ 配下の全JSONについて、以下を検査する:
 *
 *   1. 構造検査（オフライン・常時実行）
 *      - JSONとしてパースできるか
 *      - 共通スキーマの必須フィールド（id/name/fiscalYear/asOf/sources/disclaimer）があるか
 *      - id がファイル名と一致するか
 *      - 全ての sourceId 参照が sources に存在するか（＝出典なしの数値がないか）
 *      - 全ての valueNode に checkedAt があるか
 *      - 一次情報以外の出典が混入していないか（ドメイン許可リスト）
 *      - amendments の expiresOn が past でないか（＝期限切れデータの検出）
 *
 *   2. 出典照合（ネットワーク・--fetch 指定時のみ）
 *      - 各 verify.expect の文字列が、出典ページ本文に実在するか
 *      - HTML は文字コードを判定して本文抽出、PDF は pdftotext / PyMuPDF でテキスト化
 *
 * CIでは「構造検査は常に」「出典照合は日次スケジュール」で回す想定。
 * 出典照合はネットワークと相手サイトの都合で落ちうるため、PRブロックには使わない。
 *
 * Usage:
 *   node scripts/verify-seido.mjs                # 構造検査のみ（高速・オフライン）
 *   node scripts/verify-seido.mjs --fetch        # 出典照合も実行
 *   node scripts/verify-seido.mjs --fetch --only=fuyou-kabe
 *   node scripts/verify-seido.mjs --json         # 機械可読な結果を stdout に
 *
 * Exit codes:
 *   0 = すべてOK（警告はありうる）
 *   1 = エラーあり
 *   2 = 実行時エラー（引数不正・ディレクトリなし等）
 */

import { readFile, readdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, basename, extname, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SEIDO_DIR = join(ROOT, 'data', 'seido');
/**
 * 基準日は JST（日本標準時）で求める。
 * 制度データの checkedAt / effectiveFrom / expiresOn は全て日本の官公庁が定める
 * 日本時間の日付であり、UTC で判定すると日本時間の午前中（UTC では前日）に
 * 「確認日が未来」と誤検知してCIが落ちる。
 * CI のタイムゾーンに依存しないよう、UTC+9 に固定して算出する。
 */
const TODAY = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);

/**
 * 一次情報のみを許可する。まとめサイト・民間解説サイトの混入をCIで機械的に防ぐ。
 * 自治体ドメインは無数にあるため、サフィックスで許可する。
 */
const ALLOWED_HOSTS = [
  'laws.e-gov.go.jp',
  'elaws.e-gov.go.jp',
  'www.e-gov.go.jp',
  'www.mhlw.go.jp',
  'www.cfa.go.jp',
  'www.nta.go.jp',
  'www.mof.go.jp',
  'www.soumu.go.jp',
  'www.nenkin.go.jp',
  'www.kyoukaikenpo.or.jp',
  'www.kaigokensaku.mhlw.go.jp',
  'www.hellowork.mhlw.go.jp',
  'jsite.mhlw.go.jp',
  // ↓2026-07-17 社長決裁で追加した3ドメイン。各団体が自ら策定する基準の出典に限定して使う。
  'www.jasso.or.jp', // 日本肥満学会。肥満度分類（同学会が策定主体）のみ
  'www.jcia.org', // 日本化粧品工業会。SPF/PA測定・表示基準（同会が策定主体）のみ
  'w-health.jp', // 厚生労働省研究班「女性の健康推進室 ヘルスケアラボ」（厚労省事業サイト・非go.jpドメイン）
  'www.w-health.jp',
  // ↓2026-07-17 社長決裁で追加した3ドメイン（.go.jpのためALLOWED_HOST_SUFFIXESで既にマッチするが、
  // 用途注記つきで許可済みドメインとして明示するために個別列挙する）。
  'www.courts.go.jp', // 裁判所。養育費・婚姻費用算定表等の一次情報
  'www.moj.go.jp', // 法務省。民法改正（養育費関連）等の一次情報
  'www.mext.go.jp', // 文部科学省。高等学校等就学支援金・就学援助等の一次情報
  // ↓2026-07-17 社長決裁で追加。★用途は「ツールロジックの学術的根拠」に限定★
  // J-STAGE（科学技術振興機構の論文プラットフォーム）。掲載論文＝査読済み一次文献を、
  // ツールの計算式・目安値の学術的根拠として引く場合のみ許可する。
  // 個別製品・治療法・ダイエット法など消費行動に直結する記述の出典には使わない。
  // （.go.jp サフィックスで機械的には既に通るが、用途限定の決裁記録として個別列挙する。
  //   J-STAGE の論文URLは www.jstage.jst.go.jp 配下）
  'www.jst.go.jp',
  'www.jstage.jst.go.jp',
  // ↓2026-07-18 追加。政府統計の総合窓口 e-Stat（総務省統計局／統計センター）。
  // 統計表の生データ・ダウンロード値の一次出典に用いる（統計局の解説ページ stat.go.jp と使い分け）。
  // （.go.jp サフィックスで機械的には既に通るが、用途注記つきで明示列挙する。
  //   e-stat.go.jp は『.stat.go.jp』で終わらないため stat.go.jp のサフィックス許可では拾えない点にも注意）
  'www.e-stat.go.jp',
  'dashboard.e-stat.go.jp',
];
const ALLOWED_HOST_SUFFIXES = ['.lg.jp', '.go.jp'];
/**
 * 自治体の公式ドメインのうち .lg.jp / .go.jp でないもの。
 * 自治体は子育て情報を別サブドメインの専用サイトで公開していることが多いため
 * （例: 札幌市の kosodate.city.sapporo.jp、名古屋市の kodomokosodate.city.nagoya.jp＝「ここなご」）、
 * ドメイン一致だけでなくサブドメインも許可する。
 * ★ここに追加してよいのは、当該自治体が公式に運営するサイトのみ。★
 * 民間の保活情報サイト・まとめサイトは、たとえ自治体名を冠していても追加してはならない。
 */
const ALLOWED_MUNICIPAL_DOMAINS = [
  'mhlw.go.jp',
  'cfa.go.jp',
  'e-gov.go.jp',
  'nta.go.jp',
  'city.nagoya.jp',
  'city.toyota.aichi.jp',
  'city.kurashiki.okayama.jp',
  'city.amagasaki.hyogo.jp',
  'city.toyama.toyama.jp',
  'city.kashiwa.chiba.jp',
  'city.toyonaka.osaka.jp',
  'city.kanazawa.ishikawa.jp',
  'city.kurume.fukuoka.jp',
  'city.kasuga.fukuoka.jp',
  'city.chikushino.fukuoka.jp',
  'city.onojo.fukuoka.jp',
  'city.takamatsu.kagawa.jp',
  'city.fukuyama.hiroshima.jp',
  'city.onomichi.hiroshima.jp',
  'city.sapporo.jp',
  'city.kochi.kochi.jp',
  'city.naha.okinawa.jp',
  'city.nagasaki.lg.jp',
  'city.miyazaki.miyazaki.jp',
  'city.kawasaki.jp',
  'city.nerima.tokyo.jp',
  'city.ota.tokyo.jp',
  'city.edogawa.tokyo.jp',
  'city.adachi.tokyo.jp',
  'city.suginami.tokyo.jp',
  'city.minato.tokyo.jp',
  'city.shinagawa.tokyo.jp',
  'city.meguro.tokyo.jp',
  // 渋谷区は本体を www.city.shibuya.tokyo.jp、PDF等の添付ファイルを
  // files.city.shibuya.tokyo.jp で配信するため、サブドメイン一致で両方を許可する。
  'city.shibuya.tokyo.jp',
  'city.arakawa.tokyo.jp',
  'city.chiba.jp',
  'city.sagamihara.kanagawa.jp',
  'city.sendai.jp', // city.sendai.lg.jp は存在しない（DNS解決せず）
  'city.hamamatsu.shizuoka.jp', // city.hamamatsu.lg.jp は存在しない（DNS解決せず）
  'city.okayama.jp',
  'city.kumamoto.jp', // city.kumamoto.lg.jp は存在しない（DNS解決せず）
  // 八王子市（中核市）は子育て情報を専用サイト kosodate.city.hachioji.tokyo.jp で公開しており、
  // 本体ドメイン city.hachioji.tokyo.jp とは別ホストのため個別に許可する（P2-D01・2026-07-18）。
  'kosodate.city.hachioji.tokyo.jp',
  'city.matsuyama.ehime.jp', // 松山市（中核市）は city.matsuyama.ehime.lg.jp が存在しない（DNS解決せず。P2-D01・2026-07-18）
  'city.oita.oita.jp', // 大分市（中核市）は city.oita.oita.lg.jp が存在しない（DNS解決せず。P2-D01・2026-07-18）
  'city.kurashiki.okayama.jp', // 倉敷市（中核市）は .lg.jp 版が存在しない（P2-D01・2026-07-18）
  'city.kawagoe.saitama.jp', // 川越市（中核市）の公式サイトは city.kawagoe.saitama.jp（P2-D01 東日本・2026-07-18）
  'city.kofu.yamanashi.jp', // 甲府市（中核市）の公式サイトは city.kofu.yamanashi.jp（.lg.jp版なし。P2-D01 東日本・2026-07-18）
  'city.nagano.nagano.jp', // 長野市（中核市）の公式サイトは city.nagano.nagano.jp（.lg.jp版なし。P2-D01 東日本・2026-07-18）
  'city.morioka.iwate.jp', // 盛岡市（中核市）の公式サイトは city.morioka.iwate.jp（.lg.jp版なし。P2-D01 東日本・2026-07-18）
  'city.maebashi.gunma.jp', // 前橋市（中核市）の公式サイトは city.maebashi.gunma.jp（.lg.jp版なし。P2-D01 東日本・2026-07-18）
  'city.yokosuka.kanagawa.jp', // 横須賀市（中核市）の公式サイトは city.yokosuka.kanagawa.jp（city.yokosuka.lg.jp は存在せずDNS解決しない。2026-07-21）
  'city.higashiomi.shiga.jp', // 東近江市（その他市）の公式サイトは city.higashiomi.shiga.jp（city.higashiomi.lg.jp は名前解決してもサイトが応答しない。2026-07-21）
  // 西宮市（中核市）の公式サイトは独自ドメイン nishi.or.jp。旧 city.nishinomiya.lg.jp は
  // 現在別サービス（CDN）を指しており使えないため個別に許可する（P2-D01・2026-07-18）。
  'nishi.or.jp',
  /**
   * 浜松市例規集のホスティング先。★このドメインだけは自治体自身の運営ではない★
   * 浜松市は保育料表を公式サイトに一切掲載しておらず（保護者向けの案内は民間NPOのサイトに
   * 委託されているが、一次情報でないため出典に採らない）、唯一の一次情報が市の例規集
   * 「浜松市子ども・子育て支援法施行細則」別表であるため、やむを得ず許可する。
   * 掲載されているのは浜松市が制定した規則そのもの＝一次情報であり、市公式サイトの
   * 「例規・公示」ページからリンクされている（該当データの landingUrl に市公式ページを併記）。
   * ★ただし g-reiki.net は多数の自治体が相乗りする事業者ホストであり、ドメイン単位の許可では
   * 他自治体の例規まで一括で通る。ここを出典に使ってよいのは「当該自治体の公式サイトに
   * 一次情報が存在しない」ことを確認した場合に限る。★
   */
  'www1.g-reiki.net',
  /**
   * 金沢市（中核市）の例規集ホスティング先。市公式サイト（www4.city.kanazawa.lg.jp）の
   * 「条例・規則・要綱」ページから直接リンクされる、金沢市自身が運営するReiki-Base例規集。
   * 保育料の階層表（子ども・子育て支援法施行細則 別表）が公式サイト本体には掲載されておらず、
   * この例規集ドメインが唯一の一次情報であるため許可する（P2-D01・2026-07-18）。
   */
  'city.kanazawa.ishikawa.jp',
  'city.toyonaka.osaka.jp', // 豊中市（中核市）は .lg.jp 版が存在しない（P2-D01・2026-07-18）
  'city.toyota.aichi.jp', // 豊田市（中核市）は .lg.jp 版が存在しない。www2.city.toyota.aichi.jp もサブドメイン一致で許可される（P2-D01・2026-07-18）
  'city.amagasaki.hyogo.jp', // 尼崎市（中核市）は city.amagasaki.lg.jp にAレコードが存在しない（P2-D01・2026-07-18）
  /**
   * 一宮市（中核市）は独自ドメイン city.ichinomiya.aichi.jp が公式サイト本体。
   * city.ichinomiya.lg.jp はDNS解決はするがTLS証明書がホスト名と一致せず、
   * 到達先も404（メール用ドメイン info@city.ichinomiya.lg.jp としてのみ使用と見られる）。
   * 実サイトは aichi.jp 側のみのため個別に許可する（P2-D01・2026-07-18）。
   */
  'city.ichinomiya.aichi.jp',
  'city.hirakata.osaka.jp', // 枚方市（中核市）は city.hirakata.lg.jp が存在しない（DNS解決せず。P2-D01・2026-07-18）
  'city.suita.osaka.jp', // 吹田市（中核市）は city.suita.lg.jp が存在しない（P2-D01・2026-07-18）
  'city.takatsuki.osaka.jp', // 高槻市（中核市）は city.takatsuki.lg.jp が存在しない（DNS解決せず。P2-D01・2026-07-18）
  'city.wakayama.wakayama.jp', // 和歌山市（中核市）は city.wakayama.lg.jp が存在しない（DNS解決せず。P2-D01・2026-07-18）
  'city.neyagawa.osaka.jp', // 寝屋川市（中核市）は city.neyagawa.lg.jp が存在しない（P2-D01・2026-07-18）
  'city.yao.osaka.jp', // 八尾市（中核市）は city.yao.lg.jp が存在しない（P2-D01・2026-07-18）
  'city.ibaraki.osaka.jp', // 茨木市（施行時特例市）の公式サイト
  'city.kishiwada.osaka.jp', // 岸和田市（施行時特例市）の公式サイト
  'city.takarazuka.hyogo.jp', // 宝塚市（施行時特例市）の公式サイト
  'city.tokushima.tokushima.jp', // 徳島市の公式サイト
  'city.tokorozawa.saitama.jp', // 所沢市（施行時特例市）の公式サイト
  'city.nagaoka.niigata.jp', // 長岡市（施行時特例市）の公式サイト
  'city.fuji.shizuoka.jp', // 富士市（施行時特例市）は city.fuji.lg.jp が存在しない（DNS解決せず）
  'city.soka.saitama.jp', // 草加市（施行時特例市）は city.soka.saitama.lg.jp が存在しない
  'city.hiratsuka.kanagawa.jp', // 平塚市（施行時特例市）の公式サイト
  'city.chigasaki.kanagawa.jp', // 茅ヶ崎市（施行時特例市）の公式サイト
  'city.matsudo.chiba.jp', // 松戸市の公式サイト
  'kosodate-machida.tokyo.jp', // 町田市の子育てポータル（東京都独自の負担軽減事業でR8は無償）
  'city.fuchu.tokyo.jp', // 府中市（東京都独自の負担軽減事業でR8は無償）
  'city.tsu.mie.jp', // 津市（実サイトはinfo.city.tsu.mie.jpだがサフィックス一致で許可）
  'city.fujisawa.kanagawa.jp', // 藤沢市の公式サイト
  'city.ichihara.chiba.jp', // 市原市の公式サイト
  'prdurbanosichapp1.blob.core.windows.net', // 市原市のPDF添付ファイル格納先（Azure Blob。共有ドメインのためこのサブドメインのみ許可）
  'city.kodaira.tokyo.jp', // 小平市の公式サイト（東京都独自の負担軽減事業拡大＋条例改正でR8は無償）
  'city.nagareyama.chiba.jp', // 流山市の公式サイト
  'city.kamakura.kanagawa.jp', // 鎌倉市の公式サイト
  'city.anjo.aichi.jp', // 安城市（city.anjo.lg.jpはDNS解決不可）
  'city.tomakomai.hokkaido.jp', // 苫小牧市の公式サイト
  'city.oyama.tochigi.jp', // 小山市（city.oyama.lg.jpは存在しない）の公式サイト
  'city.iwata.shizuoka.jp', // 磐田市（city.iwata.lg.jpは無応答）の公式サイト
  'city.nishio.aichi.jp', // 西尾市（city.nishio.lg.jpはDNS解決不可）の公式サイト
  'city.hadano.kanagawa.jp', // 秦野市の公式サイト
  'city.obihiro.hokkaido.jp', // 帯広市（city.obihiro.lg.jpはDNS解決不可）の公式サイト
  'city.takaoka.toyama.jp', // 高岡市（city.takaoka.lg.jpは存在しない）の公式サイト
  'city.higashimurayama.tokyo.jp', // 東村山市の公式サイト
  'city.hirosaki.aomori.jp', // 弘前市（city.hirosaki.lg.jpは存在しない）の公式サイト
  'city.noda.chiba.jp', // 野田市の公式サイト
  // 西日本ブロック 一般市バッチ1（2026-07-20。いずれも .lg.jp 版はDNS解決不可＝これが唯一の公式ドメイン）
  'city.uji.kyoto.jp', // 宇治市の公式サイト
  'city.kawanishi.hyogo.jp', // 川西市の公式サイト
  'city.kusatsu.shiga.jp', // 草津市の公式サイト
  'city.okinawa.okinawa.jp', // 沖縄市の公式サイト
  'city.kashihara.nara.jp', // 橿原市の公式サイト
  'city.kadoma.osaka.jp', // 門真市の公式サイト
  // 西日本ブロック 一般市バッチ2（2026-07-21。いずれも .lg.jp 版はDNS解決不可／存在しない＝これが唯一の公式ドメイン）
  'city.izumo.shimane.jp', // 出雲市の公式サイト
  'city.imabari.ehime.jp', // 今治市の公式サイト（保育料ページは下記 imakoso-imabari.jp へ302リダイレクト）
  // 今治市の子育て情報ポータル「いまこそimabari」。運営主体は今治市役所ネウボラ推進課（フッターに
  // 所在地・電話・メールを明記した市直営サイト）で、市公式サイトの /hoiku/hoikuryo/ から302で
  // 転送される現行の掲載先。今治市利用者負担額表（令和8年度）PDFもこのドメイン配下にある。
  'imakoso-imabari.jp',
  'city.moriguchi.osaka.jp', // 守口市の公式サイト
  'city.miyakonojo.miyazaki.jp', // 都城市の公式サイト（city.miyakonojo.lg.jpはDNS解決不可＝これが唯一の公式ドメイン。2026-07-21）
  // 西日本ブロック 一般市バッチ3（2026-07-21。いずれも .lg.jp 版は存在しない／DNS解決不可＝これが唯一の公式ドメイン）
  'city.hofu.yamaguchi.jp', // 防府市の公式サイト
  'city.nobeoka.miyazaki.jp', // 延岡市の公式サイト
  'city.beppu.oita.jp', // 別府市の公式サイト（city.beppu.lg.jpは存在しない。2026-07-21）
  // 東日本ブロック 一般市バッチ3（2026-07-21。いずれも .lg.jp 版は存在しない／DNS解決不可＝これが唯一の公式ドメイン）
  'city.hakodate.hokkaido.jp', // 函館市の公式サイト
  'city.hachinohe.aomori.jp', // 八戸市の公式サイト
  'city.asahikawa.hokkaido.jp', // 旭川市の公式サイト（city.asahikawa.lg.jpは存在しない。2026-07-21）
  // 東日本ブロック合流バッチ6（2026-07-21。city.aomori.lg.jpは存在しない＝これが唯一の公式ドメイン）
  'city.aomori.aomori.jp', // 青森市の公式サイト
  'city.akita.akita.jp', // 秋田市の例規集ドメイン（本体サイトはcity.akita.lg.jpだが例規集のみ別ドメイン）
  'city.matsumoto.nagano.jp', // 松本市の公式サイト
  'city.fukushima.fukushima.jp', // 福島市の公式サイト
  'city.koshigaya.saitama.jp', // 越谷市の公式サイト
  'city.saijo.ehime.jp', // 西条市の公式サイト
  'city.omura.nagasaki.jp', // 大村市の公式サイト
  'city.settsu.osaka.jp', // 摂津市の公式サイト
  'city.komae.tokyo.jp', // 狛江市の公式サイト
  'komae-kosodate.net', // 狛江市が運営する子育て情報専用サイト「こまえ子育てねっと」（本体ドメインとは別ホストでPDFを配信）
  'city.mihara.hiroshima.jp', // 三原市の公式サイト
  'city.mobara.chiba.jp', // 茂原市の公式サイト
  // 西日本一般市バッチ6（2026-07-22。city.ikeda.lg.jpは存在しない＝これが唯一の公式ドメイン）
  'city.ikeda.osaka.jp', // 池田市の公式サイト
  'city.kanuma.tochigi.jp', // 鹿沼市の公式サイト
  'city.sanjo.niigata.jp', // 三条市の公式サイト
  'city.imizu.toyama.jp', // 射水市の公式サイト
  'city.hanamaki.iwate.jp', // 花巻市の公式サイト
  'city.fukuroi.shizuoka.jp', // 袋井市の公式サイト
  'city.ama.aichi.jp', // あま市の公式サイト
];

const args = process.argv.slice(2);
const DO_FETCH = args.includes('--fetch');
const AS_JSON = args.includes('--json');
const ONLY = (args.find((a) => a.startsWith('--only=')) || '').split('=')[1] || null;

/** @type {{level:'error'|'warn', file:string, path:string, message:string}[]} */
const findings = [];
const stats = { files: 0, sources: 0, valueNodes: 0, checked: 0, fetched: 0, skipped: 0 };

// 棚卸し（診断 B-3）: 正直な「未取得/未確認」を fail させず可視化するための集計。
// 空データ（value:null・空 fees）は note で理由が説明されていれば正常だが、
// 説明の無い空データは checkStructure で error にする（note無しの空データは fail）。
/** @type {{file:string, path:string, kind:string, note:string}[]} */
const inventory = [];
const inv = (file, path, kind, note) => inventory.push({ file, path, kind, note });
/** 「未確認」等の未確定を含む文字列値の総数（棚卸しの粗さ指標） */
let unconfirmedStrings = 0;

const err = (file, path, message) => findings.push({ level: 'error', file, path, message });
const warn = (file, path, message) => findings.push({ level: 'warn', file, path, message });

// ---------------------------------------------------------------- utilities

/** JSON を再帰的に歩き、(path, node) を渡す */
function walk(node, fn, path = '$') {
  fn(path, node);
  if (Array.isArray(node)) {
    node.forEach((v, i) => walk(v, fn, `${path}[${i}]`));
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) walk(v, fn, `${path}.${k}`);
  }
}

/** valueNode らしきオブジェクトか（value と sourceId を持つ） */
const isValueNode = (n) =>
  n && typeof n === 'object' && !Array.isArray(n) && 'value' in n && 'sourceId' in n;

/** sourceId を参照しているノードか（valueNode でなくても sourceId を持つものがある） */
const hasSourceRef = (n) =>
  n && typeof n === 'object' && !Array.isArray(n) && typeof n.sourceId === 'string';

function hostAllowed(urlStr) {
  let host;
  try {
    host = new URL(urlStr).host;
  } catch {
    return false;
  }
  if (ALLOWED_HOSTS.includes(host)) return true;
  if (ALLOWED_MUNICIPAL_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))) return true;
  return ALLOWED_HOST_SUFFIXES.some((s) => host.endsWith(s));
}

/** 全角/半角・カンマ・空白の揺れを吸収して比較するための正規化 */
function normalize(s) {
  return String(s)
    .normalize('NFKC')
    .replace(/[\s 　]/g, '')
    .replace(/[，,]/g, ',');
}

// ---------------------------------------------------------------- fetching

const pageCache = new Map();

/**
 * e-Gov 法令検索（laws.e-gov.go.jp/law/<lawId>）は JavaScript で本文を描画する SPA であり、
 * HTML を取得しても 700バイト程度の空シェルしか返らない（＝条文が1文字も含まれない）。
 * そのまま照合すると全ての条文チェックが「見つかりません」で誤って落ちる。
 * 法令本文は e-Gov 法令API v2 から取得する。
 * 出典URLとしては人間が読める /law/<lawId> を維持したいので、照合時のみAPIに差し替える。
 */
function egovApiUrl(urlStr) {
  const m = /^https:\/\/(?:laws|elaws)\.e-gov\.go\.jp\/law\/([A-Za-z0-9]+)/.exec(urlStr);
  if (!m) return null;
  return `https://laws.e-gov.go.jp/api/2/law_data/${m[1]}?response_format=xml`;
}

async function fetchText(url, contentType) {
  if (pageCache.has(url)) return pageCache.get(url);

  const apiUrl = egovApiUrl(url);
  if (apiUrl) {
    const res = await fetch(apiUrl, {
      headers: { 'User-Agent': 'kurashi-rakuda-seido-verifier/1.0', Accept: 'application/xml' },
    });
    if (!res.ok) throw new Error(`e-Gov法令API HTTP ${res.status}`);
    // XMLタグを除去して条文テキストのみにする
    const text = stripHtml(await res.text());
    pageCache.set(url, text);
    stats.fetched++;
    return text;
  }

  const res = await fetch(url, {
    headers: {
      // 一次情報サイトはUA未設定を弾く場合がある
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept-Language': 'ja',
    },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const ct = (res.headers.get('content-type') || '').toLowerCase();
  const isPdf = contentType === 'pdf' || ct.includes('application/pdf') || url.endsWith('.pdf');

  let text;
  if (isPdf) {
    const buf = Buffer.from(await res.arrayBuffer());
    text = await pdfToText(buf);
  } else {
    const buf = Buffer.from(await res.arrayBuffer());
    text = decodeHtml(buf, ct);
    text = stripHtml(text);
  }
  pageCache.set(url, text);
  stats.fetched++;
  return text;
}

/** Shift_JIS / EUC-JP の官公庁ページが残っているため、charset を見て復号する */
function decodeHtml(buf, contentTypeHeader) {
  let charset = (contentTypeHeader.match(/charset=([\w-]+)/) || [])[1];
  if (!charset) {
    const head = buf.subarray(0, 2048).toString('latin1');
    charset = (head.match(/charset=["']?([\w-]+)/i) || [])[1];
  }
  charset = (charset || 'utf-8').toLowerCase();
  const alias = { 'shift_jis': 'shift_jis', 'sjis': 'shift_jis', 'x-sjis': 'shift_jis', 'windows-31j': 'shift_jis', 'euc-jp': 'euc-jp' };
  const enc = alias[charset] || charset;
  try {
    return new TextDecoder(enc).decode(buf);
  } catch {
    return buf.toString('utf8');
  }
}

/**
 * 名前付き実体参照の対応表。
 *
 * ★ここに無い実体参照は「文字化けした literal」として残り、照合が必ず失敗する。★
 * 官公庁・自治体のページは記号を実体参照で書くことが多い。実例として、大阪府の
 * 児童扶養手当のページは乗算記号を `&times;` で出力しており、当初の実装（nbsp/amp/
 * lt/gt の4つのみをデコード）では「×」を含む verify.expect が**必ず失敗していた**。
 * データ作成者はこれを「制度が変わった」ではなく「照合できない」として expect 側で
 * 回避せざるを得ず、照合の網が静かに緩む。実体参照の取りこぼしは沈黙して害を成すため、
 * 数値参照（&#215; / &#xD7;）を含めて一括で解決する。
 */
const HTML_ENTITIES = {
  nbsp: ' ', ensp: ' ', emsp: ' ', thinsp: ' ',
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  times: '×', divide: '÷', minus: '−', plusmn: '±',
  yen: '¥', cent: '¢', pound: '£', euro: '€', deg: '°',
  middot: '・', bull: '•', hellip: '…', ndash: '–', mdash: '—',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  laquo: '«', raquo: '»', sect: '§', para: '¶', dagger: '†', Dagger: '‡',
  copy: '©', reg: '®', trade: '™', permil: '‰',
  frac12: '½', frac14: '¼', frac34: '¾', sup1: '¹', sup2: '²', sup3: '³',
  larr: '←', rarr: '→', uarr: '↑', darr: '↓', harr: '↔',
  le: '≤', ge: '≥', ne: '≠', asymp: '≈', prime: '′', Prime: '″',
};

/**
 * 実体参照を1回のパスで復号する。
 * ★段階的な .replace() で連鎖させてはならない★ 例えば `&amp;` を先に `&` へ戻すと、
 * 原文の `&amp;lt;`（＝リテラル "&lt;" の意）が後段で `<` に化ける（二重復号）。
 * 1パスなら、復号後に生まれた `&` が再び実体参照として解釈されることはない。
 */
function decodeEntities(s) {
  return s.replace(/&(#[0-9]+|#x[0-9a-f]+|[a-z][a-z0-9]*);/gi, (m, body) => {
    if (body[0] === '#') {
      const cp = body[1] === 'x' || body[1] === 'X'
        ? parseInt(body.slice(2), 16)
        : parseInt(body.slice(1), 10);
      // 不正なコードポイント（範囲外・サロゲート）は原文のまま残す
      if (!Number.isFinite(cp) || cp < 0 || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) return m;
      try {
        return String.fromCodePoint(cp);
      } catch {
        return m;
      }
    }
    const named = HTML_ENTITIES[body];
    if (named !== undefined) return named;
    // 大文字小文字の揺れ（&Times; 等）を吸収する。ただし Dagger/Prime のように
    // 大小で別字を指すものは上の完全一致で既に解決済み。
    const lower = HTML_ENTITIES[body.toLowerCase()];
    return lower !== undefined ? lower : m;
  });
}

function stripHtml(html) {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  );
}

/**
 * PDF→テキスト。
 *
 * ★PyMuPDF を優先し、pdftotext は代替とする。★
 * 官公庁の日本語PDFに対して pdftotext -layout は、重なり合うテキストラン（見出しの
 * 袋文字・ルビ等）を座標順に混ぜてしまい、
 *   「０９平成2源３泉年４所月得税令の和８改年正４月のあらまし」
 * のような読めない文字列を出力する。空文字列にはならないため「非空なら採用」という
 * 判定では検知できず、表のセル文字列が全て照合失敗する。
 * PyMuPDF の get_text() は読み順を保つため、日本語PDFではこちらが正しい。
 *
 * ★制約★ 結合セルの多い表（国税庁のあらまし等）は、どちらの方法でも列の対応関係は
 * 復元できない。そのため本スクリプトは「表構造の再現」ではなく「期待する文字列が
 * ページ内に存在するか」のみを検査する。表の構造的な正しさ（どの行がどの値か）は
 * specs/s-tools/ 側のテストケースで担保する。
 */
async function pdfToText(buf) {
  const dir = await mkdtemp(join(tmpdir(), 'seido-'));
  const pdfPath = join(dir, 'doc.pdf');
  try {
    await writeFile(pdfPath, buf);

    const py = `
import sys, fitz
d = fitz.open(sys.argv[1])
sys.stdout.reconfigure(encoding='utf-8')
for p in d:
    print(p.get_text())
`;
    const pyPath = join(dir, 'x.py');
    await writeFile(pyPath, py, 'utf8');
    for (const exe of ['python', 'python3']) {
      try {
        const { stdout } = await execFileAsync(exe, [pyPath, pdfPath], { maxBuffer: 64 * 1024 * 1024 });
        if (stdout && stdout.trim().length > 0) return stdout;
      } catch {
        /* try next interpreter */
      }
    }

    // PyMuPDF が無い環境（CIの最小イメージ等）向けの代替。
    // 日本語の表は読み順が崩れるため、照合失敗は誤検知の可能性がある旨を警告する。
    try {
      const { stdout } = await execFileAsync('pdftotext', ['-layout', '-enc', 'UTF-8', pdfPath, '-'], {
        maxBuffer: 64 * 1024 * 1024,
      });
      if (stdout && stdout.trim().length > 0) {
        if (!pdfFallbackWarned) {
          console.warn(
            '警告: PyMuPDF が利用できないため pdftotext で代替します。日本語PDFの表は読み順が崩れ、' +
              '照合が誤って失敗する場合があります。`pip install pymupdf` を推奨します。'
          );
          pdfFallbackWarned = true;
        }
        return stdout;
      }
    } catch {
      /* fall through */
    }

    throw new Error('PDFのテキスト化に失敗（PyMuPDF も pdftotext も利用不可）');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
let pdfFallbackWarned = false;

// ---------------------------------------------------------------- checks

function checkStructure(file, data) {
  const rel = relative(ROOT, file);
  const id = basename(file, extname(file));

  for (const key of ['id', 'name', 'fiscalYear', 'asOf', 'sources', 'disclaimer']) {
    if (data[key] === undefined) err(rel, `$.${key}`, `必須フィールド ${key} がありません`);
  }

  if (data.id && data.id !== id) {
    err(rel, '$.id', `id "${data.id}" がファイル名 "${id}" と一致しません`);
  }

  if (typeof data.disclaimer === 'string' && data.disclaimer.length < 20) {
    err(rel, '$.disclaimer', '免責表示文が短すぎます（20文字以上必須。YMYL領域のため）');
  }

  // --- nextCheckDue（定期再確認日。P2-I01 データ鮮度の定期監査）
  // expiresOn（確定失効＝この日に数値が変わると分かっている）と別に、
  // 「改正が無くても定期的に一次情報と突き合わせる」日付を全ファイルに義務化する。
  // D2=洗濯表示の教訓: 期限が既に経過した改正を誰も監視しておらず陳腐化がすり抜けた。
  if (!data.nextCheckDue) {
    err(rel, '$.nextCheckDue', 'nextCheckDue（次回再確認日）がありません（全制度データ必須。年度データは原則、翌年度の4月1日）');
  } else if (data.nextCheckDue < TODAY) {
    err(
      rel,
      '$.nextCheckDue',
      `★再確認期限超過★ nextCheckDue "${data.nextCheckDue}" を過ぎています。一次情報と突き合わせ、checkedAt/asOf を更新するか値を差し替えたうえで次回日付を設定してください（手順: docs/10_公開チェックリスト.md）`
    );
  } else {
    const days = Math.ceil((new Date(data.nextCheckDue) - new Date(TODAY)) / 86400000);
    if (days <= 30) {
      warn(rel, '$.nextCheckDue', `再確認期限まで残り${days}日（${data.nextCheckDue}）`);
    }
  }

  // --- sources
  const sourceIds = new Set();
  if (Array.isArray(data.sources)) {
    if (data.sources.length === 0) err(rel, '$.sources', '出典が1件もありません');
    for (const [i, s] of data.sources.entries()) {
      stats.sources++;
      const p = `$.sources[${i}]`;
      if (!s.id) err(rel, p, 'source.id がありません');
      else {
        if (sourceIds.has(s.id)) err(rel, p, `source.id "${s.id}" が重複しています`);
        sourceIds.add(s.id);
      }
      for (const k of ['title', 'publisher', 'url', 'checkedAt', 'tier']) {
        if (!s[k]) err(rel, p, `source.${k} がありません（一次情報の要件）`);
      }
      if (s.url && !hostAllowed(s.url)) {
        err(rel, p, `一次情報でない出典が含まれています: ${s.url} — 許可されるのは e-Gov・府省庁・公的機関・自治体公式のみ（まとめサイト引用禁止）`);
      }
      if (s.contentType === 'pdf' && !s.landingUrl) {
        warn(rel, p, 'PDF出典に landingUrl がありません。PDFは差し替えられるため掲載元ページを併記してください');
      }
      if (s.checkedAt && s.checkedAt > TODAY) {
        err(rel, p, `checkedAt "${s.checkedAt}" が未来の日付です`);
      }
    }
  }

  // --- verify の照合先解決（★沈黙の照合漏れを許さない★）
  // 照合先は verify.sourceId ?? 同ノードの sourceId。どちらも無い verify.expect は
  // checkAgainstSources が黙ってスキップしてしまう＝「照合しているつもりで照合していない」
  // 状態になるため、構造検査の段階でエラーにする。
  // （実例: トップレベル verify は隣接 sourceId が無く、41自治体の階層表照合が
  //   一度も実行されていなかった。verify.sourceId の必須化で解決した。）
  walk(data, (path, node) => {
    if (path.startsWith('$.sources')) return;
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;
    const v = node.verify;
    if (!v || typeof v !== 'object') return;
    if (v.sourceId !== undefined) {
      if (typeof v.sourceId !== 'string' || !sourceIds.has(v.sourceId)) {
        err(rel, `${path}.verify`, `verify.sourceId "${v.sourceId}" が sources に存在しません`);
      }
    }
    if (v.skip) return;
    if (Array.isArray(v.expect) && v.expect.length) {
      if (typeof v.sourceId !== 'string' && typeof node.sourceId !== 'string') {
        err(
          rel,
          `${path}.verify`,
          'verify.expect の照合先が特定できません（verify.sourceId か、同ノードの sourceId が必要）。このままでは出典照合が沈黙してスキップされます'
        );
      }
    }
  });

  // --- sourceId 参照の健全性 & valueNode の必須項目
  walk(data, (path, node) => {
    if (path.startsWith('$.sources')) return;
    // verify オブジェクト自体の sourceId は「照合指示の宛先」であってデータノードではない。
    // 存在チェックは上の verify 専用ブロックで済んでおり、checkedAt は所有ノード側が担保する。
    if (path.endsWith('.verify')) return;
    if (!hasSourceRef(node)) return;
    if (!sourceIds.has(node.sourceId)) {
      err(rel, path, `sourceId "${node.sourceId}" が sources に存在しません`);
    }
    // amendments は制度の改正予定を記述するもので、個別の確認日は持たない
    // （データセット全体の asOf と sources[].checkedAt が確認日を担保する）。
    // 期限チェックは checkAmendments 側で別途行う。
    if (path.startsWith('$.amendments')) return;
    if (!node.checkedAt) {
      err(rel, path, '出典を参照するノードに checkedAt がありません（確認日は全項目必須）');
    } else if (node.checkedAt > TODAY) {
      err(rel, path, `checkedAt "${node.checkedAt}" が未来の日付です`);
    }
    if (isValueNode(node)) {
      stats.valueNodes++;
      if (!('amendmentNote' in node)) {
        err(rel, path, 'amendmentNote がありません（改正予定メモは全項目必須。無ければ「なし（YYYY-MM-DD時点）」と明記）');
      }
      const v = node.verify;
      if (v && v.skip && !v.skipReason) {
        err(rel, path, 'verify.skip=true には skipReason が必須です');
      }
      // --- 空データの死角（診断 B-3）: value:null は「未取得」を正直に表すが、
      //     理由（note）が無いと「取れていない」のか「0/該当なし」なのか区別できない。
      //     ★note 無しの value:null は fail★。note 付きの正直な null は棚卸しに載せる（fail させない）。
      if (node.value === null) {
        if (typeof node.note !== 'string' || node.note.trim() === '') {
          err(rel, path, 'value が null ですが理由の note がありません（未取得なら「◯◯のため未取得」等を note に明記。note 無しの空データは不可）');
        } else {
          inv(rel, path, 'null-value', node.note.trim().slice(0, 80));
        }
      }
      // verify.skip は恒久スキップになりうるため棚卸しで可視化する
      if (v && v.skip) inv(rel, path, 'verify-skip', String(v.skipReason || '').slice(0, 80));
    }
  });

  // --- 保育利用時間バンド（hoikuryo スキーマの timeBands 拡張）の整合
  // 京都市のように保育標準時間認定の額が利用時間で分かれる自治体のための軸。
  // 「standard に最長バンドの額・バンド別は label の文章内」という旧形式の再発と、
  // バンド定義と実額のズレ（＝ツールの誤表示）をここで機械的に塞ぐ。
  {
    const tb = data.timeBands;
    const bandKeys = new Set();
    if (tb) {
      if (!Array.isArray(tb.bands) || tb.bands.length < 2) {
        err(rel, '$.timeBands.bands', 'timeBands.bands は2件以上必要です（1バンドなら timeBands 自体を定義しない）');
      } else {
        for (const [i, b] of tb.bands.entries()) {
          if (!b.key) err(rel, `$.timeBands.bands[${i}]`, 'band.key がありません');
          else if (bandKeys.has(b.key)) err(rel, `$.timeBands.bands[${i}]`, `band.key "${b.key}" が重複しています`);
          else bandKeys.add(b.key);
          if (!b.label) err(rel, `$.timeBands.bands[${i}]`, 'band.label がありません（原典の区分表記を必ず残す）');
        }
      }
      if (!tb.defaultBandKey) {
        err(rel, '$.timeBands', 'defaultBandKey がありません');
      } else if (bandKeys.size && !bandKeys.has(tb.defaultBandKey)) {
        err(rel, '$.timeBands', `defaultBandKey "${tb.defaultBandKey}" が bands に存在しません`);
      }
      if (!tb.rule) err(rel, '$.timeBands', 'rule（時間区分の原文定義）がありません');
      if (tb.sourceId && !sourceIds.has(tb.sourceId)) {
        err(rel, '$.timeBands', `sourceId "${tb.sourceId}" が sources に存在しません`);
      }
    }
    if (Array.isArray(data.tiers)) {
      for (const [i, t] of data.tiers.entries()) {
        for (const age of ['under3', 'age3plus']) {
          const fees = t.fees?.[age];
          const byBand = fees?.standardByBand;
          if (!byBand) continue;
          const p = `$.tiers[${i}].fees.${age}.standardByBand`;
          if (!tb) {
            err(rel, p, 'standardByBand がありますがトップレベル timeBands が未定義です');
            continue;
          }
          const keys = Object.keys(byBand);
          for (const k of keys) {
            if (!bandKeys.has(k)) err(rel, p, `バンドキー "${k}" が timeBands.bands に存在しません`);
          }
          for (const k of bandKeys) {
            if (!(k in byBand)) err(rel, p, `バンド "${k}" の額がありません（全バンド必須）`);
          }
          if (tb.defaultBandKey && byBand[tb.defaultBandKey] !== undefined && fees.standard !== byBand[tb.defaultBandKey]) {
            err(rel, p, `standard (${fees.standard}) が defaultBandKey "${tb.defaultBandKey}" の額 (${byBand[tb.defaultBandKey]}) と一致しません`);
          }
        }
      }
    }
  }

  // --- 空データの死角（診断 B-3）: 階層表の fees が空（{}）＝金額ゼロ件。
  //     「収集済み」を名乗りつつ答えを返せない状態。理由（label か note）が無ければ error。
  //     呉市のように label で「市公式表未確認」等を明記していれば正常として棚卸しに載せる。
  if (Array.isArray(data.tiers)) {
    for (const [i, t] of data.tiers.entries()) {
      if (!t || typeof t !== 'object') continue;
      const feeCount = t.fees && typeof t.fees === 'object' ? Object.keys(t.fees).length : 0;
      if (feeCount === 0) {
        const explain = (typeof t.label === 'string' && t.label.trim()) || (typeof t.note === 'string' && t.note.trim());
        if (!explain) {
          err(rel, `$.tiers[${i}]`, 'fees が空です（金額ゼロ件）。理由を label か note に明記してください（note無しの空データは不可）');
        } else {
          inv(rel, `$.tiers[${i}]`, 'empty-fees', String(explain).slice(0, 80));
        }
      }
    }
  }

  // --- 「未確認」等の未確定文字列を棚卸しのため集計（error ではない。件数の増分監視用）
  walk(data, (path, node) => {
    if (typeof node === 'string' && node.includes('未確認')) unconfirmedStrings++;
  });

  // --- amendments の期限
  if (Array.isArray(data.amendments)) {
    for (const [i, a] of data.amendments.entries()) {
      const p = `$.amendments[${i}]`;
      if (!a.summary) err(rel, p, 'amendment.summary がありません');
      if (!a.status) err(rel, p, 'amendment.status がありません');
      if (a.sourceId && !sourceIds.has(a.sourceId)) {
        err(rel, p, `sourceId "${a.sourceId}" が sources に存在しません`);
      }
      if (a.expiresOn && a.expiresOn < TODAY) {
        err(
          rel,
          p,
          `★期限切れ★ expiresOn "${a.expiresOn}" を過ぎています。この制度データの数値は既に無効の可能性があります: ${a.summary.slice(0, 60)}…`
        );
      } else if (a.expiresOn) {
        const days = Math.ceil((new Date(a.expiresOn) - new Date(TODAY)) / 86400000);
        if (days <= 30) {
          warn(rel, p, `期限まで残り${days}日（${a.expiresOn}）。更新の準備を: ${a.summary.slice(0, 60)}…`);
        }
      }
      if (a.status === 'scheduled' && a.effectiveFrom && a.effectiveFrom <= TODAY) {
        warn(rel, p, `status=scheduled ですが effectiveFrom "${a.effectiveFrom}" は既に到来しています。status を in-force に更新してください`);
      }
    }
  }
}

async function checkAgainstSources(file, data) {
  const rel = relative(ROOT, file);
  const sources = new Map((data.sources || []).map((s) => [s.id, s]));

  /** @type {{path:string, sourceId:string, expect:string[]}[]} */
  const jobs = [];
  walk(data, (path, node) => {
    if (path.startsWith('$.sources')) return;
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;
    const v = node.verify;
    if (!v || typeof v !== 'object') return;
    if (v.skip) {
      stats.skipped++;
      return;
    }
    // 照合先は verify.sourceId を優先し、無ければ同ノードの sourceId。
    // どちらも無い場合は checkStructure が既にエラーにしている（ここでは黙って落とさない）。
    const sourceId = typeof v.sourceId === 'string' ? v.sourceId : node.sourceId;
    if (typeof sourceId !== 'string') return;
    if (Array.isArray(v.expect) && v.expect.length) {
      jobs.push({ path, sourceId, expect: v.expect });
    }
  });

  // 出典ごとにまとめて1回だけ取得する
  const bySource = new Map();
  for (const j of jobs) {
    if (!bySource.has(j.sourceId)) bySource.set(j.sourceId, []);
    bySource.get(j.sourceId).push(j);
  }

  for (const [sourceId, group] of bySource) {
    const src = sources.get(sourceId);
    if (!src) continue;
    let text;
    try {
      text = await fetchText(src.url, src.contentType);
    } catch (e) {
      warn(rel, `$.sources[${sourceId}]`, `出典の取得に失敗しました（照合スキップ）: ${src.url} — ${e.message}`);
      continue;
    }
    const hay = normalize(text);
    for (const job of group) {
      for (const needle of job.expect) {
        stats.checked++;
        if (!hay.includes(normalize(needle))) {
          err(
            rel,
            job.path,
            `出典に「${needle}」が見つかりません。制度が改正されたか、出典ページの表記が変わった可能性があります（出典: ${src.url}）`
          );
        }
      }
    }
  }
}

// ---------------------------------------------------------------- main

async function collectFiles(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await collectFiles(p)));
    else if (e.name.endsWith('.json')) out.push(p);
  }
  return out;
}

async function main() {
  if (!existsSync(SEIDO_DIR)) {
    console.error(`制度データのディレクトリがありません: ${SEIDO_DIR}`);
    process.exit(2);
  }

  let files = await collectFiles(SEIDO_DIR);
  if (ONLY) files = files.filter((f) => basename(f, '.json') === ONLY);
  if (files.length === 0) {
    console.error(ONLY ? `--only=${ONLY} に一致するファイルがありません` : '検査対象のJSONがありません');
    process.exit(2);
  }

  for (const file of files.sort()) {
    stats.files++;
    const rel = relative(ROOT, file);
    let data;
    try {
      data = JSON.parse(await readFile(file, 'utf8'));
    } catch (e) {
      err(rel, '$', `JSONとしてパースできません: ${e.message}`);
      continue;
    }
    checkStructure(file, data);
    if (DO_FETCH) await checkAgainstSources(file, data);
  }

  const errors = findings.filter((f) => f.level === 'error');
  const warns = findings.filter((f) => f.level === 'warn');

  // 棚卸し集計（診断 B-3）: 正直な「未取得/スキップ/未確認」を種類ごとに数える
  const invByKind = inventory.reduce((acc, x) => ((acc[x.kind] = (acc[x.kind] || 0) + 1), acc), {});

  if (AS_JSON) {
    console.log(
      JSON.stringify(
        { ok: errors.length === 0, stats, inventory: { unconfirmedStrings, byKind: invByKind, items: inventory }, findings },
        null,
        2,
      ),
    );
  } else {
    for (const f of findings) {
      const tag = f.level === 'error' ? 'ERROR' : 'WARN ';
      console.log(`${tag} ${f.file} ${f.path}\n      ${f.message}`);
    }
    console.log('');
    // --- 棚卸しレポート（正直な空データの可視化。error ではない） ---
    console.log('── 棚卸し（正直な未取得・未確定の可視化。error ではない）──');
    console.log(
      `  value:null（理由note付き）: ${invByKind['null-value'] || 0} / ` +
        `空fees（理由付き）: ${invByKind['empty-fees'] || 0} / ` +
        `verify.skip: ${invByKind['verify-skip'] || 0} / ` +
        `「未確認」を含む文字列値: ${unconfirmedStrings}`,
    );
    if (inventory.length) {
      for (const x of inventory) {
        console.log(`    [${x.kind}] ${x.file} ${x.path} — ${x.note}`);
      }
    }
    console.log('');
    console.log(`検査ファイル数: ${stats.files} / 出典: ${stats.sources} / 出典付き数値ノード: ${stats.valueNodes}`);
    if (DO_FETCH) {
      console.log(`出典取得: ${stats.fetched}ページ / 照合した文字列: ${stats.checked} / 照合スキップ: ${stats.skipped}`);
    } else {
      console.log('出典照合はスキップしました（--fetch で実行）');
    }
    console.log(`エラー: ${errors.length} / 警告: ${warns.length}`);
  }

  process.exit(errors.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
