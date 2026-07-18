import Link from "next/link";
import { Rakku } from "@/components/mascot/Rakku";

export function Header() {
  return (
    <header className="site-header">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5 text-lg font-bold tracking-tight">
          <span className="brand-mark"><Rakku size={38} /></span>
          <span>くらしのラクダ<span className="block text-[10px] font-medium tracking-[.12em] text-ink-muted">KURASHI RAKUDA</span></span>
        </Link>
        <nav aria-label="メイン">
          <ul className="flex items-center gap-1 text-sm font-medium sm:gap-2">
            <li>
              <Link href="/tools" className="nav-link">
                ツール
              </Link>
            </li>
            <li>
              <Link href="/guide" className="nav-link">
                ガイド
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
