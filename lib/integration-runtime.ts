export const activepiecesProviders = [
  { id: "google-calendar", name: "Google Calendar", category: "Scheduling", mode: "OAuth" },
  { id: "gmail", name: "Gmail", category: "Communication", mode: "OAuth" },
  { id: "slack", name: "Slack", category: "Communication", mode: "OAuth" },
  { id: "stripe", name: "Stripe", category: "Payments", mode: "API / OAuth" },
  { id: "quickbooks", name: "QuickBooks", category: "Finance", mode: "OAuth" },
  { id: "hubspot", name: "HubSpot", category: "CRM", mode: "OAuth" },
  { id: "google-sheets", name: "Google Sheets", category: "Operations", mode: "OAuth" },
  { id: "notion", name: "Notion", category: "Operations", mode: "OAuth" },
] as const;

export type IntegrationRuntimeStatus = {
  provider: "activepieces";
  configured: boolean;
  reason: "ready" | "missing_url" | "missing_api_key" | "invalid_url";
};

function isSafeRuntimeUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || (url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1"));
  } catch {
    return false;
  }
}

/** Keeps the automation engine private from browser code. */
export function getIntegrationRuntimeStatus(): IntegrationRuntimeStatus {
  const endpoint = process.env.ACTIVEPIECES_API_URL?.trim();
  const apiKey = process.env.ACTIVEPIECES_API_KEY?.trim();
  if (!endpoint) return { provider: "activepieces", configured: false, reason: "missing_url" };
  if (!isSafeRuntimeUrl(endpoint)) return { provider: "activepieces", configured: false, reason: "invalid_url" };
  if (!apiKey) return { provider: "activepieces", configured: false, reason: "missing_api_key" };
  return { provider: "activepieces", configured: true, reason: "ready" };
}
