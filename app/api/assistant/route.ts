import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { defaultProjectModel, projectModelSchema } from "@/lib/project-models";

const requestSchema = z.object({ question: z.string().trim().min(1).max(1000), model: projectModelSchema.optional(), workspace: z.object({ name: z.string().max(100), description: z.string().max(700), priorities: z.array(z.string().max(100)).max(8), modules: z.array(z.string().max(30)).max(8) }) });

export async function POST(request: NextRequest) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid assistant request." }, { status: 400 });
  const { question, workspace, model = defaultProjectModel } = parsed.data;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "The AI editor is not configured on this deployment." }, { status: 503 });
  try {
    const prompt = `You are ProjectOS, a concise project-aware assistant. You may advise only; do not claim access to repositories, deployments, or external accounts. Project: ${workspace.name}. Description: ${workspace.description}. Priorities: ${workspace.priorities.join(", ")}. Enabled modules: ${workspace.modules.join(", ")}. Question: ${question}`;
    const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, reasoning: { effort: "low" }, input: prompt, max_output_tokens: 350 }) });
    if (!response.ok) throw new Error("Provider error");
    const output = await response.json() as { output_text?: string };
    if (!output.output_text) throw new Error("No provider output");
    return NextResponse.json({ answer: output.output_text, mode: "provider", model });
  } catch { return NextResponse.json({ error: "The AI editor could not answer this request. Your dashboard is unchanged." }, { status: 502 }); }
}
