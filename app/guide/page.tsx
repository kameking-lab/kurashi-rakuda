import Link from "next/link";
import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/SectionHeading";

export const metadata: Metadata = {
  title: "ガイド記事",
  description: "制度やお金の疑問に、出典つきの平易な言葉で答えるガイド記事です。",
};

const samples = [
  {
    href: "/guide/sample-seido",
    label: "制度解説型（サンプル）",
    note: "制度の「いくら・いつ・どうやって」に答える型。準拠年度と改定チェック日を必ず持つ",
  },
  {
    href: "/guide/sample-heiso",
    label: "ツール併走型（サンプル）",
    note: "ツール1個に1本。計算結果の読み方と背景を説明する型",
  },
  {
    href: "/guide/sample-dandori",
    label: "段取り型（サンプル）",
    note: "「次に何をすればいいか」に手順と時期で答える型",
  },
];

export default function GuidePage() {
  return (
    <div>
      <h1 className="text-xl font-bold sm:text-2xl">ガイド記事</h1>
      <p className="mt-2 text-ink-muted">
        記事は順次公開します。すべての記事に出典と更新日を明記します。
      </p>
      <SectionHeading>記事テンプレート（開発用サンプル）</SectionHeading>
      <ul className="space-y-3">
        {samples.map((s) => (
          <li key={s.href}>
            <Link
              href={s.href}
              className="block rounded-card border border-line p-4 hover:border-brand"
            >
              <span className="font-medium">{s.label}</span>
              <span className="mt-1 block text-sm text-ink-muted">{s.note}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
