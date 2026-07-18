import Link from "next/link";
import { BrandLogo } from "./BrandLogo";
import { TOOL_CATEGORIES } from "@/app/lib/tools/types";

export function Footer() {
  return (
    <footer className="site-footer mt-24">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-8 sm:py-20">
        <div className="footer-grid">
          <div><BrandLogo footer /><p className="mt-5 max-w-sm text-sm text-ink-muted">妊娠・子育てから家事、お金、仕事、介護まで。根拠のある計算と段取りで、暮らしの荷物をひとつ軽くします。</p></div>
          <nav aria-label="ツールカテゴリ"><p className="footer-heading">ツールを探す</p><ul className="footer-links">{Object.entries(TOOL_CATEGORIES).map(([key,label])=><li key={key}><Link href={`/tools#${key}`}>{label}</Link></li>)}</ul></nav>
          <nav aria-label="サイト案内"><p className="footer-heading">サイト案内</p><ul className="footer-links">
            <li>
              <Link href="/about" className="hover:text-ink">
                サイト概要・運営方針
              </Link>
            </li>
            <li>
              <Link href="/policy" className="hover:text-ink">
                編集・紹介ポリシー
              </Link>
            </li>
            <li>
              <Link href="/sources" className="hover:text-ink">
                出典一覧
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-ink">
                プライバシーポリシー
              </Link>
            </li>
            <li>
              <Link href="/disclaimer" className="hover:text-ink">
                免責事項
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-ink">
                お問い合わせ
              </Link>
            </li>
          </ul></nav>
        </div>
        <div className="footer-proof"><span>すべて無料</span><span>広告・会員登録 0</span><span>入力は端末内だけ</span><span>出典と更新日を明記</span></div>
        <p className="mt-8 border-t border-line pt-6 text-xs text-ink-muted">© 2026 くらしのラクダ。暮らしの判断に必要な根拠を、やさしく整理する独立サイトです。</p>
      </div>
    </footer>
  );
}
