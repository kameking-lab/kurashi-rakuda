import Image from "next/image";
import type { ToolCategory } from "@/app/lib/tools/types";

const paths: Record<ToolCategory, React.ReactNode> = {
  pregnancy: <><path d="M12 5.5a6.5 6.5 0 1 0 6.2 8.4"/><path d="M12 9.5a2.5 2.5 0 1 0 2.5 2.5"/><path d="M18 4v5m-2.5-2.5h5"/></>,
  childcare: <><circle cx="12" cy="8" r="3"/><path d="M5.5 20c.5-4.5 2.7-7 6.5-7s6 2.5 6.5 7M6 9.5 3.5 12 6 14.5M18 9.5l2.5 2.5-2.5 2.5"/></>,
  kaji: <><path d="M7 3v7a5 5 0 0 0 10 0V3M4 20h16M9 20v-4m6 4v-4"/><path d="M10 7h4"/></>,
  money: <><path d="M4 7.5 12 3l8 4.5M5 9h14M6 18h12M4 21h16M8 9v9m4-9v9m4-9v9"/></>,
  health: <><path d="M12 21s-8-4.7-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.3-8 11-8 11Z"/><path d="M8 13h2l1.5-3 2 6 1.5-3h2"/></>,
  career: <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4h6v3M3 12h18M10 12v2h4v-2"/></>,
  care: <><circle cx="9" cy="6" r="3"/><path d="M4 21v-5a5 5 0 0 1 10 0v5M15 10h4v11M14 15h5"/></>,
};

export function CategoryIcon({ category, className = "" }: { category: ToolCategory; className?: string }) {
  return <svg className={`category-icon ${className}`} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[category]}</svg>;
}

export function CategoryVisual({ category }: { category: ToolCategory }) {
  return <span className={`category-visual category-${category}`} aria-hidden="true">
    <span className="category-visual-orbit" />
    <CategoryIcon category={category} className="category-visual-fallback" />
    <Image className="category-visual-image" src={`/category/${category}.png`} alt="" width={1024} height={1024} sizes="(max-width: 767px) 68px, 92px" />
    <span className="category-visual-dot category-visual-dot-a" />
    <span className="category-visual-dot category-visual-dot-b" />
  </span>;
}
