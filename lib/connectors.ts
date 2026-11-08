export const connectorCatalog = [
  {
    id: "google-calendar",
    name: "Google Calendar",
    category: "Scheduling",
    mode: "OAuth",
    availability: "connect",
    keywords: ["calendar", "schedule", "scheduling", "appointment", "appointments", "event", "events"],
    scope: "View the calendars and events you choose. Kernova never creates, edits, or deletes calendar events during this pilot.",
    termsUrl: "https://policies.google.com/terms",
    privacyUrl: "https://policies.google.com/privacy",
  },
  {
    id: "gmail",
    name: "Gmail",
    category: "Communication",
    mode: "OAuth",
    availability: "planned",
    keywords: ["gmail", "email", "inbox", "emails"],
    scope: "A future connection will request only the Google mailbox scopes needed for the workflow you approve.",
    termsUrl: "https://policies.google.com/terms",
    privacyUrl: "https://policies.google.com/privacy",
  },
  {
    id: "slack",
    name: "Slack",
    category: "Communication",
    mode: "OAuth",
    availability: "planned",
    keywords: ["slack", "channel", "channels"],
    scope: "A future connection will show its exact workspace and channel permissions before authorization.",
    termsUrl: "https://slack.com/terms-of-service",
    privacyUrl: "https://slack.com/privacy-policy",
  },
  {
    id: "stripe",
    name: "Stripe",
    category: "Payments",
    mode: "API / OAuth",
    availability: "planned",
    keywords: ["stripe", "payment", "payments", "invoice", "invoices", "revenue"],
    scope: "A future connection will display the exact Stripe account data it can read before authorization.",
    termsUrl: "https://stripe.com/legal",
    privacyUrl: "https://stripe.com/privacy",
  },
  {
    id: "quickbooks",
    name: "QuickBooks",
    category: "Finance",
    mode: "OAuth",
    availability: "planned",
    keywords: ["quickbooks", "bookkeeping", "accounting", "expenses"],
    scope: "A future connection will request only the QuickBooks company data required by the approved dashboard.",
    termsUrl: "https://www.intuit.com/legal/terms/en-us/",
    privacyUrl: "https://www.intuit.com/privacy/statement/",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    category: "CRM",
    mode: "OAuth",
    availability: "planned",
    keywords: ["hubspot", "crm", "leads", "contacts", "pipeline"],
    scope: "A future connection will show the HubSpot objects and permissions requested before authorization.",
    termsUrl: "https://legal.hubspot.com/terms-of-service",
    privacyUrl: "https://legal.hubspot.com/privacy-policy",
  },
  {
    id: "google-sheets",
    name: "Google Sheets",
    category: "Operations",
    mode: "OAuth",
    availability: "planned",
    keywords: ["google sheets", "spreadsheet", "spreadsheets", "sheets"],
    scope: "A future connection will ask for the minimum spreadsheet access required for the selected workflow.",
    termsUrl: "https://policies.google.com/terms",
    privacyUrl: "https://policies.google.com/privacy",
  },
  {
    id: "notion",
    name: "Notion",
    category: "Operations",
    mode: "OAuth",
    availability: "planned",
    keywords: ["notion", "knowledge base", "wiki"],
    scope: "A future connection will show which Notion pages or databases you authorize before it can read them.",
    termsUrl: "https://www.notion.so/Terms-and-Privacy-Policy-5b1a6a4d3b5a4fa984b29f2d0376e1c4",
    privacyUrl: "https://www.notion.so/Privacy-Policy-3468d120cf614d6a9e2675b5c6c3c3e1",
  },
] as const;

export type Connector = (typeof connectorCatalog)[number];
export type ConnectorId = Connector["id"];

/** Finds explicit service intent in a builder request. It does not imply consent or start OAuth. */
export function detectConnectorRequests(text: string): Connector[] {
  const normalized = ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, " ")} `;
  return connectorCatalog.filter((connector) => connector.keywords.some((keyword) => normalized.includes(` ${keyword} `)));
}
