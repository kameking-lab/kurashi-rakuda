import Link from "next/link";
import { Rakku } from "@/components/mascot/Rakku";

export default function NotFound() {
  return (
    <div className="py-10 text-center">
      <div className="flex justify-center">
        <Rakku size={110} expression="sorry" label="困り顔のらっく" />
      </div>
      <h1 className="mt-4 text-xl font-bold">ページが見つかりませんでした</h1>
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
