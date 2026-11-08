"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarDays, Check, ChevronDown, CirclePlus, Landmark, Mail, MessageSquare, Sheet, Sparkles, X } from "lucide-react";
import { connectorCatalog, type Connector, type ConnectorId } from "@/lib/connectors";

const icons = { "google-calendar": CalendarDays, gmail: Mail, slack: MessageSquare, stripe: Landmark, quickbooks: Landmark, hubspot: Sparkles, "google-sheets": Sheet, notion: Sheet } as const;

type ConnectorControlProps = {
  onAdded?: (connector: Connector) => void;
  className?: string;
};

export function ConnectorConsent({ connector, onClose, onAdded }: { connector: Connector; onClose: () => void; onAdded?: (connector: Connector) => void }) {
  const [kernovaAccepted, setKernovaAccepted] = useState(false);
  const [providerAccepted, setProviderAccepted] = useState(false);
  const accepted = kernovaAccepted && providerAccepted;
  const Icon = icons[connector.id];

  const addConnector = () => {
    if (!accepted) return;
    onAdded?.(connector);
    if (connector.availability === "connect") {
      window.location.assign("/api/integrations/google-calendar/connect");
      return;
    }
    onClose();
  };

  return <div className="connector-consent-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="connector-consent" role="dialog" aria-modal="true" aria-labelledby="connector-consent-title" onMouseDown={(event) => event.stopPropagation()}>
      <button className="connector-close" onClick={onClose} aria-label="Close connector consent"><X size={17} /></button>
      <div className="connector-consent-icon"><Icon size={20} /></div>
      <span className="connector-kicker">Connection review</span>
      <h2 id="connector-consent-title">Add {connector.name}</h2>
      <p>{connector.scope}</p>
      <div className="connector-terms">
        <label><input type="checkbox" checked={kernovaAccepted} onChange={(event) => setKernovaAccepted(event.target.checked)} /> <span>I agree to Kernova&apos;s <Link href="/legal/terms" target="_blank">Terms of Use</Link> and <Link href="/legal/privacy" target="_blank">Privacy Policy</Link>.</span></label>
        <label><input type="checkbox" checked={providerAccepted} onChange={(event) => setProviderAccepted(event.target.checked)} /> <span>I acknowledge and agree to {connector.name}&apos;s <a href={connector.termsUrl} target="_blank" rel="noreferrer">Terms</a> and <a href={connector.privacyUrl} target="_blank" rel="noreferrer">Privacy Policy</a>.</span></label>
      </div>
      <p className="connector-fineprint">You can review each policy before agreeing. Kernova opens the provider&apos;s authorization screen only after both acknowledgements are checked.</p>
      <button className="connector-confirm" type="button" disabled={!accepted} onClick={addConnector}>{connector.availability === "connect" ? "Agree & connect Google Calendar" : "Agree & add to dashboard plan"}</button>
      {connector.availability === "planned" && <p className="connector-planned">This connection is added to the dashboard plan now. Authorization will remain unavailable until the direct connector is live.</p>}
    </section>
  </div>;
}

export function ConnectorMenu({ onAdded, className = "" }: ConnectorControlProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Connector | null>(null);
  return <div className={`connector-menu ${className}`}>
    <button className="connector-menu-trigger" type="button" aria-expanded={open} onClick={() => setOpen((current) => !current)}><CirclePlus size={15} /> Connections <ChevronDown size={13} /></button>
    {open && <div className="connector-menu-popover" role="dialog" aria-label="Add a connector"><div className="connector-menu-copy"><b>Add a connection</b><span>Review terms before any service is added.</span></div>{connectorCatalog.map((connector) => { const Icon = icons[connector.id]; return <button type="button" key={connector.id} className="connector-menu-item" onClick={() => { setSelected(connector); setOpen(false); }}><span className="connector-small-icon"><Icon size={15} /></span><span><b>{connector.name}</b><small>{connector.availability === "connect" ? "Available now" : "Add to plan"}</small></span><CirclePlus size={15} /></button>; })}</div>}
    {selected && <ConnectorConsent connector={selected} onClose={() => setSelected(null)} onAdded={onAdded} />}
  </div>;
}

export function ConnectorSuggestion({ connectorId, onAdded }: { connectorId: ConnectorId; onAdded?: (connector: Connector) => void }) {
  const connector = connectorCatalog.find((item) => item.id === connectorId);
  const [open, setOpen] = useState(false);
  if (!connector) return null;
  const Icon = icons[connector.id];
  return <aside className="connector-suggestion" aria-label={`${connector.name} connector suggestion`}><div className="connector-suggestion-icon"><Icon size={18} /></div><div><span>Connector detected</span><b>Add {connector.name}</b><p>{connector.availability === "connect" ? "Your request mentions this service. Review access and terms before connecting it." : "Your request mentions this service. Add it to the dashboard plan while its direct connection is being prepared."}</p></div><button type="button" onClick={() => setOpen(true)}>{connector.availability === "connect" ? "Review & connect" : "Review & add"}</button>{open && <ConnectorConsent connector={connector} onClose={() => setOpen(false)} onAdded={onAdded} />}</aside>;
}
