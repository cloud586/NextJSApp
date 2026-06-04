import { getLDContext } from "@/lib/ldContext";
import { getServerLDClient } from "@/lib/ldServer";

export default async function ServerFlagExample() {
  const context = await getLDContext();
  const ldClient = await getServerLDClient();
  
  // variation() will use the default value (false) if the SDK hasn't fully initialized.
  // This is expected behavior - the default value is safe and ensures the page renders quickly.
  // On subsequent requests, the SDK will have the actual flag value from LaunchDarkly.
  const showExperimentalBanner = await ldClient.variation(
    "homepage.experimentalBanner",
    context,
    false // Default value used if SDK initialization is still in progress
  );

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-zinc-950">Server flag example</h2>
      <p className="mt-3 text-sm leading-6 text-zinc-600">
        This server component evaluates a LaunchDarkly flag on the server before render.
      </p>
      <p className="mt-4 text-base text-zinc-800">
        <strong>homepage.experimentalBanner:</strong>{" "}
        {showExperimentalBanner ? "enabled" : "disabled"}
      </p>
    </section>
  );
}
