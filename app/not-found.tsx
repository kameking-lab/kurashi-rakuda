import Link from "next/link";
import { Rakku } from "@/components/mascot/Rakku";

export default function NotFound() {
  return (
    <div className="not-found-card mx-auto max-w-2xl rounded-[2rem] border border-line bg-sand-soft px-6 py-12 text-center sm:px-12">
      <div className="flex justify-center">
        <Rakku size={160} expression="sorry" label="困り顔のらっく" />
      </div>
      <p className="eyebrow mt-4">404 NOT FOUND</p><h1 className="mt-2 text-2xl font-bold">ページが見つかりませんでした</h1>
      <p className="mt-3 text-ink-muted">
        お探しのページは移動したか、まだ準備中かもしれません。
        <Link href="/tools" className="mx-1 underline underline-offset-4">
          ツール一覧
        </Link>
        からさがせます。
      </p>
    </div>
  );
}
