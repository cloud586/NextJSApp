import { MarketingHeaderView } from "@/components/marketing/MarketingHeaderView";
import { isLDSdkConfigured } from "@/lib/config/env";
import { getLDContext } from "@/lib/ldContext";
import { AUTH_SIGNUP_ENABLED } from "@/lib/ldFlags";
import { getServerLDClient } from "@/lib/ldServer";
import { shouldShowSignup } from "@/lib/marketing/marketingHeaderLogic";

export async function MarketingHeader() {
  let signupEnabled = false;

  if (isLDSdkConfigured()) {
    const context = await getLDContext();
    const client = await getServerLDClient();
    const flagValue = await client.variation(
      AUTH_SIGNUP_ENABLED,
      context,
      false,
    );
    signupEnabled = shouldShowSignup(true, flagValue);
  }

  return <MarketingHeaderView signupEnabled={signupEnabled} />;
}
