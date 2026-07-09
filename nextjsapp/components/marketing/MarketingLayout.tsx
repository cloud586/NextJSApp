import { MarketingHeader } from "@/components/marketing/MarketingHeader";

interface MarketingLayoutProps {
  children: React.ReactNode;
}

export async function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <div className="min-h-full bg-black font-sans text-white">
      <MarketingHeader />
      <main>{children}</main>
    </div>
  );
}
