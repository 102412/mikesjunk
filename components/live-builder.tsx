"use client";

import { Check, Code2, LoaderCircle, PanelTop, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { readBuilderSession, scopedDescription } from "@/lib/builder-session";
import { emptyData, saveData, saveWorkspace } from "@/lib/storage";
import type { WorkspaceConfig } from "@/lib/workspace-schema";
import { defaultProjectModel } from "@/lib/project-models";

const activity = ["Reading the scoped brief", "Choosing approved workspace modules", "Arranging the first decision view", "Saving the local workspace plan"];

export function LiveBuilder() {
  const router = useRouter();
  const [config, setConfig] = useState<WorkspaceConfig | null>(null);
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const session = readBuilderSession();
    if (!session) { router.replace("/builder"); return; }
    let alive = true;
    const timerIds = activity.map((_, index) => window.setTimeout(() => alive && setStep(index), 430 * index));
    const build = async () => {
      try {
        const response = await fetch("/api/workspace-config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description: scopedDescription(session), model: defaultProjectModel }) });
        const result = await response.json();
        if (!response.ok || !result.config) throw new Error("Build failed");
        window.setTimeout(() => {
          if (!alive) return;
          saveWorkspace(result.config); saveData(emptyData()); setConfig(result.config); setStep(activity.length - 1); setMode("ready");
        }, 1450);
      } catch { if (alive) setMode("error"); }
    };
    build();
    return () => { alive = false; timerIds.forEach(window.clearTimeout); };
  }, [router]);

  const code = useMemo(() => config ? JSON.stringify({ name: config.name, layout: config.layout, modules: config.modules, priorities: config.priorities }, null, 2).split("\n") : ["{", "  \"workspace\": \"planning…\",", "  \"modules\": [\"…\"],", "  \"layout\": \"…\"", "}"], [config]);
  return <main className="builder-flow live-builder"><header className="builder-live-head"><div><span>PROJECTOS / LIVE BUILD</span><h1>{mode === "ready" ? "Your room is ready." : "Building your first room."}</h1></div><div className={`build-state ${mode}`}><i/>{mode === "ready" ? "Ready to use" : mode === "error" ? "Build needs a retry" : "Builder active"}</div></header><section className="live-builder-grid"><div className="build-console glass-card"><div className="console-head"><span><Code2 size={15}/> Workspace manifest</span><small>{mode === "ready" ? "validated" : "planning"}</small></div><pre>{code.map((line, index) => <code key={`${line}-${index}`}><em>{String(index + 1).padStart(2, "0")}</em>{line}</code>)}</pre><div className="activity-log">{activity.map((item, index) => <div className={index <= step ? "active" : ""} key={item}>{index < step || mode === "ready" ? <Check size={14}/> : index === step && mode === "loading" ? <LoaderCircle className="spin" size={14}/> : <span/>}{item}</div>)}</div></div><div className="build-preview-shell glass-card"><div className="console-head"><span><PanelTop size={15}/> Live preview</span><small>{mode === "ready" ? "interactive next" : "skeleton until plan is valid"}</small></div>{mode === "ready" && config ? <div className="builder-preview-ready"><span className="preview-project-icon">P</span><div><small>{config.category} workspace</small><h2>{config.name}</h2><p>{config.priorities.slice(0, 2).join(" · ")}</p></div><div className="preview-modules">{config.modules.slice(0, 4).map(module => <span key={module}>{module}</span>)}</div></div> : <div className="builder-skeleton" aria-label="Workspace preview is being prepared"><div/><div/><section/><section/><section/></div>}{mode === "ready" && config && <button className="button open-live-room" onClick={() => router.push("/builder/workspace")}>Open the live room <Sparkles size={15}/></button>}{mode === "error" && <button className="button" onClick={() => window.location.reload()}>Retry build</button>}</div></section></main>;
}
