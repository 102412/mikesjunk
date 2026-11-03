import { defaultWorkspace, type WorkspaceConfig, workspaceSchema } from "./workspace-schema";

const CONFIG_KEY = "projectos.workspace.v1";
const DATA_KEY = "projectos.data.v1";

export type Task = { id: string; title: string; done: boolean; createdAt: string };
export type Resource = { id: string; label: string; url: string };
export type Activity = { id: string; message: string; at: string };
export type GitHubData = { repo: string; description: string | null; issues: number; commits: { message: string; sha: string }[] };
export type WorkspaceData = { tasks: Task[]; notes: string; resources: Resource[]; activity: Activity[]; github?: GitHubData };

export const emptyData = (): WorkspaceData => ({
  tasks: [{ id: "welcome", title: "Shape the first milestone", done: false, createdAt: new Date().toISOString() }],
  notes: "# Project brief\n\nStart by capturing the decision that matters most.",
  resources: [],
  activity: [{ id: "ready", message: "Workspace created in local-demo mode", at: new Date().toISOString() }],
});

export function readWorkspace(): WorkspaceConfig {
  if (typeof window === "undefined") return defaultWorkspace();
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? workspaceSchema.parse(JSON.parse(raw)) : defaultWorkspace();
  } catch {
    return defaultWorkspace();
  }
}

export function hasStoredWorkspace() {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw !== null && workspaceSchema.safeParse(JSON.parse(raw)).success;
  } catch {
    return false;
  }
}

export function saveWorkspace(config: WorkspaceConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(workspaceSchema.parse(config)));
}

export function readData(): WorkspaceData {
  if (typeof window === "undefined") return emptyData();
  try {
    const raw = localStorage.getItem(DATA_KEY);
    return raw ? { ...emptyData(), ...JSON.parse(raw) } : emptyData();
  } catch { return emptyData(); }
}

export function saveData(data: WorkspaceData) {
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
}
