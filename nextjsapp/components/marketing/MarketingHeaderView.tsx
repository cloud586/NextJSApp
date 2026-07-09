import Link from "next/link";
import { ProductsDropdown } from "@/components/marketing/ProductsDropdown";

interface MarketingHeaderViewProps {
  signupEnabled: boolean;
}

export function MarketingHeaderView({ signupEnabled }: MarketingHeaderViewProps) {
  return (
    <header className="w-full border-b border-white/10">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-xl font-semibold tracking-tight text-white"
          >
            Sutoremu
          </Link>
          <ProductsDropdown />
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-lg border border-white/10 bg-sutoremu-offblack px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
          >
            Login
          </Link>
          {signupEnabled ? (
            <Link
              href="/signup"
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/90"
            >
              Sign up
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
