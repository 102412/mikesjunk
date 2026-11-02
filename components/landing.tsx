"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, ChevronRight, Circle, Command, Play, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { emptyData, saveData, saveWorkspace } from "@/lib/storage";
import type { WorkspaceConfig } from "@/lib/workspace-schema";

type Transcript = { tone: "command" | "system" | "success"; text: string };
const examples = [
  "I’m launching \"Orbit\", a subscription web app. I need to see what to ship, keep product notes, customer signals, and connect my GitHub repo.",
  "A client workspace for websites: deadlines, briefs, decisions, links, and the work I should do next.",
  "An AI product control room for reliability, incidents, docs, and technical experiments.",
];

function MiniDashboard({ config, status }: { config: WorkspaceConfig | null; status: "idle" | "shaping" | "ready" }) {
  const priorities = config?.priorities ?? ["Your next decision", "What needs attention", "The context behind it"];
  return <div className="mini-dashboard" aria-label="Workspace preview"><div className="mini-top"><span className="mini-dot active"/><span className="mini-dot"/><span className="mini-dot"/><b>{config?.name ?? "your-project"}</b><span className="mini-state">{status === "ready" ? "compiled" : status === "shaping" ? "writing" : "preview"}</span></div><div className="mini-body"><aside><span className="mini-p">P</span><i className="selected"/><i/><i/><i/></aside><div className="mini-content"><span className="mini-eyebrow">PROJECT ROOM</span><h3>{config?.name ?? "A room for the work"}</h3><div className="mini-metrics"><div><span>First focus</span><b>{priorities[0]}</b></div><div><span>Tools</span><b>{config?.modules.length ?? 6}</b></div></div><div className="mini-list"><div><i/><span>{priorities[1]}</span><small>next</small></div><div><i/><span>{priorities[2]}</span><small>context</small></div><div><i/><span>Review the plan</span><small>ready</small></div></div></div></div></div>;
}

export function Landing() {
  const router = useRouter();
  const [brief, setBrief] = useState("");
  const [status, setStatus] = useState<"idle" | "shaping" | "ready">("idle");
  const [transcript, setTranscript] = useState<Transcript[]>([{ tone: "system", text: "ProjectOS operator online. Tell me what you need the dashboard to do." }]);
  const [config, setConfig] = useState<WorkspaceConfig | null>(null);
  const timeouts = useRef<number[]>([]);

  useEffect(() => () => timeouts.current.forEach(window.clearTimeout), []);
  useEffect(() => {
    let frame = 0;
    const updateGlass = () => { frame = 0; const amount = Math.min(window.scrollY / 280, 1); const root = document.documentElement; root.style.setProperty("--operator-scroll", String(amount)); root.style.setProperty("--operator-blur", `${12 + amount * 10}px`); root.style.setProperty("--operator-sheen", String(.58 + amount * .28)); root.style.setProperty("--operator-ripple-opacity", String(.24 + amount * .26)); root.style.setProperty("--operator-ripple-shift", `${amount * 7}px`); };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(updateGlass); };
    updateGlass(); window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (frame) window.cancelAnimationFrame(frame); const root = document.documentElement; ["--operator-scroll", "--operator-blur", "--operator-sheen", "--operator-ripple-opacity", "--operator-ripple-shift"].forEach((property) => root.style.removeProperty(property)); };
  }, []);
  const write = (line: Transcript, after = 0) => { const id = window.setTimeout(() => setTranscript(current => [...current, line]), after); timeouts.current.push(id); };
  const shape = async (value = brief) => {
    const description = value.trim(); if (!description || status === "shaping") return;
    setBrief(description); setStatus("shaping"); setConfig(null);
    setTranscript([{ tone: "command", text: `> ${description}` }, { tone: "system", text: "Analyzing the outcome—not just filling a dashboard…" }]);
    write({ tone: "system", text: "├─ selecting a focused workspace shape" }, 420);
    write({ tone: "system", text: "├─ choosing only useful modules" }, 760);
    let workspace: WorkspaceConfig | undefined; let mode = "local planner";
    try {
      const response = await fetch("/api/workspace-config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description }) });
      const result = await response.json(); if (response.ok) { workspace = result.config; mode = result.mode === "ai" ? "AI planner" : mode; }
    } catch { /* A validated local planner handles offline development. */ }
    if (!workspace) { const { generateWorkspace } = await import("@/lib/workspace-schema"); workspace = generateWorkspace({ description }); }
    const shaped = workspace;
    write({ tone: "success", text: `├─ ${mode}: ${shaped.category} workspace selected` }, 1050);
    write({ tone: "success", text: `├─ modules: ${shaped.modules.join(", ")}` }, 1340);
    const done = window.setTimeout(() => { saveWorkspace(shaped); saveData(emptyData()); setConfig(shaped); setStatus("ready"); setTranscript(current => [...current, { tone: "success", text: `└─ ${shaped.name} is ready to open.` }]); }, 1680);
    timeouts.current.push(done);
  };
  return <main className="operator-page"><div className="operator-scene"/><div className="operator-stars"/>
    <header className="command-nav liquid-surface"><Link href="/" className="brand"><span className="brand-mark">P</span>ProjectOS</Link><nav><a href="#operator">Operator</a><a href="#how">How it works</a><Link href="/workspace">My workspace</Link></nav><a className="nav-live" href="#operator"><i/> Live builder</a></header>
    <section className="operator-hero" id="operator"><motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="operator-intro"><div className="operator-kicker"><Command size={14}/> PROJECTOS / OPERATOR</div><h1>Describe the room.<br/><em>Watch it take shape.</em></h1><p>Tell the operator what you need to run. It builds a real, constrained workspace plan while you watch—no empty dashboard, no mystery setup.</p></motion.div>
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .12 }} className="operator-terminal"><div className="terminal-chrome"><div><span/><span/><span/></div><b>projectos@operator:~</b><span className="terminal-secure"><Circle size={7} fill="currentColor"/> local session</span></div><div className="terminal-grid"><div className="terminal-pane"><div className="terminal-scroll" aria-live="polite">{transcript.map((line, index) => <motion.div initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} className={`terminal-line ${line.tone}`} key={`${line.text}-${index}`}><span>{line.tone === "success" ? <Check size={13}/> : line.tone === "command" ? "❯" : "·"}</span>{line.text}</motion.div>)}{status === "shaping" && <div className="terminal-cursor">▋</div>}</div><div className="terminal-composer"><span>❯</span><textarea value={brief} disabled={status === "shaping"} onChange={(event) => setBrief(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); shape(); } }} placeholder="Describe the dashboard you wish existed…" aria-label="Describe your ideal dashboard"/><button onClick={() => shape()} disabled={!brief.trim() || status === "shaping"}>{status === "shaping" ? <span className="spinner"/> : <Play size={14} fill="currentColor"/>}<span>{status === "shaping" ? "Building" : "Build"}</span></button></div><div className="terminal-suggestions"><span>Try:</span>{examples.map((example, index) => <button key={example} onClick={() => shape(example)} disabled={status === "shaping"}>/{["launch", "client", "ai"][index]}</button>)}</div></div><div className="preview-pane"><div className="preview-label"><span><Sparkles size={13}/> LIVE OUTPUT</span><small>{status === "idle" ? "waiting for a brief" : status === "shaping" ? "assembling view" : "workspace ready"}</small></div><MiniDashboard config={config} status={status}/><AnimatePresence>{status === "ready" && config && <motion.div initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} className="open-workspace"><span>Plan saved locally</span><button onClick={() => router.push("/workspace")}>Open {config.name} <ArrowRight size={15}/></button></motion.div>}</AnimatePresence></div></div></motion.section>
    </section>
    <section className="operator-how" id="how"><div><span>01 / Brief</span><b>Say what you are trying to make happen.</b></div><ChevronRight/><div><span>02 / Plan</span><b>Watch the operator choose the right building blocks.</b></div><ChevronRight/><div><span>03 / Room</span><b>Open a workspace that starts with a point of view.</b></div></section>
    <footer className="operator-footer">ProjectOS V1 <span>·</span> local-demo workspace builder <span>·</span> no browser-stored credentials</footer>
  </main>;
}
