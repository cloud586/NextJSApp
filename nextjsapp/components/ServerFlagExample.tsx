import { isLDSdkConfigured } from "@/lib/ldConfig";
import { getLDContext } from "@/lib/ldContext";
import { HOMEPAGE_EXPERIMENTAL_BANNER } from "@/lib/ldFlags";
import { getServerLDClient } from "@/lib/ldServer";

/**
 * Example: server-side flag evaluation in a Server Component.
 *
 * Runs during the RSC render on the server — no JavaScript needed in the
 * browser. Use this pattern for SEO-sensitive content, initial HTML, and
 * anything that must not flash the wrong state on first paint.
 */
export async function ServerFlagExample() {
  if (!isLDSdkConfigured()) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800 dark:bg-amber-900/20">
        <p className="font-medium text-amber-900 dark:text-amber-200">
          Server evaluation unavailable
        </p>
        <p className="mt-1 text-amber-800 dark:text-amber-300">
          Set <code className="text-xs">LD_SDK_KEY</code> in the environment
          (e.g. <code className="text-xs">docker run --env-file .env.local</code>
          ).
        </p>
      </div>
    );
  }

  const context = await getLDContext();
  const client = await getServerLDClient();
  const showBanner = await client.variation(
    HOMEPAGE_EXPERIMENTAL_BANNER,
    context,
    false,
  );

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-900">
      <p className="font-medium text-zinc-800 dark:text-zinc-200">
        Server evaluation
      </p>
      <p className="mt-1 text-zinc-600 dark:text-zinc-400">
        <code className="text-xs">{HOMEPAGE_EXPERIMENTAL_BANNER}</code>{" "}
        is{" "}
        <span className="font-semibold">{showBanner ? "ON" : "OFF"}</span>
      </p>
      {showBanner && (
        <p className="mt-2 rounded bg-amber-100 px-2 py-1 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
          Experimental banner (rendered on server)
        </p>
      )}
    </div>
  );
}
