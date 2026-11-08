import { NextRequest, NextResponse } from "next/server";
import { createOAuthState, getGoogleCalendarOAuthStatus, googleAuthorizationUrl } from "@/lib/google-calendar-oauth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const destination = new URL("/integrations", request.nextUrl.origin);
  const status = getGoogleCalendarOAuthStatus();
  if (!status.configured) {
    destination.searchParams.set("calendar", "setup_required");
    return NextResponse.redirect(destination);
  }
  const response = NextResponse.next();
  const supabase = await getSupabaseServerClient(response);
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!user) {
    destination.searchParams.set("calendar", "sign_in_required");
    return NextResponse.redirect(destination);
  }
  const callback = new URL("/api/integrations/google-calendar/callback", request.nextUrl.origin).toString();
  return NextResponse.redirect(googleAuthorizationUrl(callback, createOAuthState(user.id)));
}
