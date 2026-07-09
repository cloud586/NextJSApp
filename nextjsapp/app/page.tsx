import type { Metadata } from "next";
import { HeroSection } from "@/components/marketing/HeroSection";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";

export const metadata: Metadata = {
  title: "Sutoremu",
  description:
    "Sutoremu — analytics and tools for creators to understand their audience and grow their community.",
};

export default function Home() {
  return (
    <MarketingLayout>
      <HeroSection />
    </MarketingLayout>
  );
}
