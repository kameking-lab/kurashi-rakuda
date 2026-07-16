import type { ReactNode } from "react";

export function SectionHeading({
  children,
  id,
}: {
  children: ReactNode;
  id?: string;
}) {
  return (
    <h2
      id={id}
      className="mt-10 mb-4 scroll-mt-20 border-l-4 border-sand pl-3 text-lg font-bold sm:text-xl"
    >
      {children}
    </h2>
  );
}
