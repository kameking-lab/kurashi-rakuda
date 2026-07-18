"use client";

import { useEffect, useState } from "react";

type TocItem = { id: string; label: string; level: 2 | 3 };

/** 本文を改変せず、描画済みの見出しからページ内目次を組み立てる。 */
export function ArticleToc({ contentId }: { contentId: string }) {
  const [items, setItems] = useState<TocItem[]>([]);

  useEffect(() => {
    const root = document.getElementById(contentId);
    if (!root) return;
    const headings = Array.from(root.querySelectorAll<HTMLHeadingElement>("h2, h3"));
    const next = headings.flatMap<TocItem>((heading, index) => {
      const label = heading.textContent?.trim();
      if (!label) return [];
      const id = heading.id || `article-section-${index + 1}`;
      heading.id = id;
      return [{ id, label, level: heading.tagName === "H2" ? 2 : 3 }];
    });
    setItems(next);
  }, [contentId]);

  if (items.length < 2) return null;

  return (
    <nav aria-label="この記事の目次" className="article-toc mx-auto mt-6 max-w-[70ch] rounded-card border border-line bg-paper p-5">
      <p className="font-bold">この記事の目次</p>
      <ol className="mt-3 space-y-1.5 text-sm">
        {items.map((item) => (
          <li key={item.id} className={item.level === 3 ? "pl-5 text-ink-muted" : ""}>
            <a href={`#${item.id}`} className="toc-link inline-flex min-h-8 items-center">
              {item.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
