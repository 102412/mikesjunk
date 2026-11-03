import { z } from "zod";

export const projectModelSchema = z.enum(["gpt-6-luna", "gpt-6.1-sol", "gpt-6.1-terra"]);
export type ProjectModel = z.infer<typeof projectModelSchema>;

export const projectModels: { id: ProjectModel; name: string; short: string; description: string }[] = [
  { id: "gpt-6-luna", name: "Luna", short: "Quick edits", description: "Fast, focused changes and small requests." },
  { id: "gpt-6.1-sol", name: "Sol", short: "Build mode", description: "The default for fuller workspace changes." },
  { id: "gpt-6.1-terra", name: "Terra", short: "Visual refinements", description: "Visual direction and scoped interface fixes." },
];

export const defaultProjectModel: ProjectModel = "gpt-6.1-sol";
