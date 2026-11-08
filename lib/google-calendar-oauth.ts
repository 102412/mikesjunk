import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const GOOGLE_CALENDAR_PROVIDER = "google-calendar";
export const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

type OAuthState = { userId: string; issuedAt: number };

function readRequiredEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function stateSignature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function getGoogleCalendarOAuthStatus() {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim();
  const stateSecret = process.env.GOOGLE_OAUTH_STATE_SECRET?.trim();
  const encryptionKey = process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY?.trim();
  return {
    configured: Boolean(clientId && clientSecret && stateSecret && encryptionKey),
    missing: [
      !clientId && "GOOGLE_CALENDAR_CLIENT_ID",
      !clientSecret && "GOOGLE_CALENDAR_CLIENT_SECRET",
      !stateSecret && "GOOGLE_OAUTH_STATE_SECRET",
      !encryptionKey && "INTEGRATION_TOKEN_ENCRYPTION_KEY",
    ].filter(Boolean),
  };
}

export function createOAuthState(userId: string, now = Date.now()) {
  const secret = readRequiredEnvironment("GOOGLE_OAUTH_STATE_SECRET");
  const payload = base64Url(JSON.stringify({ userId, issuedAt: now } satisfies OAuthState));
  return `${payload}.${stateSignature(payload, secret)}`;
}

export function verifyOAuthState(state: string, expectedUserId: string, now = Date.now()) {
  const secret = readRequiredEnvironment("GOOGLE_OAUTH_STATE_SECRET");
  const [payload, signature] = state.split(".");
  if (!payload || !signature) return false;
  const expectedSignature = stateSignature(payload, secret);
  if (signature.length !== expectedSignature.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) return false;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as OAuthState;
    return decoded.userId === expectedUserId && Number.isFinite(decoded.issuedAt) && now - decoded.issuedAt >= 0 && now - decoded.issuedAt <= 10 * 60_000;
  } catch {
    return false;
  }
}

function encryptionKey() {
  const key = Buffer.from(readRequiredEnvironment("INTEGRATION_TOKEN_ENCRYPTION_KEY"), "base64");
  if (key.length !== 32) throw new Error("INTEGRATION_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  return key;
}

/** Encrypt provider tokens before they leave the request process. Never return this value to a browser. */
export function encryptProviderToken(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

// Exported for unit verification only; application code never decrypts in browser code.
export function decryptProviderToken(payload: string) {
  const [iv, tag, encrypted] = payload.split(".");
  if (!iv || !tag || !encrypted) throw new Error("Invalid encrypted token.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
}

export function googleAuthorizationUrl(redirectUri: string, state: string) {
  const clientId = readRequiredEnvironment("GOOGLE_CALENDAR_CLIENT_ID");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_CALENDAR_SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  }).toString();
  return url;
}
