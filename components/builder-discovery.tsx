"use client";

import { ArrowRight, Bot, Check, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveBuilderSession } from "@/lib/builder-session";

const questions = [
  "Who needs to use this workspace on a normal day?",
  "What decision should become easier the moment they open it?",
  "What information must be visible in the first minute?",
  "Which tools, links, or routines should it keep organized?",
];

type Message = { role: "assistant" | "user"; text: string };

export function BuilderDiscovery() {
  const router = useRouter();
  const [brief, setBrief] = useState("");
  const [answers, setAnswers] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [started, setStarted] = useState(false);

  const messages: Message[] = started
    ? [
        { role: "assistant", text: "Good starting point. I’ll ask four focused questions so the workspace has a real point of view." },
        ...answers.flatMap((answer, index) => [{ role: "assistant" as const, text: questions[index] }, { role: "user" as const, text: answer }]),
        ...(answers.length < questions.length ? [{ role: "assistant" as const, text: questions[answers.length] }] : [{ role: "assistant" as const, text: "Scope is clear. When you’re ready, I’ll assemble the first working room." }]),
      ]
    : [{ role: "assistant", text: "Tell me what you’re trying to make happen. I’ll help turn the idea into a working project room." }];

  const start = () => {
    if (brief.trim().length < 12) return;
    setStarted(true);
    setInput("");
  };

  const answer = () => {
    if (!input.trim() || answers.length >= questions.length) return;
    setAnswers(current => [...current, input.trim()]);
    setInput("");
  };

  const go = () => {
    saveBuilderSession({ brief: brief.trim(), answers, createdAt: new Date().toISOString() });
    router.push("/builder/live");
  };

  return <main className="builder-flow"><section className="builder-discovery-shell"><header className="builder-flow-head"><div><span>KERNOVA / DISCOVERY</span><h1>Give the builder the real work.</h1><p>Plain language is enough. A few focused questions turn it into a dashboard with a point of view.</p></div><div className="builder-stage"><Bot size={16}/> AI scope</div></header><div className="discovery-thread" aria-live="polite">{messages.map((message, index) => <div className={`discovery-message ${message.role}`} key={`${message.text}-${index}`}><span>{message.role === "assistant" ? "K" : "You"}</span><p>{message.text}</p></div>)}</div>{!started ? <div className="discovery-composer"><label className="sr-only" htmlFor="project-brief">Describe your project</label><textarea id="project-brief" value={brief} onChange={event => setBrief(event.target.value)} placeholder="Example: I’m running a product launch and need a clear place for the roadmap, customer feedback, launch tasks, and release decisions…" aria-label="Describe your project"/><button className="button" onClick={start} disabled={brief.trim().length < 12}>Start scoping <ArrowRight size={15}/></button></div> : answers.length < questions.length ? <div className="discovery-composer compact"><label className="sr-only" htmlFor="scope-answer">Answer this question</label><input id="scope-answer" autoFocus value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => event.key === "Enter" && answer()} placeholder="Answer in your own words…" aria-label={`Answer question ${answers.length + 1}`}/><button className="button" onClick={answer} disabled={!input.trim()}><Send size={15}/> Continue</button></div> : <div className="builder-go-time"><div><Check size={17}/><span><b>Scope complete.</b> Kernova will build a focused first version from this brief.</span></div><button className="button" onClick={go}>It’s go time <ArrowRight size={16}/></button></div>}</section></main>;
}
