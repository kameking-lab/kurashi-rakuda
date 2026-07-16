import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto max-w-3xl px-4 py-8 text-sm text-ink-muted">
        <nav aria-label="フッター">
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            <li>
              <Link href="/about" className="hover:text-ink">
                運営者情報
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
          </ul>
        </nav>
        <p className="mt-4">
          くらしのラクダは、主婦・女性の毎日を楽にする完全無料のサイトです。すべての機能を登録なしで使えます。
        </p>
      </div>
    </footer>
  );
}
