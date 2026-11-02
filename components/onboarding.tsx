"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Sparkles } from "lucide-react";
import { generateWorkspace } from "@/lib/workspace-schema";
import { emptyData, saveData, saveWorkspace } from "@/lib/storage";

type Message = { role: "assistant" | "user"; text: string };
const samples = [
  "I'm building a subscription-based SaaS using Next.js, Supabase, Stripe, GitHub, and Vercel. I want revenue metrics, deployment monitoring, customer activity, and an AI coding assistant.",
  "I build websites for small businesses. I want to manage clients, deadlines, repositories, project notes, and tasks. I prefer a light interface.",
  "I'm building an AI product. I need API monitoring, issue tracking, documentation, team communication shortcuts, and a technical operations dashboard.",
];

export function Onboarding() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", text: "What are you building? Include the tools you use and the work you need to see first." }]);
  const [input, setInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const submit = (value = input) => {
    const description = value.trim(); if (!description || processing) return;
    setMessages(current => [...current, { role: "user", text: description }]); setInput(""); setProcessing(true);
    window.setTimeout(() => {
      const workspace = generateWorkspace({ description });
      saveWorkspace(workspace); saveData(emptyData());
      setMessages(current => [...current, { role: "assistant", text: `I built a ${workspace.layout} workspace for ${workspace.name}. It prioritizes ${workspace.priorities.slice(0, 2).join(" and ")}. You can refine it any time in Settings.` }]);
      setProcessing(false); window.setTimeout(() => router.push("/workspace"), 700);
    }, 500);
  };
  return <div className="app-shell"><main className="page-wrap"><div className="page-heading"><div className="eyebrow">Workspace studio</div><h1>Start with a conversation.</h1><p className="muted">ProjectOS generates a validated, local-demo workspace from your description. No account or API key is required.</p></div><section className="conversation"><div className="conversation-log">{messages.map((message, index) => <div className={`message ${message.role}`} key={index}>{message.text}</div>)}{processing && <div className="message assistant"><Sparkles size={15} style={{ verticalAlign: "middle", marginRight: 7 }}/>Shaping your workspace…</div>}</div><div className="composer"><textarea aria-label="Describe your project" value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); } }} placeholder="I’m building…" /><button aria-label="Generate workspace" className="button" onClick={() => submit()} disabled={!input.trim() || processing}><ArrowUp size={17}/></button></div><div className="sample-row">{samples.map((sample, index) => <button className="sample" key={sample} onClick={() => submit(sample)}>Try example {String.fromCharCode(65 + index)}</button>)}</div></section></main></div>;
}
