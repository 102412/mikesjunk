import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateWorkspace, moduleIdSchema, workspaceSchema } from "@/lib/workspace-schema";
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

function strings(value: unknown, max: number) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map(item => item.trim()).slice(0, max) : [];
}

function normalizePlan(plan: unknown, description: string) {
  const source = plan && typeof plan === "object" ? plan as Record<string, unknown> : {};
  const base = generateWorkspace({ description });
  const modules = strings(source.modules, 8).filter(module => moduleIdSchema.safeParse(module).success);
  const priorities = strings(source.priorities, 8);
  const stack = strings(source.stack, 12);
  const rules = strings(source.workflowRules, 6);
  return workspaceSchema.parse({
    ...base,
    id: `project-${Date.now()}`,
    name: typeof source.name === "string" && source.name.trim() ? source.name.trim().slice(0, 80) : base.name,
    description: workspaceDescription(typeof source.description === "string" && source.description.trim() ? source.description : description),
    category: source.category === "saas" || source.category === "client" || source.category === "ai" || source.category === "general" ? source.category : base.category,
    theme: source.theme === "dark" || source.theme === "light" ? source.theme : base.theme,
    accent: source.accent === "violet" || source.accent === "blue" || source.accent === "amber" ? source.accent : base.accent,
    stack: stack.length ? stack : base.stack,
    teamSize: typeof source.teamSize === "string" && source.teamSize.trim() ? source.teamSize.trim().slice(0, 80) : base.teamSize,
    priorities: priorities.length ? priorities : base.priorities,
    modules: modules.length >= 3 ? modules : base.modules,
    layout: source.layout === "focus" || source.layout === "balanced" || source.layout === "operations" ? source.layout : base.layout,
    workflowRules: rules.length ? rules : base.workflowRules,
    permissions: { localDemo: true, github: false, ai: true },
    createdAt: new Date().toISOString(),
  });
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
    const config = normalizePlan(JSON.parse(outputText), description);
    return NextResponse.json({ config, mode: "ai", model });
  } catch {
    return NextResponse.json({ error: "The AI builder could not produce a valid workspace plan. No dashboard was created." }, { status: 502 });
  }
}
