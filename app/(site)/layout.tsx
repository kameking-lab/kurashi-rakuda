import { notFound } from "next/navigation";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const isStandalone = !!process.env.STANDALONE && process.env.STANDALONE !== "false" && process.env.STANDALONE !== "0";
  if (isStandalone) {
    notFound();
  }

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        {children}
      </main>
      <Footer />
    </>
  );
}
