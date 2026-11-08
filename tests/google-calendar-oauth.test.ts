import assert from "node:assert/strict";
import test from "node:test";

process.env.GOOGLE_OAUTH_STATE_SECRET = "a test-only state secret with enough entropy";
process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
process.env.GOOGLE_CALENDAR_CLIENT_ID = "client-id.apps.googleusercontent.com";

import * as oauth from "@/lib/google-calendar-oauth";

test("OAuth state is bound to the authenticated user and expires", () => {
  const state = oauth.createOAuthState("user-a", 1_000);
  assert.equal(oauth.verifyOAuthState(state, "user-a", 1_001), true);
  assert.equal(oauth.verifyOAuthState(state, "user-b", 1_001), false);
  assert.equal(oauth.verifyOAuthState(state, "user-a", 1_000 + 10 * 60_000 + 1), false);
});

test("provider tokens are encrypted and round-trip server-side", () => {
  const encrypted = oauth.encryptProviderToken("calendar-access-token");
  assert.notEqual(encrypted, "calendar-access-token");
  assert.equal(oauth.decryptProviderToken(encrypted), "calendar-access-token");
});

test("Google authorization uses the least-privilege Calendar scope", () => {
  const url = oauth.googleAuthorizationUrl("https://kernovaai.vercel.app/api/integrations/google-calendar/callback", "state");
  assert.equal(url.searchParams.get("scope"), "https://www.googleapis.com/auth/calendar.readonly");
  assert.equal(url.searchParams.get("access_type"), "offline");
});
