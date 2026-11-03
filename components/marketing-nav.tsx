"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 18);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return <header className={`modern-nav${scrolled ? " is-scrolled" : ""}`}><Link href="/" className="modern-brand"><span>p</span>ProjectOS</Link><nav><a href="#how">How it works</a><a href="#hosting">Hosting</a><a href="#pricing">Pricing</a></nav><Link className="modern-nav-cta" href="/onboarding">Build a dashboard <ArrowRight size={15}/></Link></header>;
}
