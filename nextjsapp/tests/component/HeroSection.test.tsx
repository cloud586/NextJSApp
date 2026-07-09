import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { HeroSection } from "@/components/marketing/HeroSection";

describe("HeroSection", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("renders hero heading and placeholder image from local fallback", () => {
    delete process.env.NEXT_PUBLIC_ASSETS_BASE_URL;
    render(<HeroSection />);

    expect(
      screen.getByRole("heading", { name: /stream smarter/i }),
    ).toBeInTheDocument();
    expect(screen.getByAltText(/platform preview placeholder/i)).toHaveAttribute(
      "src",
      "/hero-placeholder.svg",
    );
  });

  it("renders hero image from blob base URL when configured", () => {
    process.env.NEXT_PUBLIC_ASSETS_BASE_URL =
      "https://acct.blob.core.windows.net/assets";
    render(<HeroSection />);

    expect(screen.getByAltText(/platform preview placeholder/i)).toHaveAttribute(
      "src",
      "https://acct.blob.core.windows.net/assets/hero-placeholder.svg",
    );
  });
});
