import Link from "next/link";
import { Callout } from "@/components/ui/Callout";

export default function NotFound() {
  return (
    <div className="py-10">
      <h1 className="text-xl font-bold">ページが見つかりませんでした</h1>
      <div className="mt-4">
        <Callout>
          お探しのページは移動したか、まだ準備中かもしれません。
          <Link href="/tools" className="ml-1 underline underline-offset-4">
            ツール一覧
          </Link>
          からさがせます。
        </Callout>
      </div>
    </div>
  );
}
