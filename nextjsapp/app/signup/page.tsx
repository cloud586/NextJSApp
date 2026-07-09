import type { Metadata } from "next";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";

export const metadata: Metadata = {
  title: "Sign up — Sutoremu",
};

export default function SignupPage() {
  return (
    <MarketingLayout>
      <div className="mx-auto max-w-7xl px-6 py-24">
        <h1 className="text-3xl font-semibold text-white">Sign up</h1>
        <p className="mt-4 text-white/60">Coming soon.</p>
      </div>
    </MarketingLayout>
  );
}
