import { NextRequest, NextResponse } from "next/server";

async function forwardRequest(url: string, method: string, headers: Record<string, any> | undefined, body: any) {
  const fetchOptions: any = { method };
  if (headers) fetchOptions.headers = headers;
  if (body != null) {
    // body may be string or object; send as-is
    fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
  }

  const res = await fetch(url, fetchOptions);
  const text = await res.text();
  const responseHeaders: Record<string, string> = {};
  res.headers.forEach((v, k) => (responseHeaders[k] = v));
  return { status: res.status, headers: responseHeaders, body: text };
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const { url, method = "GET", headers, body } = payload;
    if (!url) return NextResponse.json({ error: "missing url" }, { status: 400 });
    const forwarded = await forwardRequest(url, method, headers, body);
    return new NextResponse(forwarded.body, { status: forwarded.status, headers: forwarded.headers });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl.searchParams.get("url");
    if (!url) return NextResponse.json({ error: "missing url" }, { status: 400 });
    const forwarded = await forwardRequest(url, "GET", undefined, undefined);
    return new NextResponse(forwarded.body, { status: forwarded.status, headers: forwarded.headers });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
