"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Boxes, GitBranch, LayoutDashboard, MessageSquareText, Sparkles, type LucideIcon } from "lucide-react";

const features: { Icon: LucideIcon; title: string; copy: string }[] = [
  { Icon: MessageSquareText, title: "Start with a conversation", copy: "Tell ProjectOS what you are building. It asks the useful follow-ups, not a form full of fields." },
  { Icon: Boxes, title: "A constrained generation engine", copy: "Every workspace comes from a validated schema and a library of approved modules—never arbitrary code." },
  { Icon: LayoutDashboard, title: "Built around the work", copy: "Your project type determines the navigation, priorities, and panels you begin with." },
];
const examples: { title: string; copy: string; tags: string[] }[] = [
  { title: "SaaS founder", copy: "Deploy confidence · Revenue signals · Repository health", tags: ["Metrics", "GitHub", "AI assistant"] },
  { title: "Freelance developer", copy: "Client deadlines · Briefs · Delivery notes", tags: ["Tasks", "Notes", "Resources"] },
  { title: "AI startup", copy: "API reliability · Incidents · Documentation", tags: ["Operations", "Notes", "Assistant"] },
];

export function Landing() {
  return <main><div className="shell"><header className="topbar"><Link className="brand" href="/"><span className="brand-mark">P</span>ProjectOS</Link><nav className="nav"><a href="#how">How it works</a><a href="#examples">Workspaces</a><a href="#faq">FAQ</a><Link className="button" href="/onboarding">Build your workspace</Link></nav></header>
    <section className="hero"><div><div className="eyebrow">The adaptive project workspace</div><h1>Your project.<br />Your tools.<br /><span style={{ color: "var(--brand)" }}>Your operating system.</span></h1><p>Describe what you’re building. ProjectOS assembles the workspace you actually need—using a controlled library of useful modules.</p><div className="hero-actions"><Link className="button" href="/onboarding">Start the conversation</Link><Link className="button-quiet" href="/demo">Try the public demo</Link></div></div>
      <motion.div className="preview" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5 }}><div className="preview-top"><span className="dot"/><span className="dot"/><span className="dot"/></div><div className="tiny">orbit / production workspace</div><div className="preview-grid"><div className="preview-card"><div className="tiny">Release health</div><div className="bar brand"/><div className="bar short"/></div><div className="preview-card"><div className="tiny">Priority tasks</div><div className="bar brand"/><div className="bar"/></div><div className="preview-card"><div className="tiny">Repository</div><div className="bar"/><div className="bar short"/></div><div className="preview-card"><div className="tiny">Assistant</div><div className="bar brand"/><div className="bar short"/></div></div></motion.div>
    </section></div>
    <section id="how" className="section"><div className="shell"><div className="eyebrow">Not another static dashboard</div><h2>A workspace with a point of view.</h2><p className="section-lede">ProjectOS adapts the information architecture to the project, while keeping permissions and the available capabilities explicit.</p><div className="feature-grid">{features.map(({ Icon, title, copy }) => <article className="card" key={title}><div className="icon-box"><Icon size={17}/></div><h3>{title}</h3><p>{copy}</p></article>)}</div></div></section>
    <section id="examples" className="section"><div className="shell"><div className="eyebrow">Three projects, three starting points</div><h2>Purposeful variation.</h2><div className="example-grid">{examples.map(({ title, copy, tags }) => <article className="card" key={title}><div className="icon-box"><Sparkles size={17}/></div><h3>{title}</h3><p>{copy}</p><div>{tags.map(tag => <span className="tag" key={tag}>{tag}</span>)}</div></article>)}</div></div></section>
    <section className="section"><div className="shell"><div className="card" style={{ display: "flex", justifyContent: "space-between", gap: 20, alignItems: "center", flexWrap: "wrap" }}><div><div className="eyebrow">Built for a real project</div><h2 style={{ marginBottom: 0 }}>Begin with the work you already have.</h2></div><Link className="button" href="/onboarding">Generate a workspace</Link></div></div></section>
    <section id="faq" className="section"><div className="shell"><div className="eyebrow">FAQ</div><h2>Clear about what is connected.</h2><details className="faq"><summary>Is this a secure multi-user production backend?</summary><p>This public V1 runs in clearly marked local-demo mode unless an authenticated backend is configured. Your demo data stays in this browser’s local storage.</p></details><details className="faq"><summary>Does ProjectOS invent integrations?</summary><p>No. GitHub data is only shown after a real public repository lookup succeeds. Other services are shown as planned until they are configured.</p></details><details className="faq"><summary>Can the assistant deploy or change my repository?</summary><p>No. The assistant offers project-aware guidance only; it has no repository or deployment controls in this V1.</p></details></div></section>
    <footer className="shell footer"><span>© {new Date().getFullYear()} ProjectOS</span><span><GitBranch size={13} style={{ verticalAlign: "middle" }}/> Local-demo V1 · No credentials stored in the browser</span></footer>
  </main>;
}
