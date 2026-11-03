"use client";

import { Bot, CornerDownLeft, RefreshCw, Send, WandSparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { projectModels, type ProjectModel } from "@/lib/project-models";
import { emptyData, hasStoredWorkspace, readWorkspace, saveData, saveWorkspace } from "@/lib/storage";
import type { WorkspaceConfig } from "@/lib/workspace-schema";
import { Workspace } from "@/components/workspace";

type EditorMode = "ask" | "edit" | "rebuild";
type ChatMessage = { role: "assistant" | "user"; text: string };

export function BuilderWorkspace() {
  const router = useRouter();
  const [config, setConfig] = useState<WorkspaceConfig | null>(null);
  const [version, setVersion] = useState(0);
  const [model, setModel] = useState<ProjectModel>("gpt-6.1-sol");
  const [editorMode, setEditorMode] = useState<EditorMode>("ask");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", text: "Your room is live. Ask a question, request a focused edit, or choose a full rebuild when the starting structure needs to change." }]);

  useEffect(() => {
    if (!hasStoredWorkspace()) { router.replace("/onboarding"); return; }
    setConfig(readWorkspace());
  }, [router]);

  const send = async () => {
    const request = input.trim();
    if (!config || !request || loading) return;
    setMessages(current => [...current, { role: "user", text: request }]);
    setInput(""); setLoading(true);
    try {
      if (editorMode === "ask") {
        const response = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: request, model, workspace: { name: config.name, description: config.description, priorities: config.priorities, modules: config.modules } }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Editor unavailable");
        setMessages(current => [...current, { role: "assistant", text: result.answer }]);
      } else {
        const description = (editorMode === "rebuild" ? request : `${config.description}\n\nRequested change: ${request}`).slice(0, 1500);
        const response = await fetch("/api/workspace-config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description, model }) });
        const result = await response.json();
        if (!response.ok || !result.config) throw new Error("Plan unavailable");
        saveWorkspace(result.config);
        if (editorMode === "rebuild") saveData(emptyData());
        setConfig(result.config); setVersion(current => current + 1);
        setMessages(current => [...current, { role: "assistant", text: editorMode === "rebuild" ? "The room was rebuilt from the new brief. Local tasks and notes were reset." : "I applied that edit to the workspace plan. Your existing local tasks and notes remain in place." }]);
      }
    } catch {
      setMessages(current => [...current, { role: "assistant", text: "The AI request did not complete. The existing dashboard is unchanged." }]);
    } finally { setLoading(false); }
  };

  return <main className="builder-workspace-page"><section className="builder-workspace-canvas">{config ? <Workspace key={version} embedded /> : <div className="builder-room-loading">Opening your live room…</div>}</section><aside className="builder-editor glass-card"><header><div><span>PROJECTOS / EDITOR</span><h1>Keep shaping it.</h1></div><Bot size={19}/></header><div className="model-picker" aria-label="Select editing model">{projectModels.map(option => <button className={model === option.id ? "selected" : ""} onClick={() => setModel(option.id)} key={option.id}><b>{option.name}</b><small>{option.short}</small></button>)}</div><div className="editor-modes">{([ ["ask", "Ask", CornerDownLeft], ["edit", "Edit", WandSparkles], ["rebuild", "Rebuild", RefreshCw] ] as const).map(([id, label, Icon]) => <button className={editorMode === id ? "selected" : ""} key={id} onClick={() => setEditorMode(id)}><Icon size={13}/>{label}</button>)}</div><div className="editor-thread" aria-live="polite">{messages.map((message, index) => <div className={message.role} key={`${message.text}-${index}`}>{message.text}</div>)}{loading && <div className="assistant">Working with {projectModels.find(item => item.id === model)?.name}…</div>}</div><div className="editor-input"><textarea value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }} placeholder={editorMode === "ask" ? "Ask about this room" : editorMode === "edit" ? "Describe the change you want" : "Describe the room you want rebuilt"}/><button className="button" onClick={send} disabled={!input.trim() || loading}><Send size={15}/> Send</button></div><Link className="editor-export-link" href="/export">Export this dashboard →</Link><p className="tiny">Model requests stay server-side. If the selected model cannot respond, the dashboard is left unchanged.</p></aside></main>;
}
