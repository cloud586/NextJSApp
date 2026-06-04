import { createHmac } from "crypto";
import { NextResponse } from "next/server";
import { ensureLDContextCookie } from "@/lib/ldContext";

export async function GET() {
  const secret = process.env.LD_SECURE_MODE_SECRET;
  if (!secret) {
    throw new Error("Missing environment variable LD_SECURE_MODE_SECRET");
  }

  const context = await ensureLDContextCookie();
  console.log("[LD-API] Context retrieved:", JSON.stringify(context));
  
  // LaunchDarkly's JS SDK uses a specific canonicalization that preserves
  // insertion order and filters out undefined/null values.
  // DO NOT sort the keys - preserve insertion order.
  function canonicalizeForHash(v: any): string {
    if (v === null || typeof v !== 'object') return JSON.stringify(v);
    if (Array.isArray(v)) {
      const items = v
        .map(canonicalizeForHash)
        .filter((s) => s !== undefined && s !== 'null');
      return '[' + items.join(',') + ']';
    }
    // IMPORTANT: Do NOT sort keys. LaunchDarkly preserves insertion order.
    const keys = Object.keys(v)
      .filter((k) => v[k] !== undefined && v[k] !== null && !(typeof v[k] === 'object' && Object.keys(v[k] || {}).length === 0 && !Array.isArray(v[k])));
    return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalizeForHash(v[k])).join(',') + '}';
  }
  const contextJson = canonicalizeForHash(context);
  console.log("[LD-API] Context JSON (canonical):", contextJson);
  
  const hash = createHmac("sha256", secret).update(contextJson).digest("hex");
  console.log("[LD-API] Generated hash:", hash);
  console.log("[LD-API] Secret used:", secret.substring(0, 10) + "...");

  return NextResponse.json(
    { context, hash },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}
