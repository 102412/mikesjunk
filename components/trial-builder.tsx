"use client";

import Link from "next/link";
import { Apple, ArrowRight, Check, Code2, Download, LoaderCircle, LockKeyhole, Moon, Send, Sparkles, Sun, WandSparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { defaultProjectModel } from "@/lib/project-models";
import { emptyData, saveData, saveWorkspace } from "@/lib/storage";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { WorkspaceConfig } from "@/lib/workspace-schema";

type Phase = "idea" | "building" | "ready" | "editing" | "error";
type BuildOperation = { description: string; isEdit: boolean };
type ProviderState = { configured: boolean; google: boolean; apple: boolean };
type AccountSummary = {
  profile: { tier: string; billing_status: string };
  entitlements: { dashboard_limit: number | null; monthly_build_limit: number | null; monthly_edit_limit: number | null; per_dashboard_edit_limit: number | null; hosted_dashboard_limit: number | null; seats_limit: number | null; integration_limit: number | null };
  credits: { build_credits: number; edit_credits: number; export_credits: number };
};

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
  const [authLoading, setAuthLoading] = useState<"google" | "email" | null>(null);
  const [email, setEmail] = useState("");
  const [emailOpen, setEmailOpen] = useState(false);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [providers, setProviders] = useState<ProviderState | null>(null);
  const [account, setAccount] = useState<AccountSummary | null>(null);
  const [accountNotice, setAccountNotice] = useState("");
  const [dashboardId, setDashboardId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [lastOperation, setLastOperation] = useState<BuildOperation | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem("kernova.builder-theme");
    if (stored === "dark" || stored === "light") setTheme(stored);
    if (new URLSearchParams(window.location.search).get("auth") === "export") setAuthOpen(true);
  }, []);

  const loadAccount = async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { data, error: summaryError } = await supabase.rpc("get_account_summary");
    if (summaryError || !data) {
      setAccount(null);
      return;
    }
    setAccount(data as AccountSummary);
    setAccountNotice("");
  };

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }) => {
      setAccountEmail(data.user?.email ?? null);
      if (data.user) void loadAccount();
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAccountEmail(session?.user.email ?? null);
      if (session?.user) void loadAccount();
      else { setAccount(null); setDashboardId(null); }
    });
    return () => listener.subscription.unsubscribe();
  }, []); // The auth subscription is deliberately created once per mounted builder.

  useEffect(() => {
    void fetch("/api/auth/providers", { cache: "no-store" })
      .then(response => response.ok ? response.json() as Promise<ProviderState> : null)
      .then(setProviders)
      .catch(() => setProviders({ configured: false, google: false, apple: false }));
  }, []);

  const setBuilderTheme = (next: "light" | "dark") => {
    setTheme(next);
    window.localStorage.setItem("kernova.builder-theme", next);
  };

  const saveToAccount = async (nextConfig: WorkspaceConfig, description: string, isEdit: boolean) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !accountEmail) return;
    const result = isEdit && dashboardId
      ? await supabase.rpc("record_dashboard_edit", { p_dashboard_id: dashboardId, p_request: description, p_workspace_config: nextConfig })
      : await supabase.rpc("create_dashboard_from_build", { p_title: nextConfig.name, p_prompt: request, p_workspace_config: nextConfig });
    if (result.error) {
      setAccountNotice("Your preview is saved in this browser. Run the Kernova account SQL to turn on cloud saving and usage limits.");
      return;
    }
    const resultData = result.data as { dashboard_id?: string } | null;
    if (resultData?.dashboard_id) setDashboardId(resultData.dashboard_id);
    await loadAccount();
  };

  const runBuild = async (description: string, isEdit = false) => {
    setLastOperation({ description, isEdit });
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
      void saveToAccount(result.config as WorkspaceConfig, description, isEdit);
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

  const callbackUrl = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent("/builder?auth=complete")}`;
  const startOAuth = async () => {
    if (providers && !providers.google) { setAuthNotice("Google sign-in is not enabled in Kernova's Supabase project yet."); return; }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) { setAuthNotice("Supabase is not configured for this deployment yet."); return; }
    setAuthLoading("google"); setAuthNotice("");
    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: callbackUrl() } });
    if (oauthError || !data.url) { setAuthLoading(null); setAuthNotice(oauthError?.message || "The sign-in provider did not return a redirect."); return; }
    window.location.assign(data.url);
  };

  const startMagicLink = async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) { setAuthNotice("Supabase is not configured for this deployment yet."); return; }
    if (!email.trim()) { setAuthNotice("Enter an email address to receive a sign-in link."); return; }
    setAuthLoading("email"); setAuthNotice("");
    const { error: emailError } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: callbackUrl() } });
    setAuthLoading(null);
    setAuthNotice(emailError ? emailError.message : "Check your inbox for a secure sign-in link.");
  };

  const previewCards = useMemo(() => config?.modules.slice(0, 4) ?? ["schedule", "tasks", "notes", "activity"], [config]);

  return <main className={`trial-builder ${theme}`}>
    <header className="trial-nav">
      <Link href="/" className="trial-brand"><span className="logo-mark" aria-hidden="true"><img src="/kernova-logo.png" alt="" /></span><span>Kernova</span></Link>
      <div className="trial-nav-middle"><span className="trial-status"><i /> {account ? `${account.profile.tier} account` : "Trial builder"}</span><span>{account ? `${account.credits.build_credits} build credits · ${account.credits.edit_credits} edit credits` : `1 Sol build · ${Math.max(0, 3 - edits)} edits left`}</span></div>
      <div className="trial-nav-actions"><button className="theme-toggle" type="button" onClick={() => setBuilderTheme(theme === "light" ? "dark" : "light")} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>{theme === "light" ? <Moon size={16} /> : <Sun size={16} />}</button><button className="trial-signin" type="button" onClick={() => setAuthOpen(true)}>{accountEmail ? "Account" : "Sign in"} <ArrowRight size={14} /></button></div>
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
          {phase === "idea" ? <div className="trial-start"><div className="trial-prompt-orb"><Sparkles size={21} /></div><h2>What should this dashboard make easier?</h2><p>Use plain language. Mention the team, the work, and the decisions that need to happen faster.</p><textarea value={request} onChange={event => setRequest(event.target.value)} placeholder="Example: I run a lawn-care crew and need jobs, routes, client notes, estimates, and team availability in one place." aria-label="Describe the dashboard you want" /><button className="trial-primary" type="button" onClick={begin} disabled={request.trim().length < 12}>Build my dashboard <ArrowRight size={16} /></button><small className="trial-safe-note">No account required for this first build. Nothing is published or shared.</small></div> : <><div className="trial-activity" aria-live="polite">{buildSteps.map((item, index) => <div className={index <= step ? "complete" : ""} key={item}>{index < step || phase === "ready" ? <Check size={15} /> : index === step && (phase === "building" || phase === "editing") ? <LoaderCircle className="spin" size={15} /> : <i />}{item}</div>)}</div><div className="trial-code" aria-label="Current dashboard manifest"><span>dashboard.ts</span><pre>{config ? JSON.stringify({ name: config.name, layout: config.layout, modules: config.modules }, null, 2) : "Preparing dashboard…"}</pre></div>{phase === "error" && <div className="trial-error"><b>Build paused. Your current preview is unchanged.</b><p>{error}</p><button className="trial-secondary" onClick={() => lastOperation && void runBuild(lastOperation.description, lastOperation.isEdit)} disabled={!lastOperation}>Try the same request again</button></div>}<div className="trial-edit-zone"><div><span>Shape the next version</span><b>{edits}/3 trial changes used</b></div><textarea value={edit} onChange={event => setEdit(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submitEdit(); } }} placeholder={edits >= 3 ? "Your next change unlocks with a free account" : "e.g. Add a crew map, show overdue estimates first, and make it easier on a phone"} aria-label="Request a dashboard change" /><button className="trial-primary" type="button" onClick={submitEdit} disabled={!edit.trim() || phase === "building" || phase === "editing"}>{edits >= 3 ? <><LockKeyhole size={15} /> Create account to continue</> : <><WandSparkles size={15} /> Apply change</>}</button></div></>}
        </section>

        <section className="trial-preview">
          <div className="trial-panel-head"><span><span className="preview-dot" /> Live preview</span><button type="button" className="locked-export" onClick={() => setAuthOpen(true)}><Download size={14} /> Export <LockKeyhole size={12} /></button></div>
          {phase === "idea" || phase === "building" || phase === "editing" ? <div className="trial-skeleton" aria-label="Dashboard preview loading"><div className="skeleton-title" /><div className="skeleton-stats"><i /><i /><i /></div><div className="skeleton-board" /><div className="skeleton-lines"><i /><i /><i /></div></div> : config ? <div className="trial-dashboard"><div className="dashboard-preview-top"><div><small>LIVE WORKSPACE</small><h2>{config.name}</h2><p>{config.description}</p></div><span>Today</span></div><div className="dashboard-preview-stats"><article><small>Priority items</small><b>{config.priorities.length}</b><span>Ready to decide</span></article><article><small>Active views</small><b>{config.modules.length}</b><span>Built around your work</span></article></div><section className="dashboard-preview-list"><header><b>What needs attention</b><small>Live view</small></header>{config.priorities.slice(0, 3).map((priority, index) => <div key={priority}><i className={`priority-dot dot-${index}`} /><span>{priority}</span><small>{index === 0 ? "Now" : "Planned"}</small></div>)}</section><div className="dashboard-module-row">{previewCards.map(module => <span key={module}>{module}</span>)}</div></div> : <div className="trial-preview-error"><p>{error || "A dashboard preview will appear here."}</p></div>}
          <div className="export-callout"><LockKeyhole size={17} /><div><b>Export is ready when you are.</b><p>Sign in to save this dashboard, download it, or choose hosting.</p></div><button type="button" onClick={() => setAuthOpen(true)}>Sign in</button></div>
        </section>
      </div>
    </section>

    {authOpen && <div className="auth-backdrop" role="presentation" onMouseDown={() => setAuthOpen(false)}><section className="auth-sheet" role="dialog" aria-modal="true" aria-labelledby="auth-title" onMouseDown={event => event.stopPropagation()}><button className="auth-close" onClick={() => setAuthOpen(false)} aria-label="Close sign in">×</button><span className="trial-eyebrow"><LockKeyhole size={14} /> Save your work</span><h2 id="auth-title">{accountEmail ? "Your Kernova account." : "Create an account to keep building."}</h2><p>{accountEmail ? `Signed in as ${accountEmail}. Your plan, dashboard, and usage are kept in your private workspace.` : "Sign in to save this dashboard to your workspace, unlock the next edit, export your files, or put it online."}</p>{account && <div className="account-summary"><span>{account.profile.tier}</span><div><b>{account.credits.build_credits} build credits</b><small>{account.credits.edit_credits} edit credits · {account.entitlements.seats_limit} seat{account.entitlements.seats_limit === 1 ? "" : "s"}</small></div></div>}{!accountEmail && <div className="auth-options"><button type="button" onClick={() => void startOAuth()} disabled={authLoading !== null || providers?.google === false}><span className="oauth-google">G</span>{authLoading === "google" ? "Connecting to Google…" : providers?.google === false ? "Google setup pending" : "Continue with Google"}</button><button className="apple-coming" type="button" disabled aria-label="Apple sign-in is coming in a later update"><Apple size={18} fill="currentColor" />Continue with Apple · coming later</button><button type="button" onClick={() => setEmailOpen(current => !current)} disabled={authLoading !== null}>Continue with email <ArrowRight size={16} /></button>{emailOpen && <div className="auth-email"><input value={email} onChange={event => setEmail(event.target.value)} type="email" autoComplete="email" placeholder="you@company.com" aria-label="Email address"/><button type="button" onClick={() => void startMagicLink()} disabled={authLoading === "email"}>{authLoading === "email" ? "Sending…" : "Send sign-in link"}</button></div>}</div>}{providers?.configured === false && <p className="auth-connection-note" role="status">Supabase configuration is not available for this deployment yet.</p>}{authNotice && <p className="auth-connection-note" role="status">{authNotice}</p>}{accountNotice && <p className="auth-connection-note" role="status">{accountNotice}</p>}<p className="auth-legal">By continuing, you agree to Kernova&apos;s <Link href="/legal/terms">Terms of Use</Link> and <Link href="/legal/privacy">Privacy Policy</Link>. Account and workspace data are processed through Supabase in accordance with <a href="https://supabase.com/terms" target="_blank" rel="noreferrer">Supabase&apos;s Terms</a> and <a href="https://supabase.com/privacy" target="_blank" rel="noreferrer">Supabase&apos;s Privacy Policy</a>.</p></section></div>}
  </main>;
}
