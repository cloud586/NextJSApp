import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarketingHeaderView } from "@/components/marketing/MarketingHeaderView";

describe("MarketingHeaderView", () => {
  it("renders Sutoremu brand and Login link", () => {
    render(<MarketingHeaderView signupEnabled={false} />);

    expect(screen.getByRole("link", { name: /sutoremu/i })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: /login/i })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("hides Sign up when signupEnabled is false", () => {
    render(<MarketingHeaderView signupEnabled={false} />);

    expect(
      screen.queryByRole("link", { name: /sign up/i }),
    ).not.toBeInTheDocument();
  });

  it("shows Sign up when signupEnabled is true", () => {
    render(<MarketingHeaderView signupEnabled={true} />);

    expect(screen.getByRole("link", { name: /sign up/i })).toHaveAttribute(
      "href",
      "/signup",
    );
  });
});
