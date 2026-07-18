import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-sand-soft/60">
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-ink-muted sm:px-6">
        <p className="mb-5 text-lg font-bold text-ink">くらしのラクダ</p>
        <nav aria-label="フッター">
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
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
          </ul>
        </nav>
        <p className="mt-4">
          くらしのラクダは、主婦・女性の毎日を楽にする完全無料のサイトです。すべての機能を登録なしで使えます。
        </p>
      </div>
    </footer>
  );
}
