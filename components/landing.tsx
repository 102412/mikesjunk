"use client";

import Link from "next/link";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { ArrowRight, Boxes, CheckCircle2, Github, Sparkles, WandSparkles } from "lucide-react";
import { useState } from "react";

const workspaceTypes = [
  { title: "Shipping a product", copy: "See releases, customer work, and the next decision in one calm place.", tag: "Product OS" },
  { title: "Running client work", copy: "Keep briefs, delivery dates, source links, and feedback from getting lost.", tag: "Client OS" },
  { title: "Operating an AI team", copy: "Give reliability, documentation, incidents, and experiments a shared home.", tag: "AI OS" },
];

function Artifact() {
  const [split, setSplit] = useState(58);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-30, 30], [3, -3]);
  const rotateY = useTransform(x, [-30, 30], [-4, 4]);

  return <motion.div className="hero-artifact" style={{ rotateX, rotateY }} onMouseMove={(event) => {
    const box = event.currentTarget.getBoundingClientRect();
    x.set(event.clientX - box.left - box.width / 2); y.set(event.clientY - box.top - box.height / 2);
  }} onMouseLeave={() => { x.set(0); y.set(0); }}>
    <div className="artifact-glow" />
    <div className="artifact-bar"><span className="artifact-brand"><span className="brand-mark">P</span> ProjectOS</span><span className="artifact-status"><i /> Live planning view</span><span className="artifact-avatar">MW</span></div>
    <div className="artifact-labels"><span>Before</span><span>After</span></div>
    <div className="artifact-stage">
      <div className="artifact-before" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}>
        <div className="noise-title">Untitled workspace</div><div className="noise-sub">Ideas, tabs, and loose ends</div>
        <div className="noise-stack"><span>pricing notes?</span><span>launch tasks</span><span>repo issue #48</span><span>call with Maya</span><span>metrics later</span></div>
        <div className="loose-dot d1"/><div className="loose-dot d2"/><div className="loose-dot d3"/>
      </div>
      <div className="artifact-after" style={{ clipPath: `inset(0 0 0 ${split}%)` }}>
        <aside><div className="side-logo">P</div><span className="side-active"/><span/><span/><span/><span/></aside>
        <div className="artifact-content"><div className="artifact-kicker">Tuesday, 10:24 AM</div><div className="artifact-title">Orbit / Launch room</div><div className="signal-row"><div><span>Release readiness</span><b>82%</b><i className="up">+12%</i></div><div><span>Priority actions</span><b>04</b><i>this week</i></div><div><span>Open signals</span><b>12</b><i className="up">healthy</i></div></div><div className="artifact-board"><div className="board-head"><span>Launch sequence</span><span className="board-chip">In focus</span></div><div className="board-line"><i className="check"/> Finalize onboarding <small>Today</small></div><div className="board-line"><i className="check faint"/> Verify deployment <small>Fri</small></div><div className="board-line"><i className="check faint"/> Invite first cohort <small>Next</small></div></div></div>
      </div>
      <div className="split-line" style={{ left: `${split}%` }}><button aria-label="Compare before and after" className="split-knob"><span>‹</span><span>›</span></button></div>
      <input className="comparison-input" aria-label="Move to compare an unstructured and organized workspace" type="range" min="8" max="92" value={split} onChange={(event) => setSplit(Number(event.target.value))}/>
    </div>
    <p className="artifact-caption"><WandSparkles size={14}/> Drag the divider — from a pile of work to a system that knows what matters.</p>
  </motion.div>;
}

export function Landing() {
  return <main className="landing-page"><div className="aurora aurora-one"/><div className="aurora aurora-two"/><div className="landing-grid"/>
    <div className="shell"><header className="topbar glass-nav"><Link className="brand" href="/"><span className="brand-mark">P</span>ProjectOS</Link><nav className="nav"><a href="#how">How it works</a><a href="#workspaces">Workspaces</a><a href="#trust">How it connects</a><Link className="button button-glow" href="/onboarding">Build my workspace <ArrowRight size={15}/></Link></nav></header>
      <section className="hero hero-v2"><div className="hero-copy"><motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="announcement"><span className="pulse"/> A better way to start a project</motion.div><h1>Give your work<br/>a <em>place to think.</em></h1><p>ProjectOS turns a plain-English brief into a focused project room—so you can see the next move, not another empty dashboard.</p><div className="hero-actions"><Link className="button button-glow" href="/onboarding">Start with your project <ArrowRight size={16}/></Link><a className="button-quiet glass-button" href="#how">See how it works</a></div><div className="hero-proof"><span><CheckCircle2 size={15}/> No account to try</span><span><CheckCircle2 size={15}/> Your data stays local</span></div></div><Artifact/></section></div>
    <section id="how" className="landing-section"><div className="shell"><div className="section-intro"><div><div className="eyebrow">Your brief becomes a working room</div><h2>Less setup. More <em>momentum.</em></h2></div><p>We ask what you are trying to accomplish in normal language, then shape the starting view around the work—not a list of software features.</p></div><div className="how-grid"><article className="glass-card how-card"><span className="step">01</span><MessageIcon/><h3>Tell us the outcome</h3><p>“I’m launching a membership product” makes more sense than choosing from a wall of dashboard widgets.</p></article><article className="glass-card how-card"><span className="step">02</span><Boxes size={21}/><h3>Get a room with a point of view</h3><p>Priorities, the right modules, and a clear first move arrive together—not as a blank canvas.</p></article><article className="glass-card how-card"><span className="step">03</span><Sparkles size={21}/><h3>Make it yours as you go</h3><p>Add real tasks, notes, resources, GitHub context, and project-aware AI guidance when you need it.</p></article></div></div></section>
    <section id="workspaces" className="landing-section workspace-section"><div className="shell"><div className="section-intro"><div><div className="eyebrow">Different work needs different rooms</div><h2>Built around the <em>job.</em></h2></div><p>Every workspace is assembled from approved, understandable modules. No mystery automation. No fake “insights.”</p></div><div className="workspace-types">{workspaceTypes.map((item, index) => <motion.article whileHover={{ y: -7 }} className="glass-card workspace-type" key={item.title}><div className={`type-orb type-orb-${index}`}/><span className="type-tag">{item.tag}</span><h3>{item.title}</h3><p>{item.copy}</p><Link href="/onboarding">Explore this setup <ArrowRight size={14}/></Link></motion.article>)}</div></div></section>
    <section id="trust" className="landing-section"><div className="shell trust-panel glass-card"><div><div className="eyebrow">Useful without pretending</div><h2>Clear about what’s connected.</h2><p>ProjectOS shows verified GitHub data only after a successful public lookup. The assistant can help you think, but it cannot deploy, change repositories, or access accounts.</p></div><div className="trust-list"><span><Github size={17}/><b>GitHub</b><small>Connected when you choose a public repo</small></span><span><Sparkles size={17}/><b>AI assistant</b><small>Guidance, never autonomous actions</small></span></div></div></section>
    <footer className="shell footer footer-v2"><span>© {new Date().getFullYear()} ProjectOS</span><span>Local-demo V1 · No browser-stored credentials</span></footer>
  </main>;
}

function MessageIcon() { return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M20 15a4 4 0 0 1-4 4H8l-4 3v-7a4 4 0 0 1-2-3.5V8a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/><path d="M7 10h10M7 14h6"/></svg>; }
