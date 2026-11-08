import { NextResponse } from "next/server";

function enabled(value: unknown) {
  if (value === true) return true;
  return Boolean(value && typeof value === "object" && "enabled" in value && (value as { enabled?: unknown }).enabled === true);
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.json({ configured: false, google: false, apple: false });
  try {
    const response = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key }, cache: "no-store" });
    const settings = await response.json().catch(() => null) as { external?: { google?: unknown; apple?: unknown } } | null;
    return NextResponse.json({ configured: response.ok, google: enabled(settings?.external?.google), apple: enabled(settings?.external?.apple) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    // A transient settings lookup must not be presented as a missing project.
    // Provider buttons remain safely disabled until their enabled state is known.
    return NextResponse.json({ configured: true, google: false, apple: false });
  }
}
