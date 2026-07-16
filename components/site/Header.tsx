import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <span aria-hidden="true">🐪</span>
          <span>くらしのラクダ</span>
        </Link>
        <nav aria-label="メイン">
          <ul className="flex items-center gap-4 text-sm sm:gap-6">
            <li>
              <Link href="/tools" className="hover:text-brand">
                ツール
              </Link>
            </li>
            <li>
              <Link href="/guide" className="hover:text-brand">
                ガイド
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
