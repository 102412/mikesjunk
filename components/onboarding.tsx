"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { emptyData, saveData, saveWorkspace } from "@/lib/storage";
import type { WorkspaceConfig } from "@/lib/workspace-schema";

const startingPoints = [
  { label: "Launch a product", detail: "Roadmap, releases, customer signals", prompt: "I’m launching a digital product. I need a simple home for release work, priorities, customer signals, product notes, and my code repository." },
  { label: "Run client work", detail: "Briefs, deadlines, delivery", prompt: "I run client projects and need to keep briefs, deadlines, deliverables, notes, source links, and repositories organized." },
  { label: "Run an AI product", detail: "Reliability, incidents, docs", prompt: "I’m building an AI product. I need to keep an eye on reliability, technical tasks, incidents, documentation, and the next experiments." },
];

export function Onboarding() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  const select = (label: string, prompt: string) => { setSelected(label); setDescription(prompt); setSummary(null); };
  const submit = async () => {
    const brief = description.trim(); if (!brief || processing) return;
    setProcessing(true); setSummary("Reading your brief and choosing a useful starting structure…");
    let workspace: WorkspaceConfig | undefined; let mode = "deterministic";
    try {
      const response = await fetch("/api/workspace-config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description: brief }) });
      const result = await response.json();
      if (response.ok) { workspace = result.config; mode = result.mode; }
    } catch { /* Local fallback keeps the builder available offline. */ }
    if (!workspace) { const { generateWorkspace } = await import("@/lib/workspace-schema"); workspace = generateWorkspace({ description: brief }); }
    saveWorkspace(workspace); saveData(emptyData());
    setSummary(`${workspace.name} is ready. It starts with ${workspace.priorities.slice(0, 2).join(" and ").toLowerCase()}. ${mode === "ai" ? "AI used your brief to shape this starting plan." : "You can tune it from Settings whenever you want."}`);
    window.setTimeout(() => router.push("/workspace"), 950);
  };

  return <main className="studio-page"><div className="studio-aura one"/><div className="studio-aura two"/><div className="page-wrap studio-wrap"><div className="studio-progress"><span className="progress-active">1</span><i/><span>2</span><i/><span>3</span><b>Describe · Shape · Work</b></div><section className="studio-layout"><div className="studio-copy"><div className="eyebrow">ProjectOS workspace studio</div><h1>What are you trying to make <em>happen?</em></h1><p>Don’t worry about dashboards or setup. Start with the result you want, and we’ll build a clear place to run that work.</p><div className="studio-reassurance"><CheckCircle2 size={17}/><span><b>Start simple.</b> You can add tasks, notes, and connections after your room is made.</span></div></div><section className="builder-card glass-card"><div className="builder-head"><div><span className="builder-step">STEP 1 OF 3</span><h2>Choose a starting point</h2></div><Sparkles size={19}/></div><div className="starting-points">{startingPoints.map((item) => <button className={`starting-point ${selected === item.label ? "selected" : ""}`} onClick={() => select(item.label, item.prompt)} key={item.label}><b>{item.label}</b><span>{item.detail}</span><i>→</i></button>)}</div><label className="builder-label" htmlFor="brief">Or tell us in your own words</label><textarea id="brief" value={description} onChange={(event) => { setDescription(event.target.value); setSelected(null); setSummary(null); }} placeholder="Example: I want a calm place to plan my first launch, keep the important links together, and know what I should do next."/><div className="builder-foot"><span>We’ll create a starting room, not make changes to any of your accounts.</span><button className="button button-glow" onClick={submit} disabled={!description.trim() || processing}>{processing ? "Shaping your room…" : "Create my workspace"}<ArrowRight size={16}/></button></div>{summary && <div className="builder-summary"><Sparkles size={15}/>{summary}</div>}</section></section></div></main>;
}
