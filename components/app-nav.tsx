"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["Workspace", "/workspace"], ["Settings", "/workspace/settings"], ["Integrations", "/integrations"], ["Demo", "/demo"],
] as const;

export function AppNav() {
  const path = usePathname();
  return <nav className="app-nav"><div className="app-nav-inner liquid-surface">
    <Link className="brand" href="/"><span className="brand-mark">P</span>ProjectOS</Link>
    <div className="app-links">{links.map(([label, href]) => <Link key={href} style={path === href ? { color: "var(--ink)", background: "var(--surface-raised)", boxShadow: "inset 0 0 0 1px var(--line)" } : {}} href={href}>{label}</Link>)}</div>
    <Link className="button-quiet" href="/builder">Build with AI</Link>
  </div></nav>;
}
