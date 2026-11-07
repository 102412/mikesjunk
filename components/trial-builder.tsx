"use client";

import Link from "next/link";
import { Apple, ArrowRight, Check, Code2, Download, LoaderCircle, LockKeyhole, Moon, Send, Sparkles, Sun, WandSparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { defaultProjectModel } from "@/lib/project-models";
import { emptyData, saveData, saveWorkspace } from "@/lib/storage";
import type { WorkspaceConfig } from "@/lib/workspace-schema";

type Phase = "idea" | "building" | "ready" | "editing" | "error";

const buildSteps = ["Reading your request", "Choosing a practical dashboard structure", "Building the first decision view", "Making the preview usable"];

export function TrialBuilder() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [request, setRequest] = useState("");
  const [edit, setEdit] = useState("");
  const [phase, setPhase] = useState<Phase>("idea");
  const [config, setConfig] = useState<WorkspaceConfig | null>(null);
  const [step, setStep] = useState(0);
  const [edits, setEdits] = useState(0);
  const [authOpen, setAuthOpen] = useState(false);
  const [authNotice, setAuthNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = window.localStorage.getItem("kernova.builder-theme");
    if (stored === "dark" || stored === "light") setTheme(stored);
    if (new URLSearchParams(window.location.search).get("auth") === "export") setAuthOpen(true);
  }, []);

  const setBuilderTheme = (next: "light" | "dark") => {
    setTheme(next);
    window.localStorage.setItem("kernova.builder-theme", next);
  };

  const runBuild = async (description: string, isEdit = false) => {
    setPhase(isEdit ? "editing" : "building");
    setError("");
    setStep(0);
    const timers = buildSteps.map((_, index) => window.setTimeout(() => setStep(index), 580 * index));
    try {
      const response = await fetch("/api/workspace-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, model: defaultProjectModel, themePreference: theme }),
      });
      const result = await response.json();
      if (!response.ok || !result.config) throw new Error(result.error || "Kernova could not complete that build.");
      saveWorkspace(result.config);
      saveData(emptyData());
      setConfig(result.config);
      if (isEdit) setEdits(current => current + 1);
      setPhase("ready");
      setStep(buildSteps.length - 1);
      setEdit("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Kernova could not complete that build.");
      setPhase("error");
    } finally {
      timers.forEach(window.clearTimeout);
    }
  };

  const begin = () => {
    if (request.trim().length < 12) return;
    void runBuild(request.trim());
  };

  const submitEdit = () => {
    if (!edit.trim()) return;
    if (edits >= 3) { setAuthOpen(true); return; }
    const context = config ? `Original request: ${request}\nCurrent dashboard: ${config.name}. ${config.description}\nRequested change: ${edit.trim()}` : edit.trim();
    void runBuild(context, true);
  };

  const previewCards = useMemo(() => config?.modules.slice(0, 4) ?? ["schedule", "tasks", "notes", "activity"], [config]);

  return <main className={`trial-builder ${theme}`}>
    <header className="trial-nav">
      <Link href="/" className="trial-brand"><span className="logo-mark" aria-hidden="true"><img src="/kernova-logo.png" alt="" /></span><span>Kernova</span></Link>
      <div className="trial-nav-middle"><span className="trial-status"><i /> Trial builder</span><span>1 Sol build · {Math.max(0, 3 - edits)} edits left</span></div>
      <div className="trial-nav-actions"><button className="theme-toggle" type="button" onClick={() => setBuilderTheme(theme === "light" ? "dark" : "light")} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>{theme === "light" ? <Moon size={16} /> : <Sun size={16} />}</button><button className="trial-signin" type="button" onClick={() => setAuthOpen(true)}>Sign in <ArrowRight size={14} /></button></div>
    </header>

    <section className="trial-stage">
      <div className="trial-intro">
        <span className="trial-eyebrow"><Sparkles size={14} /> Start with the work</span>
        <h1>{phase === "idea" ? "Describe the dashboard your team needs." : config ? config.name : "Building your dashboard."}</h1>
        <p>{phase === "idea" ? "Try one full Sol build before making an account. Your preview stays in this browser until you choose to sign in." : "Watch the build take shape, then direct it with three included changes."}</p>
      </div>

      <div className="trial-grid">
        <section className="trial-console">
          <div className="trial-panel-head"><span><Code2 size={15} /> Builder conversation</span><small>GPT-6.1 Sol</small></div>
          {phase === "idea" ? <div className="trial-start"><div className="trial-prompt-orb"><Sparkles size={21} /></div><h2>What should this dashboard make easier?</h2><p>Use plain language. Mention the team, the work, and the decisions that need to happen faster.</p><textarea value={request} onChange={event => setRequest(event.target.value)} placeholder="Example: I run a lawn-care crew and need jobs, routes, client notes, estimates, and team availability in one place." aria-label="Describe the dashboard you want" /><button className="trial-primary" type="button" onClick={begin} disabled={request.trim().length < 12}>Build my dashboard <ArrowRight size={16} /></button><small className="trial-safe-note">No account required for this first build. Nothing is published or shared.</small></div> : <><div className="trial-activity" aria-live="polite">{buildSteps.map((item, index) => <div className={index <= step ? "complete" : ""} key={item}>{index < step || phase === "ready" ? <Check size={15} /> : index === step && (phase === "building" || phase === "editing") ? <LoaderCircle className="spin" size={15} /> : <i />}{item}</div>)}</div><div className="trial-code" aria-label="Current dashboard manifest"><span>dashboard.ts</span><pre>{config ? JSON.stringify({ name: config.name, layout: config.layout, modules: config.modules }, null, 2) : "Preparing dashboard…"}</pre></div>{phase === "error" && <div className="trial-error"><b>Build paused.</b><p>{error}</p><button className="trial-secondary" onClick={() => request && void runBuild(request)}>Try again</button></div>}<div className="trial-edit-zone"><div><span>Shape the next version</span><b>{edits}/3 trial changes used</b></div><textarea value={edit} onChange={event => setEdit(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submitEdit(); } }} placeholder={edits >= 3 ? "Your next change unlocks with a free account" : "e.g. Add a crew map, show overdue estimates first, and make it easier on a phone"} aria-label="Request a dashboard change" /><button className="trial-primary" type="button" onClick={submitEdit} disabled={!edit.trim() || phase === "building" || phase === "editing"}>{edits >= 3 ? <><LockKeyhole size={15} /> Create account to continue</> : <><WandSparkles size={15} /> Apply change</>}</button></div></>}
        </section>

        <section className="trial-preview">
          <div className="trial-panel-head"><span><span className="preview-dot" /> Live preview</span><button type="button" className="locked-export" onClick={() => setAuthOpen(true)}><Download size={14} /> Export <LockKeyhole size={12} /></button></div>
          {phase === "idea" || phase === "building" || phase === "editing" ? <div className="trial-skeleton" aria-label="Dashboard preview loading"><div className="skeleton-title" /><div className="skeleton-stats"><i /><i /><i /></div><div className="skeleton-board" /><div className="skeleton-lines"><i /><i /><i /></div></div> : config ? <div className="trial-dashboard"><div className="dashboard-preview-top"><div><small>LIVE WORKSPACE</small><h2>{config.name}</h2><p>{config.description}</p></div><span>Today</span></div><div className="dashboard-preview-stats"><article><small>Priority items</small><b>{config.priorities.length}</b><span>Ready to decide</span></article><article><small>Active views</small><b>{config.modules.length}</b><span>Built around your work</span></article></div><section className="dashboard-preview-list"><header><b>What needs attention</b><small>Live view</small></header>{config.priorities.slice(0, 3).map((priority, index) => <div key={priority}><i className={`priority-dot dot-${index}`} /><span>{priority}</span><small>{index === 0 ? "Now" : "Planned"}</small></div>)}</section><div className="dashboard-module-row">{previewCards.map(module => <span key={module}>{module}</span>)}</div></div> : <div className="trial-preview-error"><p>{error || "A dashboard preview will appear here."}</p></div>}
          <div className="export-callout"><LockKeyhole size={17} /><div><b>Export is ready when you are.</b><p>Sign in to save this dashboard, download it, or choose hosting.</p></div><button type="button" onClick={() => setAuthOpen(true)}>Sign in</button></div>
        </section>
      </div>
    </section>

    {authOpen && <div className="auth-backdrop" role="presentation" onMouseDown={() => setAuthOpen(false)}><section className="auth-sheet" role="dialog" aria-modal="true" aria-labelledby="auth-title" onMouseDown={event => event.stopPropagation()}><button className="auth-close" onClick={() => setAuthOpen(false)} aria-label="Close sign in">×</button><span className="trial-eyebrow"><LockKeyhole size={14} /> Save your work</span><h2 id="auth-title">Create an account to keep building.</h2><p>Sign in to save this dashboard to your workspace, unlock the next edit, export your files, or put it online.</p><div className="auth-options"><button type="button" onClick={() => setAuthNotice("Google sign-in will be enabled when the Supabase connection is added.")}><span className="oauth-google">G</span> Continue with Google</button><button type="button" onClick={() => setAuthNotice("Apple sign-in will be enabled when the Supabase connection is added.")}><Apple size={18} /> Continue with Apple</button><button type="button" onClick={() => setAuthNotice("Email sign-in will be enabled when the Supabase connection is added.")}>Continue with email <ArrowRight size={16} /></button></div>{authNotice && <p className="auth-connection-note" role="status">{authNotice}</p>}<p className="auth-legal">By continuing, you agree to Kernova&apos;s <Link href="/legal/terms">Terms of Use</Link> and <Link href="/legal/privacy">Privacy Policy</Link>. When account services are enabled, account and workspace data will be processed through Supabase in accordance with <a href="https://supabase.com/terms" target="_blank" rel="noreferrer">Supabase&apos;s Terms</a> and <a href="https://supabase.com/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>.</p></section></div>}
  </main>;
}
