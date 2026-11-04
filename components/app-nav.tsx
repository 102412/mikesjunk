"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["Builder", "/onboarding"], ["Live preview", "/builder/workspace"], ["Export", "/export"],
] as const;

export function AppNav() {
  const path = usePathname();
  return <nav className="app-nav"><div className="app-nav-inner">
    <Link className="brand" href="/"><span className="brand-mark logo-mark" aria-hidden="true"><img src="/kernova-logo.png" alt=""/></span>Kernova</Link>
    <div className="app-links">{links.map(([label, href]) => <Link key={href} style={path === href ? { color: "var(--ink)", background: "var(--surface-raised)", boxShadow: "inset 0 0 0 1px var(--line)" } : {}} href={href}>{label}</Link>)}</div>
    <Link className="button-quiet" href="/onboarding">New dashboard</Link>
  </div></nav>;
}
