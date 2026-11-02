import { z } from "zod";

export const moduleIdSchema = z.enum([
  "overview",
  "tasks",
  "notes",
  "resources",
  "activity",
  "github",
  "metrics",
  "assistant",
]);

export type ModuleId = z.infer<typeof moduleIdSchema>;

export const workspaceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  description: z.string().max(500),
  category: z.enum(["saas", "client", "ai", "general"]),
  theme: z.enum(["dark", "light"]),
  accent: z.enum(["violet", "blue", "amber"]),
  stack: z.array(z.string().min(1)).max(12),
  teamSize: z.string(),
  priorities: z.array(z.string()).max(8),
  modules: z.array(moduleIdSchema).min(3).max(8),
  layout: z.enum(["focus", "balanced", "operations"]),
  permissions: z.object({
    localDemo: z.literal(true),
    github: z.boolean(),
    ai: z.boolean(),
  }),
  workflowRules: z.array(z.string()).max(6),
  createdAt: z.string(),
});

export type WorkspaceConfig = z.infer<typeof workspaceSchema>;

export type GeneratorInput = {
  description: string;
  name?: string;
  themePreference?: "dark" | "light";
};

const includes = (value: string, terms: string[]) => terms.some((term) => value.includes(term));

function nameFromDescription(description: string) {
  const quoted = description.match(/["']([^"']{2,60})["']/)?.[1];
  const named = description.match(/(?:called|named)\s+([A-Z][\w-]{2,40})/i)?.[1];
  return quoted || named || "My project";
}

function stackFromDescription(value: string) {
  const options: [string, string[]][] = [
    ["Next.js", ["next.js", "nextjs"]],
    ["Supabase", ["supabase"]],
    ["Stripe", ["stripe"]],
    ["GitHub", ["github", "repository", "repositories"]],
    ["Vercel", ["vercel"]],
    ["OpenAI", ["openai", "llm", "ai product"]],
    ["Postgres", ["postgres", "database"]],
  ];
  const found = options.filter(([, terms]) => includes(value, terms)).map(([name]) => name);
  return found.length ? found : ["Web app"];
}

/** A deliberately closed generator: it only emits values the schema and module registry permit. */
export function generateWorkspace(input: GeneratorInput): WorkspaceConfig {
  const text = input.description.toLowerCase();
  const isClient = includes(text, ["freelance", "client", "small business", "deadline"]);
  const isAi = !isClient && includes(text, ["ai product", "api monitoring", "incident", "operations", "technical operations"]);
  const category = isClient ? "client" : isAi ? "ai" : includes(text, ["saas", "subscription", "revenue"]) ? "saas" : "general";
  const theme = input.themePreference || (includes(text, ["light interface", "light mode", "light theme"]) ? "light" : "dark");
  const profile = {
    saas: {
      modules: ["overview", "metrics", "github", "tasks", "assistant", "activity"],
      priorities: ["Deploy confidence", "Revenue signals", "Customer activity"],
      layout: "operations",
      accent: "violet",
      rules: ["Review release health before deploy", "Triages are visible to the team"],
    },
    client: {
      modules: ["overview", "tasks", "notes", "resources", "github", "activity"],
      priorities: ["Client deadlines", "Clear notes", "Delivery momentum"],
      layout: "balanced",
      accent: "amber",
      rules: ["Keep client context in project notes", "Confirm completed work before closing tasks"],
    },
    ai: {
      modules: ["overview", "metrics", "tasks", "notes", "assistant", "activity"],
      priorities: ["API reliability", "Incident readiness", "Documentation"],
      layout: "operations",
      accent: "blue",
      rules: ["Record incidents as activity", "Document operational decisions"],
    },
    general: {
      modules: ["overview", "tasks", "notes", "resources", "assistant", "activity"],
      priorities: ["Project clarity", "Focused execution", "Shared context"],
      layout: "focus",
      accent: "violet",
      rules: ["Capture decisions in notes", "Keep next actions visible"],
    },
  } as const;
  const selection = profile[category];
  const config = {
    id: `project-${Date.now()}`,
    name: input.name?.trim() || nameFromDescription(input.description),
    description: input.description.trim(),
    category,
    theme,
    accent: selection.accent,
    stack: stackFromDescription(text),
    teamSize: includes(text, ["team", "we ", "startup"]) ? "Team" : "Solo",
    priorities: selection.priorities,
    modules: selection.modules,
    layout: selection.layout,
    // Provider keys are never exposed to, or used to configure, the client.
    // The assistant route independently decides whether a server-side provider is available.
    permissions: { localDemo: true, github: false, ai: false },
    workflowRules: selection.rules,
    createdAt: new Date().toISOString(),
  };
  return workspaceSchema.parse(config);
}

export const defaultWorkspace = (): WorkspaceConfig =>
  generateWorkspace({ description: "A focused product project with tasks, notes, resources, and a helpful AI assistant." });
