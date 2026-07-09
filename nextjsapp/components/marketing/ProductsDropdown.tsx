"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";

function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function ProductsDropdown() {
  const [open, setOpen] = useState(false);
  const hydrated = useHydrated();
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        data-testid="products-dropdown-trigger"
        data-hydrated={hydrated ? "true" : "false"}
        className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={menuId}
        onClick={() => setOpen((prev) => !prev)}
      >
        Products
        <svg
          aria-hidden="true"
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          data-testid="products-menu"
          className="absolute left-0 top-full z-50 mt-1 min-w-[12rem] rounded-lg border border-white/10 bg-sutoremu-offblack py-1 shadow-lg"
        >
          <Link
            href="/products/sub-analytics"
            role="menuitem"
            className="block px-4 py-2 text-sm text-white transition-colors hover:bg-white/10"
            onClick={() => setOpen(false)}
          >
            Sub Analytics
          </Link>
        </div>
      ) : null}
    </div>
  );
}
