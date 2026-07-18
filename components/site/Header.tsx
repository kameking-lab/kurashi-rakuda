import Link from "next/link";
import { BrandLogo } from "./BrandLogo";

export function Header() {
  return (
    <header className="site-header">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
        <BrandLogo />
        <nav aria-label="メイン">
          <ul className="flex items-center gap-1 text-sm font-medium sm:gap-2">
            <li>
              <Link href="/tools" className="nav-link">
                ツール
              </Link>
            </li>
            <li>
              <Link href="/guide" className="nav-link">
                読みもの
              </Link>
            </li>
            <li className="hidden sm:block"><Link href="/about" className="nav-link">私たちについて</Link></li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
