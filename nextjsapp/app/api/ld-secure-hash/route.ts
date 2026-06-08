import { NextResponse } from "next/server";
import { getLDContext } from "@/lib/ldContext";
import { computeSecureModeHash } from "@/lib/ldSecureHash";

/**
 * Secure Mode hash endpoint.
 *
 * LaunchDarkly Secure Mode prevents the browser SDK from spoofing user
 * identities. The client fetches a server-signed hash for the context
 * `key`; LD verifies the hash was produced with your SDK key before
 * honoring targeting for that user.
 */
export async function GET() {
  const sdkKey = process.env.LD_SDK_KEY;
  if (!sdkKey) {
    return NextResponse.json(
      { error: "LD_SDK_KEY is not configured" },
      { status: 500 },
    );
  }

  const context = await getLDContext();

  const hash = computeSecureModeHash(context.key, sdkKey);

  return NextResponse.json({ context, hash });
}
