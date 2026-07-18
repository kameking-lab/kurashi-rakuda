import Link from "next/link";

export function BrandLogo({ footer = false }: { footer?: boolean }) {
  return <Link href="/" className={`brand-logo ${footer ? "brand-logo-footer" : ""}`} aria-label="くらしのラクダ ホーム">
    <svg viewBox="0 0 52 52" aria-hidden="true" className="brand-logo-mark">
      <path d="M13 30c0-8 6-14 14-14h7c6 0 10 4 10 10v9c0 5-4 9-9 9H22c-5 0-9-4-9-9z" fill="#c8a875"/>
      <path d="M18 19c1-7 5-11 10-11 5 0 9 4 10 11" fill="#d8bd8e" stroke="#654b31" strokeWidth="2"/>
      <path d="M20 13l-5-4m20 4 5-4" stroke="#654b31" strokeWidth="2.4" strokeLinecap="round"/>
      <circle cx="24" cy="21" r="1.7" fill="#2c2924"/><circle cx="33" cy="21" r="1.7" fill="#2c2924"/>
      <path d="M25 27c2 2 5 2 7 0" fill="none" stroke="#654b31" strokeWidth="2" strokeLinecap="round"/>
      <path d="M15 31c8 4 19 4 28-1" fill="none" stroke="#2e5039" strokeWidth="5" strokeLinecap="round"/>
      <path d="M32 39h10l3-12-11-3z" fill="#2e5039" stroke="#654b31" strokeWidth="1.5"/>
    </svg>
    <span className="brand-logo-type"><strong>くらしのラクダ</strong><small>暮らしの答えを、やさしく確かに。</small></span>
  </Link>;
}
