"use client";

import Link from "next/link";
import { ArrowRight, Rocket } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BrowserTrapdoor } from "./browser-trapdoor";

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [browserOpen, setBrowserOpen] = useState(false);
  const router = useRouter();
  const clicks = useRef(0);
  const navigationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (navigationTimer.current) clearTimeout(navigationTimer.current);
    if (clickResetTimer.current) clearTimeout(clickResetTimer.current);
  }, []);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 18);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  const goToBuilder = () => router.push("/builder");
  return <><header className={`modern-nav${scrolled ? " is-scrolled" : ""}`}><Link href="/" className="modern-brand"><span className="logo-mark" aria-hidden="true"><img src="/kernova-logo.png" alt=""/></span>Kernova</Link><nav><a href="#how">How it works</a><a href="#hosting">Hosting</a><a href="#pricing">Pricing</a></nav><div className="modern-nav-actions"><Link className="modern-nav-signin" href="/builder?auth=export">Sign in</Link><Link className={`modern-nav-cta${launching ? " is-launching" : ""}`} href="/builder" aria-busy={launching} onClick={event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    clicks.current += 1;
    if (navigationTimer.current) clearTimeout(navigationTimer.current);
    if (clickResetTimer.current) clearTimeout(clickResetTimer.current);
    if (clicks.current === 3) {
      clicks.current = 0;
      setLaunching(false);
      setBrowserOpen(true);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      clicks.current = 0;
      goToBuilder();
      return;
    }
    setLaunching(true);
    navigationTimer.current = setTimeout(() => {
      navigationTimer.current = null;
      clicks.current = 0;
      setLaunching(false);
      goToBuilder();
    }, 680);
    clickResetTimer.current = setTimeout(() => { clicks.current = 0; clickResetTimer.current = null; }, 450);
  }}><span className="nav-cta-full">Build a dashboard</span><span className="nav-cta-short">Build</span><span className="nav-cta-rocket"><Rocket size={15}/></span></Link></div></header>{browserOpen && <BrowserTrapdoor onClose={() => setBrowserOpen(false)}/>}</>;
}
