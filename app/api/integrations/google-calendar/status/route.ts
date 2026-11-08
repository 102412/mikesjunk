import { NextResponse } from "next/server";
import { getGoogleCalendarOAuthStatus } from "@/lib/google-calendar-oauth";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = getGoogleCalendarOAuthStatus();
  return NextResponse.json({ configured: status.configured }, { headers: { "Cache-Control": "no-store" } });
}
