"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BrowserTrapdoor } from "./browser-trapdoor";

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [browserOpen, setBrowserOpen] = useState(false);
  const router = useRouter();
  const clicks = useRef(0);
  const navigationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (navigationTimer.current) clearTimeout(navigationTimer.current);
  }, []);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 18);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return <><header className={`modern-nav${scrolled ? " is-scrolled" : ""}`}><Link href="/" className="modern-brand"><span className="logo-mark" aria-hidden="true"><img src="/kernova-logo.png" alt=""/></span>Kernova</Link><nav><a href="#how">How it works</a><a href="#hosting">Hosting</a><a href="#pricing">Pricing</a></nav><div className="modern-nav-actions"><Link className="modern-nav-signin" href="/builder?auth=export">Sign in</Link><Link className="modern-nav-cta" href="/builder" onClick={event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    // Keyboard activation retains immediate navigation. Pointer clicks wait for
    // the remaining clicks so the first click cannot unmount the entrance.
    if (event.detail === 0) return;
    event.preventDefault();
    if (navigationTimer.current) clearTimeout(navigationTimer.current);
    clicks.current += 1;
    if (clicks.current === 3) {
      clicks.current = 0;
      navigationTimer.current = null;
      setBrowserOpen(true);
      return;
    }
    navigationTimer.current = setTimeout(() => {
      clicks.current = 0;
      navigationTimer.current = null;
      router.push("/builder");
    }, 450);
  }}><span className="nav-cta-full">Build a dashboard</span><span className="nav-cta-short">Build</span><ArrowRight size={15}/></Link></div></header>{browserOpen && <BrowserTrapdoor onClose={() => setBrowserOpen(false)}/>}</>;
}
