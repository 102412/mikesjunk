import { NextRequest, NextResponse } from "next/server";
import { GOOGLE_CALENDAR_PROVIDER, encryptProviderToken, getGoogleCalendarOAuthStatus, verifyOAuthState } from "@/lib/google-calendar-oauth";
import { getSupabaseServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type GoogleTokenResponse = { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string; error?: string };

function resultUrl(request: NextRequest, status: "connected" | "error" | "sign_in_required") {
  const url = new URL("/integrations", request.nextUrl.origin);
  url.searchParams.set("calendar", status);
  return url;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const response = NextResponse.next();
  const supabase = await getSupabaseServerClient(response);
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!user) return NextResponse.redirect(resultUrl(request, "sign_in_required"));
  if (!code || !state || !getGoogleCalendarOAuthStatus().configured || !verifyOAuthState(state, user.id)) return NextResponse.redirect(resultUrl(request, "error"));

  const redirectUri = new URL("/api/integrations/google-calendar/callback", request.nextUrl.origin).toString();
  const tokenRequest = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  const tokens = await tokenRequest.json() as GoogleTokenResponse;
  const service = getSupabaseServiceClient();
  if (!tokenRequest.ok || !tokens.access_token || !service) return NextResponse.redirect(resultUrl(request, "error"));

  const { error } = await service.from("integration_credentials").upsert({
    account_id: user.id,
    provider: GOOGLE_CALENDAR_PROVIDER,
    access_token_ciphertext: encryptProviderToken(tokens.access_token),
    refresh_token_ciphertext: tokens.refresh_token ? encryptProviderToken(tokens.refresh_token) : null,
    scopes: tokens.scope?.split(" ") ?? [],
    expires_at: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
  }, { onConflict: "account_id,provider" });
  return NextResponse.redirect(resultUrl(request, error ? "error" : "connected"));
}
