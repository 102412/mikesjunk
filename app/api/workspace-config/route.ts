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

class ProviderPlanError extends Error {
  constructor(message: string, readonly status?: number, readonly retryable = false) {
    super(message);
  }
}

function providerMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "The provider returned an unreadable error.";
  const error = "error" in payload && payload.error && typeof payload.error === "object" ? payload.error as Record<string, unknown> : payload as Record<string, unknown>;
  return typeof error.message === "string" ? error.message.slice(0, 300) : "The provider returned an unreadable error.";
}

function publicFailure(status?: number) {
  if (status === 401) return "Kernova's AI credential was rejected. Check the deployment environment variable and redeploy.";
  if (status === 403) return "Kernova's AI credential is not permitted to use the selected model.";
  if (status === 429) return "The AI provider is temporarily rate-limited. Kernova will try again shortly.";
  return "Kernova could not complete that plan after retrying. Your current preview is unchanged.";
}

async function createWorkspacePlan(apiKey: string, model: string, prompt: string, description: string) {
  let failure: ProviderPlanError | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, reasoning: { effort: "low" }, input: prompt, max_output_tokens: 700, text: { format: { type: "json_schema", name: "kernova_workspace_plan", strict: true, schema: workspacePlanSchema } } }),
      });
      if (!response.ok) {
        const message = providerMessage(await response.json().catch(() => null));
        throw new ProviderPlanError(message, response.status, response.status === 429 || response.status >= 500);
      }
      const output = await response.json() as Parameters<typeof getResponseText>[0];
      const outputText = getResponseText(output);
      if (!outputText) throw new ProviderPlanError("The response did not contain structured output.", undefined, true);
      return normalizePlan(JSON.parse(outputText), description);
    } catch (reason) {
      failure = reason instanceof ProviderPlanError ? reason : new ProviderPlanError("The response could not be parsed as a workspace plan.", undefined, true);
      console.error("Kernova workspace build attempt failed", { attempt: attempt + 1, status: failure.status, message: failure.message });
      if (!failure.retryable || attempt === 1) break;
    }
  }
  throw failure ?? new ProviderPlanError("The workspace plan could not be created.");
}

export async function POST(request: NextRequest) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Describe the project in a little more detail." }, { status: 400 });
  const { description, themePreference, model = defaultProjectModel } = parsed.data;
  const apiKey = process.env.OPENAI_API_KEY ?? process.env.OPENAIAPI;
  if (!apiKey) return NextResponse.json({ error: "The AI builder is not configured on this deployment." }, { status: 503 });
  const prompt = `Generate a JSON workspace plan for Kernova from this project description: ${description}\n\nOnly select approved module IDs supplied by the schema. Do not invent integrations, credentials, metrics, code, or permissions. Make the design genuinely fit the stated project. Name the dashboard after the stated company, team, or work—not Kernova and not a generic product name. ${themePreference ? `The user explicitly prefers ${themePreference} mode.` : ""}`;
  try {
    const config = await createWorkspacePlan(apiKey, model, prompt, description);
    return NextResponse.json({ config, mode: "ai", model });
  } catch (reason) {
    const failure = reason instanceof ProviderPlanError ? reason : undefined;
    return NextResponse.json({ error: publicFailure(failure?.status), code: "AI_WORKSPACE_BUILD_FAILED", providerStatus: failure?.status }, { status: 502 });
  }
}
