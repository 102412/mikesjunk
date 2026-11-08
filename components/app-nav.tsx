"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["Builder", "/builder"], ["Workspace", "/builder/workspace"], ["Connections", "/integrations"], ["Export", "/export"],
] as const;

export function AppNav() {
  const path = usePathname();
  return <nav className="app-nav" aria-label="Product navigation"><div className="app-nav-inner">
    <Link className="brand" href="/"><span className="brand-mark logo-mark" aria-hidden="true"><img src="/kernova-logo.png" alt="" width="36" height="36"/></span><span>Kernova</span></Link>
    <div className="app-links">{links.map(([label, href]) => <Link key={href} data-active={path === href ? "true" : undefined} href={href}>{label}</Link>)}</div>
    <Link className="button-quiet" href="/builder">New dashboard</Link>
  </div></nav>;
}
