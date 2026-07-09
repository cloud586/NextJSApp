import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductsDropdown } from "@/components/marketing/ProductsDropdown";

describe("ProductsDropdown", () => {
  it("opens menu and shows Sub Analytics link", () => {
    render(<ProductsDropdown />);

    expect(
      screen.queryByRole("menuitem", { name: /sub analytics/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /products/i }));

    const link = screen.getByRole("menuitem", { name: /sub analytics/i });
    expect(link).toHaveAttribute("href", "/products/sub-analytics");
  });
});
