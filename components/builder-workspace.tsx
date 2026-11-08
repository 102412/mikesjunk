"use client";

import { Bot, MessageCircle, Monitor, Smartphone, Tablet, CornerDownLeft, RefreshCw, Send, WandSparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { projectModels, type ProjectModel } from "@/lib/project-models";
import { emptyData, hasStoredWorkspace, readWorkspace, saveData, saveWorkspace } from "@/lib/storage";
import type { WorkspaceConfig } from "@/lib/workspace-schema";
import { Workspace } from "@/components/workspace";
import { ConnectorMenu, ConnectorSuggestion } from "@/components/connector-controls";
import { detectConnectorRequests, type ConnectorId } from "@/lib/connectors";

type EditorMode = "talk" | "ask" | "edit" | "rebuild";
type ChatMessage = { role: "assistant" | "user"; text: string; id: string };
type PreviewSize = "desktop" | "iphone" | "ipad";
type MobilePanel = "chat" | "preview";
const HISTORY_KEY = "kernova.builder-chat.v1";

export function BuilderWorkspace() {
  const router = useRouter();
  const [config, setConfig] = useState<WorkspaceConfig | null>(null);
  const [version, setVersion] = useState(0);
  const [model, setModel] = useState<ProjectModel>("gpt-6.1-sol");
  const [editorMode, setEditorMode] = useState<EditorMode>("ask");
  const [previewSize, setPreviewSize] = useState<PreviewSize>("desktop");
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("preview");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: "welcome", role: "assistant", text: "Your room is live. Talk through an idea, ask a question, request a focused edit, or choose a full rebuild." }]);
  const [plannedConnectors, setPlannedConnectors] = useState<ConnectorId[]>([]);
  const detectedConnectors = messages.filter(message => message.role === "user").flatMap(message => detectConnectorRequests(message.text)).filter((connector, index, all) => all.findIndex(item => item.id === connector.id) === index && !plannedConnectors.includes(connector.id));

  useEffect(() => {
    if (!hasStoredWorkspace()) { router.replace("/onboarding"); return; }
    setConfig(readWorkspace());
    try {
      const history = localStorage.getItem(HISTORY_KEY);
      if (history) setMessages(JSON.parse(history) as ChatMessage[]);
    } catch { /* keep the welcome conversation if local history is unavailable */ }
  }, [router]);

  useEffect(() => { localStorage.setItem(HISTORY_KEY, JSON.stringify(messages)); }, [messages]);

  const send = async () => {
    const request = input.trim();
    if (!config || !request || loading) return;
    setMessages(current => [...current, { id: crypto.randomUUID(), role: "user", text: request }]);
    setInput(""); setLoading(true);
    try {
      if (editorMode === "talk" || editorMode === "ask") {
        const response = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: request, model, workspace: { name: config.name, description: config.description, priorities: config.priorities, modules: config.modules } }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Editor unavailable");
        setMessages(current => [...current, { id: crypto.randomUUID(), role: "assistant", text: result.answer }]);
      } else {
        const description = (editorMode === "rebuild" ? request : `${config.description}\n\nRequested change: ${request}`).slice(0, 1500);
        const response = await fetch("/api/workspace-config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description, model }) });
        const result = await response.json();
        if (!response.ok || !result.config) throw new Error("Plan unavailable");
        saveWorkspace(result.config);
        if (editorMode === "rebuild") saveData(emptyData());
        setConfig(result.config); setVersion(current => current + 1);
        setMessages(current => [...current, { id: crypto.randomUUID(), role: "assistant", text: editorMode === "rebuild" ? "The room was rebuilt from the new brief. Local tasks and notes were reset." : "I applied that edit to the workspace plan. Your existing local tasks and notes remain in place." }]);
      }
    } catch {
      setMessages(current => [...current, { id: crypto.randomUUID(), role: "assistant", text: "The AI request did not complete. The existing dashboard is unchanged." }]);
    } finally { setLoading(false); }
  };

  return <main className={`builder-workspace-page mobile-panel-${mobilePanel}`}><div className="workspace-mobile-switch" role="tablist" aria-label="Chat and dashboard preview"><button type="button" role="tab" aria-selected={mobilePanel === "chat"} className={mobilePanel === "chat" ? "selected" : ""} onClick={() => setMobilePanel("chat")}><MessageCircle size={15}/> AI chat</button><button type="button" role="tab" aria-selected={mobilePanel === "preview"} className={mobilePanel === "preview" ? "selected" : ""} onClick={() => setMobilePanel("preview")}><Smartphone size={15}/> Dashboard</button></div><aside className="builder-editor"><header><div><span>KERNOVA / EDITOR</span><h1>Keep shaping it.</h1></div><div className="builder-head-actions"><ConnectorMenu onAdded={(connector) => setPlannedConnectors(current => current.includes(connector.id) ? current : [...current, connector.id])}/><Bot size={19}/></div></header><div className="model-picker" aria-label="Select editing model">{projectModels.map(option => <button className={model === option.id ? "selected" : ""} onClick={() => setModel(option.id)} key={option.id}><b>{option.name}</b><small>{option.short}</small></button>)}</div><div className="editor-modes">{([ ["talk", "Talk", MessageCircle], ["ask", "Ask", CornerDownLeft], ["edit", "Edit", WandSparkles], ["rebuild", "Rebuild", RefreshCw] ] as const).map(([id, label, Icon]) => <button className={editorMode === id ? "selected" : ""} key={id} onClick={() => setEditorMode(id)}><Icon size={13}/>{label}</button>)}</div><div className="editor-thread" aria-live="polite">{messages.map(message => <div className={message.role} key={message.id}>{message.text}</div>)}{detectedConnectors.map(connector => <ConnectorSuggestion key={connector.id} connectorId={connector.id} onAdded={(added) => setPlannedConnectors(current => current.includes(added.id) ? current : [...current, added.id])}/>)}{loading && <div className="assistant">Working with {projectModels.find(item => item.id === model)?.name}…</div>}</div><div className="editor-input"><label className="sr-only" htmlFor="workspace-request">Talk to the AI or request a workspace change</label><textarea id="workspace-request" value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }} placeholder={editorMode === "talk" ? "Talk through an idea or ask anything…" : editorMode === "ask" ? "Ask about this workspace…" : editorMode === "edit" ? "Describe the change you want…" : "Describe the workspace you want rebuilt…"}/><button className="button" onClick={send} disabled={!input.trim() || loading}><Send size={15}/> Send</button></div><Link className="editor-export-link" href="/export">Export this dashboard →</Link><p className="tiny">Chat history stays in this browser. A failed request never overwrites your current workspace.</p></aside><section className="builder-workspace-canvas"><div className="preview-toolbar"><div><span>LIVE PREVIEW</span><b>{config?.name ?? "Dashboard"}</b></div><div className="preview-size-switch" role="group" aria-label="Preview device size">{([ ["desktop", "Desktop", Monitor], ["iphone", "iPhone 16 Pro", Smartphone], ["ipad", "iPad", Tablet] ] as const).map(([id, label, Icon]) => <button type="button" key={id} className={previewSize === id ? "selected" : ""} onClick={() => setPreviewSize(id)} aria-pressed={previewSize === id}><Icon size={14}/><span>{label}</span></button>)}</div></div><div className={`preview-device preview-${previewSize}`}><div className="preview-device-screen">{previewSize === "iphone" && <span className="dynamic-island" aria-hidden="true"/>}{config ? <Workspace key={`${version}-${previewSize}`} embedded /> : <div className="builder-room-loading">Opening your workspace…</div>}</div></div></section></main>;
}
