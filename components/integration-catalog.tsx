"use client";

import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, CircleAlert, KeyRound, Landmark, Mail, MessageSquare, Sheet, Sparkles } from "lucide-react";
import { activepiecesProviders, type IntegrationRuntimeStatus } from "@/lib/integration-runtime";
import { ConnectorConsent, ConnectorMenu } from "@/components/connector-controls";
import type { Connector } from "@/lib/connectors";

const icons = { "google-calendar": CalendarDays, gmail: Mail, slack: MessageSquare, stripe: Landmark, quickbooks: Landmark, hubspot: Sparkles, "google-sheets": Sheet, notion: Sheet } as const;

const setupCopy: Record<Exclude<IntegrationRuntimeStatus["reason"], "ready">, string> = {
  missing_url: "The self-hosted integration runtime has not been assigned a secure URL yet.",
  missing_api_key: "The runtime URL exists, but Kernova has no server-only credential for it yet.",
  invalid_url: "The runtime URL must use HTTPS (localhost is allowed only for development).",
};

export function IntegrationCatalog() {
  const [runtime, setRuntime] = useState<IntegrationRuntimeStatus | null>(null);
  const [calendarConfigured, setCalendarConfigured] = useState<boolean | null>(null);
  const [calendarNotice, setCalendarNotice] = useState<string | null>(null);
  const [selectedConnector, setSelectedConnector] = useState<Connector | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/integrations/runtime", { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<IntegrationRuntimeStatus> : null)
      .then((status) => { if (active) setRuntime(status); })
      .catch(() => { if (active) setRuntime({ provider: "activepieces", configured: false, reason: "missing_url" }); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const result = new URLSearchParams(window.location.search).get("calendar");
    if (result === "connected") setCalendarNotice("Google Calendar is connected. Kernova can now read the calendars you authorized.");
    if (result === "sign_in_required") setCalendarNotice("Sign in to Kernova before connecting a Google Calendar.");
    if (result === "setup_required") setCalendarNotice("Calendar credentials still need to be added to the server environment.");
    if (result === "error") setCalendarNotice("The Calendar connection did not finish. Confirm the callback URL and server secrets, then try again.");
    fetch("/api/integrations/google-calendar/status", { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<{ configured: boolean }> : null)
      .then((status) => { if (active) setCalendarConfigured(status?.configured ?? false); })
      .catch(() => { if (active) setCalendarConfigured(false); });
    return () => { active = false; };
  }, []);

  const isReady = runtime?.configured === true;
  const statusLabel = runtime === null ? "Checking runtime" : isReady ? "Runtime configured" : "Runtime setup required";
  const runtimeMessage = runtime === null
    ? "Checking the private automation engine."
    : runtime.reason === "ready"
      ? "Kernova can safely begin creating connection flows. A provider is not marked connected until its OAuth consent and first sync both finish."
      : setupCopy[runtime.reason];

  return <>
    <section className="integration-runtime-card" aria-live="polite">
      <div className={`integration-runtime-icon ${isReady ? "ready" : ""}`}>{isReady ? <CheckCircle2 size={19} /> : <KeyRound size={19} />}</div>
      <div>
        <span className="eyebrow">Integration runtime</span>
        <h2>{statusLabel}</h2>
        <p>{runtimeMessage}</p>
      </div>
      <span className={isReady ? "status" : "tag"}>{isReady ? "Private endpoint" : "Not live"}</span>
    </section>
    <section className="integration-guidance">
      <CircleAlert size={16} aria-hidden="true" />
      <p><strong>What this changes:</strong> each service is connected only after its owner gives consent. Calendar tokens are encrypted before storage and are never sent to dashboard browser code.</p>
    </section>
    <header className="integration-list-head"><div><span className="eyebrow">Connector catalog</span><h2>Choose a service</h2><p>Every connection asks for your agreement before authorization or adding it to your dashboard plan.</p></div><ConnectorMenu/></header>
    <section className="integration-primary" aria-labelledby="calendar-connect-heading">
      <div className="integration-provider-icon"><CalendarDays size={20} /></div>
      <div className="integration-primary-copy">
        <span className="eyebrow">Available now · read-only</span>
        <h2 id="calendar-connect-heading">Google Calendar</h2>
        <p>Bring your authorized calendars into a generated dashboard. Kernova asks only to view calendars and events—never to create, change, or delete them.</p>
        {calendarNotice && <p className="auth-connection-note" role="status">{calendarNotice}</p>}
      </div>
      <button className="button" type="button" disabled={calendarConfigured !== true} onClick={() => { const calendar = activepiecesProviders.find(provider => provider.id === "google-calendar"); if (calendar) setSelectedConnector(calendar); }}>
        {calendarConfigured === null ? "Checking setup…" : calendarConfigured ? "Review & connect" : "Server setup required"}
      </button>
    </section>
    <section className="integration-catalog-grid" aria-label="Available integration recipes">
      {activepiecesProviders.filter((provider) => provider.id !== "google-calendar").map((provider) => {
        const Icon = icons[provider.id];
        return <article className="integration-provider" key={provider.id}>
          <div className="integration-provider-icon"><Icon size={18} /></div>
          <div className="integration-provider-copy"><span>{provider.category}</span><h3>{provider.name}</h3><p>{provider.mode}</p></div>
          <button className="button-quiet" type="button" onClick={() => setSelectedConnector(provider)}>Review & add</button>
        </article>;
      })}
    </section>
    {selectedConnector && <ConnectorConsent connector={selectedConnector} onClose={() => setSelectedConnector(null)} />}
  </>;
}
