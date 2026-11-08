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

export const dashboardKindSchema = z.enum([
  "dispatch", "schedule", "pipeline", "support", "inventory", "finance", "analytics", "projects", "general",
]);

export const dashboardSectionSchema = z.object({
  title: z.string().min(1).max(80),
  view: z.enum(["list", "board", "timeline", "table", "calendar"]),
  items: z.array(z.string().min(1).max(100)).max(6),
});

export const dashboardKpiSchema = z.object({
  label: z.string().min(1).max(50),
  value: z.string().min(1).max(30),
  context: z.string().min(1).max(60),
});

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
  // Optional so dashboards saved before the richer builder remain readable.
  originalPrompt: z.string().max(1500).optional(),
  dashboardKind: dashboardKindSchema.optional(),
  headline: z.string().max(120).optional(),
  kpis: z.array(dashboardKpiSchema).max(4).optional(),
  sections: z.array(dashboardSectionSchema).max(4).optional(),
  createdAt: z.string(),
});

export type WorkspaceConfig = z.infer<typeof workspaceSchema>;

export type GeneratorInput = {
  description: string;
  name?: string;
  themePreference?: "dark" | "light";
  originalPrompt?: string;
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

function kindFromDescription(text: string): z.infer<typeof dashboardKindSchema> {
  if (includes(text, ["lawn", "field service", "crew", "route", "dispatch", "work order", "service call"])) return "dispatch";
  if (includes(text, ["calendar", "appointment", "schedule", "booking", "shift"])) return "schedule";
  if (includes(text, ["sales", "lead", "deal", "crm", "pipeline", "prospect"])) return "pipeline";
  if (includes(text, ["support", "ticket", "help desk", "customer success", "inbox"])) return "support";
  if (includes(text, ["inventory", "stock", "warehouse", "equipment", "assets"])) return "inventory";
  if (includes(text, ["invoice", "cash flow", "finance", "expense", "budget", "payroll"])) return "finance";
  if (includes(text, ["analytics", "metrics", "performance", "report", "kpi"])) return "analytics";
  if (includes(text, ["project", "milestone", "sprint", "roadmap", "delivery"])) return "projects";
  return "general";
}

function starterViews(kind: z.infer<typeof dashboardKindSchema>): z.infer<typeof dashboardSectionSchema>[] {
  const views: Record<z.infer<typeof dashboardKindSchema>, z.infer<typeof dashboardSectionSchema>[]> = {
    dispatch: [
      { title: "Today's route", view: "timeline", items: ["Jobs to assign", "Stops in progress", "Work needing follow-up"] },
      { title: "Crew dispatch board", view: "board", items: ["Needs a crew", "Scheduled", "On site", "Complete"] },
    ],
    schedule: [
      { title: "Upcoming bookings", view: "calendar", items: ["Needs a time", "Confirmed", "Needs follow-up"] },
      { title: "Schedule health", view: "list", items: ["Open time slots", "Changes to confirm", "People to notify"] },
    ],
    pipeline: [
      { title: "Deal flow", view: "board", items: ["New lead", "Qualified", "Proposal", "Decision"] },
      { title: "Next follow-ups", view: "timeline", items: ["Contact to make", "Proposal to review", "Decision due"] },
    ],
    support: [
      { title: "Support queue", view: "table", items: ["New requests", "Waiting on team", "Waiting on customer", "Resolved"] },
      { title: "Response watch", view: "list", items: ["Urgent requests", "Needs an owner", "Due for an update"] },
    ],
    inventory: [
      { title: "Stock movement", view: "table", items: ["Item to track", "Available quantity", "Reorder point", "Next action"] },
      { title: "Restock board", view: "board", items: ["Review", "Order placed", "In transit", "Received"] },
    ],
    finance: [
      { title: "Cash flow watch", view: "list", items: ["Income to reconcile", "Bills coming due", "Items needing review"] },
      { title: "Invoice flow", view: "board", items: ["Draft", "Sent", "Overdue", "Paid"] },
    ],
    analytics: [
      { title: "Report schedule", view: "calendar", items: ["Daily check", "Weekly review", "Monthly report"] },
      { title: "Signals to monitor", view: "table", items: ["Metric", "Source", "Review cadence", "Owner"] },
    ],
    projects: [
      { title: "Milestone path", view: "timeline", items: ["Next milestone", "In progress", "At risk", "Shipped"] },
      { title: "Work in motion", view: "board", items: ["Backlog", "Ready", "In progress", "Review"] },
    ],
    general: [
      { title: "Work queue", view: "list", items: ["Next action", "Needs a decision", "Waiting on someone"] },
      { title: "Progress board", view: "board", items: ["To do", "In progress", "Review", "Done"] },
    ],
  };
  return views[kind];
}

function starterKpis(kind: z.infer<typeof dashboardKindSchema>): z.infer<typeof dashboardKpiSchema>[] {
  const labels: Record<z.infer<typeof dashboardKindSchema>, [string, string, string]> = {
    dispatch: ["Jobs today", "Crews available", "Needs routing"],
    schedule: ["Upcoming bookings", "Open time slots", "Needs confirmation"],
    pipeline: ["Active leads", "Proposals out", "Follow-ups due"],
    support: ["Open requests", "Needs an owner", "Awaiting reply"],
    inventory: ["Items tracked", "Below reorder point", "Orders in transit"],
    finance: ["Invoices to review", "Bills coming due", "Needs reconciliation"],
    analytics: ["Reports to review", "Sources connected", "Metrics selected"],
    projects: ["Open milestones", "Work in progress", "At risk"],
    general: ["Priority items", "Active workstreams", "Needs a decision"],
  };
  return labels[kind].map(label => ({ label, value: "—", context: "Connect or add your data" }));
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
  const dashboardKind = kindFromDescription(text);
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
    originalPrompt: input.originalPrompt?.trim().slice(0, 1500) || input.description.trim().slice(0, 1500),
    dashboardKind,
    headline: `A clear view of ${dashboardKind === "general" ? "the work ahead" : `${dashboardKind} work`}.`,
    kpis: starterKpis(dashboardKind),
    sections: starterViews(dashboardKind),
    createdAt: new Date().toISOString(),
  };
  return workspaceSchema.parse(config);
}

export const defaultWorkspace = (): WorkspaceConfig =>
  generateWorkspace({ description: "A focused product project with tasks, notes, resources, and a helpful AI assistant." });
