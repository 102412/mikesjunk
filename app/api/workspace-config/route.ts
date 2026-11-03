import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { workspaceSchema } from "@/lib/workspace-schema";
import { defaultProjectModel, projectModelSchema } from "@/lib/project-models";
import { getResponseText } from "@/lib/openai-response";

const requestSchema = z.object({
  description: z.string().trim().min(12).max(1500),
  themePreference: z.enum(["dark", "light"]).optional(),
  model: projectModelSchema.optional(),
});

const workspacePlanSchema = {
  type: "object",
  additionalProperties: false,
  required: ["name", "description", "category", "theme", "accent", "stack", "teamSize", "priorities", "modules", "layout", "workflowRules"],
  properties: {
    name: { type: "string" }, description: { type: "string" }, category: { type: "string", enum: ["saas", "client", "ai", "general"] }, theme: { type: "string", enum: ["dark", "light"] }, accent: { type: "string", enum: ["violet", "blue", "amber"] }, stack: { type: "array", items: { type: "string" } }, teamSize: { type: "string" }, priorities: { type: "array", items: { type: "string" } }, modules: { type: "array", items: { type: "string", enum: ["overview", "tasks", "notes", "resources", "activity", "github", "metrics", "assistant"] } }, layout: { type: "string", enum: ["focus", "balanced", "operations"] }, workflowRules: { type: "array", items: { type: "string" } },
  },
};

function workspaceDescription(description: string) {
  return description.trim().slice(0, 500);
}

export async function POST(request: NextRequest) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Describe the project in a little more detail." }, { status: 400 });
  const { description, themePreference, model = defaultProjectModel } = parsed.data;
  const apiKey = process.env.OPENAI_API_KEY ?? process.env.OPENAIAPI;
  if (!apiKey) return NextResponse.json({ error: "The AI builder is not configured on this deployment." }, { status: 503 });
  const prompt = `Generate a JSON workspace plan for ProjectOS from this project description: ${description}\n\nOnly select approved module IDs supplied by the schema. Do not invent integrations, credentials, metrics, code, or permissions. Make the design genuinely fit the stated project. ${themePreference ? `The user explicitly prefers ${themePreference} mode.` : ""}`;
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, reasoning: { effort: "low" }, input: prompt, max_output_tokens: 700, text: { format: { type: "json_schema", name: "projectos_workspace_plan", strict: true, schema: workspacePlanSchema } } }),
    });
    if (!response.ok) return NextResponse.json({ error: "The AI builder could not produce a workspace plan.", providerStatus: response.status }, { status: 502 });
    const output = await response.json() as Parameters<typeof getResponseText>[0];
    const outputText = getResponseText(output);
    if (!outputText) throw new Error("No structured output");
    const plan = JSON.parse(outputText);
    const config = workspaceSchema.parse({ ...plan, description: workspaceDescription(plan.description || description), id: `project-${Date.now()}`, permissions: { localDemo: true, github: false, ai: true }, createdAt: new Date().toISOString() });
    return NextResponse.json({ config, mode: "ai", model });
  } catch {
    return NextResponse.json({ error: "The AI builder could not produce a valid workspace plan. No dashboard was created." }, { status: 502 });
  }
}
