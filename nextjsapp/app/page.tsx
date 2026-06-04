import Image from "next/image";
import ClientFlagExample from "@/components/ClientFlagExample";
import ServerFlagExample from "@/components/ServerFlagExample";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-4xl flex-col items-center justify-between gap-8 py-24 px-8 bg-white dark:bg-black sm:items-start">
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <Image
            className="dark:invert"
            src="/next.svg"
            alt="Next.js logo"
            width={100}
            height={20}
            priority
          />
          <div>
            <h1 className="max-w-xl text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
              LaunchDarkly App Router integration
            </h1>
            <p className="mt-3 max-w-2xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
              This example shows server-side flag evaluation, client-side flag usage,
              and secure mode context sharing between server and client.
            </p>
          </div>
        </div>

        <div className="grid w-full gap-6 lg:grid-cols-2">
          <ServerFlagExample />
          <ClientFlagExample />
        </div>
      </main>
    </div>
  );
}
