import Image from "next/image";
import { getAssetUrl } from "@/lib/assets";

export function HeroSection() {  return (
    <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col items-center gap-12 px-6 py-16 lg:flex-row lg:items-center lg:justify-between lg:gap-16">
      <div className="flex max-w-xl flex-col gap-6">
        <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
          Stream smarter. Grow faster.
        </h1>
        <p className="text-lg leading-relaxed text-white/70">
          Sutoremu gives creators the tools to understand their audience,
          optimize content, and build lasting communities — all in one place.
        </p>
        <p className="text-base leading-relaxed text-white/50">
          From real-time analytics to actionable insights, everything you need
          to level up your stream is right here.
        </p>
      </div>
      <div className="flex w-full max-w-lg items-center justify-center">
        <Image
          src={getAssetUrl("hero-placeholder.svg")}
          alt="Platform preview placeholder"          width={560}
          height={420}
          className="w-full rounded-2xl border border-white/10"
          priority
        />
      </div>
    </section>
  );
}
