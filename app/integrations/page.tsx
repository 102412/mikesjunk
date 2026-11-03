import { AppNav } from "@/components/app-nav";
import { Github, Sparkles, Database, MessageSquare } from "lucide-react";

const integrations = [
  [Github, "GitHub", "Implemented", "Look up a public owner/repository and retrieve its repository metadata, recent commits, and open-issue count.", "/workspace"],
  [Sparkles, "OpenAI", "Required for AI builds", "ProjectOS sends scoped build and edit requests through its server-side OpenAI integration. If the key is unavailable, the builder shows an explicit error and does not fabricate a dashboard.", "/onboarding"],
  [Database, "Supabase", "Planned", "A managed multi-user database path. Not connected in this local-demo V1.", "#"],
  [MessageSquare, "Linear", "Planned", "Issue synchronization is intentionally not represented as connected until OAuth and authorization are implemented.", "#"],
] as const;
export default function IntegrationsPage() { return <div className="app-shell"><AppNav /><main className="page-wrap"><div className="page-heading"><div className="eyebrow">Connections</div><h1>Explicit integration status.</h1><p className="muted">ProjectOS distinguishes a working connection from an available future option.</p></div><div style={{ display: "grid", gap: 11 }}>{integrations.map(([Icon, name, status, copy, href]) => <article className="card" key={name} style={{ display: "flex", gap: 14, alignItems: "start" }}><div className="icon-box"><Icon size={17}/></div><div style={{ flex: 1 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><h3 style={{ marginTop: 0 }}>{name}</h3><span className={status === "Implemented" ? "status" : "tag"}>{status}</span></div><p>{copy}</p>{href !== "#" && <a className="tiny" style={{ display: "inline-block", marginTop: 10, color: "var(--brand)" }} href={href}>Open workspace →</a>}</div></article>)}</div></main></div>; }
