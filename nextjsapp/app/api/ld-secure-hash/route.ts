import { NextResponse } from "next/server";
import { getServerConfig } from "@/lib/config/env";
import { getLDContext } from "@/lib/ldContext";import { computeSecureModeHash } from "@/lib/ldSecureHash";
import { getRequestLogger } from "@/lib/logging/getRequestLogger";

/**
 * Secure Mode hash endpoint.
 *
 * LaunchDarkly Secure Mode prevents the browser SDK from spoofing user
 * identities. The client fetches a server-signed hash for the context
 * `key`; LD verifies the hash was produced with your SDK key before
 * honoring targeting for that user.
 */
export async function GET() {
  const logger = await getRequestLogger({ route: "ld-secure-hash" });
  logger.info("Handling secure hash request");

  const sdkKey = getServerConfig().ldSdkKey;
  if (!sdkKey) {
    logger.error("LD_SDK_KEY is not configured");
    return NextResponse.json(
      { error: "LD_SDK_KEY is not configured" },
      { status: 500 },
    );
  }

  const context = await getLDContext();
  const hash = computeSecureModeHash(context.key, sdkKey);

  logger.debug({ userKey: context.key }, "Secure hash computed");

  return NextResponse.json({ context, hash });
}
