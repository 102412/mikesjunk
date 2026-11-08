"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, CalendarDays, ChartNoAxesCombined, Clock3, MapPin, UsersRound } from "lucide-react";
import gsap from "gsap";

const examples = [
  {
    name: "Field operations",
    type: "LANDSCAPING · 8 CREW",
    title: "Today, at a glance.",
    stats: [["Jobs today", "12", "4 need routing"], ["Crew active", "08", "All checked in"], ["Booked", "84%", "+12% this week"]],
    rows: [["08:30", "Hughes residence", "North district", "On route"], ["10:15", "Maple Street HOA", "Crew 02 · mowing", "Ready"], ["12:45", "Dawson estimate", "East district", "Needs review"]],
    icon: MapPin,
    accent: "pink",
  },
  {
    name: "Team schedule",
    type: "SERVICE BUSINESS · 12 STAFF",
    title: "The right people, in the right place.",
    stats: [["On the rota", "12", "Across 3 locations"], ["Open shifts", "02", "Both covered today"], ["Hours planned", "318", "Within weekly target"]],
    rows: [["MON · 9 AM", "Install team", "Jordan + Casey", "Confirmed"], ["MON · 11 AM", "Customer visits", "Morgan + Lee", "Confirmed"], ["MON · 2 PM", "Warehouse cover", "Alex", "Needs cover"]],
    icon: CalendarDays,
    accent: "blue",
  },
  {
    name: "Customer care",
    type: "CLIENT SERVICES · SHARED INBOX",
    title: "Every conversation has a next step.",
    stats: [["Open requests", "26", "6 need a reply"], ["First response", "18m", "Down 12%"], ["Resolved today", "41", "On track"]],
    rows: [["AC", "Avery Collins", "Update delivery window", "Needs reply"], ["MR", "Mia Reynolds", "Invoice question", "Assigned"], ["JP", "Jordan Patel", "New service request", "Just in"]],
    icon: UsersRound,
    accent: "purple",
  },
  {
    name: "Business pulse",
    type: "OWNER VIEW · THIS MONTH",
    title: "Know what needs your attention.",
    stats: [["Revenue booked", "$48.2k", "+8.4% month over month"], ["Work in progress", "37", "5 waiting on approval"], ["Customer rating", "4.9", "From 126 reviews"]],
    rows: [["Mon", "Jobs completed", "38", "↑ 12%"], ["Tue", "New enquiries", "14", "↑ 4%"], ["Wed", "Estimates approved", "09", "On plan"]],
    icon: ChartNoAxesCombined,
    accent: "teal",
  },
] as const;

function DashboardFace({ example }: { example: (typeof examples)[number] }) {
  const Icon = example.icon;
  return <div className={`showcase-dashboard accent-${example.accent}`}>
    <div className="showcase-dash-nav"><span className="showcase-dash-mark">K</span><b>{example.name}</b><span className="showcase-dash-live"><i/> LIVE</span><span className="showcase-dash-avatar">MK</span></div>
    <div className="showcase-dash-body">
      <aside className="showcase-dash-side"><small>WORKSPACE</small><b>Northside Co.</b>{["Overview", "Schedule", "Customers", "Reports"].map((item, i) => <span className={i === 0 ? "active" : ""} key={item}>{item}</span>)}</aside>
      <div className="showcase-dash-content">
        <div className="showcase-dash-title"><div><small>{example.type}</small><h3>{example.title}</h3></div><button type="button" tabIndex={-1}><Icon size={13}/> Today</button></div>
        <div className="showcase-dash-stats">{example.stats.map(([label, value, note]) => <article key={label}><small>{label}</small><b>{value}</b><span>{note}</span></article>)}</div>
        <div className="showcase-dash-table"><header><b>{example.name === "Business pulse" ? "Weekly activity" : example.name === "Customer care" ? "Needs a response" : "Coming up today"}</b><span>View all <ArrowRight size={11}/></span></header>
          {example.rows.map((row, index) => <div className="showcase-dash-row" key={row.join("-")}>
            {example.name === "Customer care" ? <i className={`showcase-customer-avatar c-${index}`}>{row[0]}</i> : <i className={`showcase-row-dot d-${index}`}/>}
            <b>{example.name === "Customer care" ? row[1] : row[0]}</b><span>{example.name === "Customer care" ? row[2] : row[1]}</span><small>{example.name === "Customer care" ? "Assigned to your team" : row[2]}</small><em>{row[3]}</em>
          </div>)}
        </div>
        <div className="showcase-dash-footer"><Clock3 size={12}/> Updated just now <span>Connected workspace</span></div>
      </div>
    </div>
  </div>;
}

export function DashboardShowcase() {
  const rootRef = useRef<HTMLElement>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const [active, setActive] = useState(0);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setEntered(true);
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        observer.disconnect();
        return;
      }
      const items = root.querySelectorAll<HTMLElement>(".showcase-card, .showcase-intro > *");
      gsap.fromTo(items, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.68, stagger: 0.09, ease: "power3.out", clearProps: "transform" });
      observer.disconnect();
    }, { threshold: 0.14 });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  const move = (direction: number) => setActive(index => (index + direction + examples.length) % examples.length);
  return <section ref={rootRef} className={`dashboard-showcase${entered ? " is-entered" : ""}`} id="examples" aria-labelledby="showcase-title" onKeyDown={event => {
    if (event.key === "ArrowRight") move(1);
    if (event.key === "ArrowLeft") move(-1);
  }}>
    <div className="showcase-intro"><div><div className="section-label">A few ways to put it to work</div><h2 id="showcase-title">Dashboards built around your work.</h2></div><p>Each workspace starts with your process. Here are a few examples of what Kernova can shape around a real team.</p></div>
    <div className="showcase-layout">
      <div className="showcase-stack" role="group" tabIndex={0} aria-label="Dashboard examples. Use the arrows or swipe to browse." onPointerDown={event => { pointerStart.current = { x: event.clientX, y: event.clientY }; }} onPointerUp={event => {
        if (!pointerStart.current) return;
        const dx = event.clientX - pointerStart.current.x;
        const dy = event.clientY - pointerStart.current.y;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) move(dx < 0 ? 1 : -1);
        pointerStart.current = null;
      }}>
        {examples.map((example, index) => {
          const offset = (index - active + examples.length) % examples.length;
          return <article key={example.name} className={`showcase-card${offset === 0 ? " is-front" : ""}`} aria-hidden={offset !== 0} style={{ "--stack-depth": Math.min(offset, 3), "--stack-angle": offset === 1 ? "2deg" : offset === 2 ? "-2deg" : "0deg" } as CSSProperties}>
            <DashboardFace example={example}/>
          </article>;
        })}
        <div className="showcase-stack-count"><span>{String(active + 1).padStart(2, "0")}</span><i/><span>{String(examples.length).padStart(2, "0")}</span></div>
      </div>
      <div className="showcase-details" aria-live="polite"><div className="showcase-detail-index">DASHBOARD EXAMPLE <span>{String(active + 1).padStart(2, "0")} / {String(examples.length).padStart(2, "0")}</span></div><h3>{examples[active].name}</h3><p>{examples[active].type.toLowerCase().replace(" · ", " for ")}. A focused view for the people doing the work, with the details they need close at hand.</p><div className="showcase-controls"><button type="button" aria-label="Previous dashboard example" onClick={() => move(-1)}><ArrowLeft size={17}/></button><button type="button" aria-label="Next dashboard example" onClick={() => move(1)}><ArrowRight size={17}/></button><span><ArrowDown size={14}/> Drag or use arrows to explore</span></div></div>
    </div>
  </section>;
}
