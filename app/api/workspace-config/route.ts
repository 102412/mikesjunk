import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateWorkspace, workspaceSchema } from "@/lib/workspace-schema";
import { defaultProjectModel, projectModelSchema } from "@/lib/project-models";

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

function deterministic(description: string, themePreference?: "dark" | "light") {
  return generateWorkspace({ description: workspaceDescription(description), themePreference });
}

export async function POST(request: NextRequest) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Describe the project in a little more detail." }, { status: 400 });
  const { description, themePreference, model = defaultProjectModel } = parsed.data;
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ config: deterministic(description, themePreference), mode: "deterministic" });
  const prompt = `Generate a JSON workspace plan for ProjectOS from this project description: ${description}\n\nOnly select approved module IDs supplied by the schema. Do not invent integrations, credentials, metrics, code, or permissions. Make the design genuinely fit the stated project. ${themePreference ? `The user explicitly prefers ${themePreference} mode.` : ""}`;
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, reasoning: { effort: "low" }, input: prompt, max_output_tokens: 700, text: { format: { type: "json_schema", name: "projectos_workspace_plan", strict: true, schema: workspacePlanSchema } } }),
    });
    if (!response.ok) throw new Error("Provider error");
    const output = await response.json() as { output_text?: string };
    if (!output.output_text) throw new Error("No structured output");
    const plan = JSON.parse(output.output_text);
    const config = workspaceSchema.parse({ ...plan, description: workspaceDescription(plan.description || description), id: `project-${Date.now()}`, permissions: { localDemo: true, github: false, ai: true }, createdAt: new Date().toISOString() });
    return NextResponse.json({ config, mode: "ai", model });
  } catch {
    return NextResponse.json({ config: deterministic(description, themePreference), mode: "deterministic" });
  }
}
