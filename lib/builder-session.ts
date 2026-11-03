export type BuilderSession = {
  brief: string;
  answers: string[];
  createdAt: string;
};

const SESSION_KEY = "projectos.builder-session.v1";

export function saveBuilderSession(session: BuilderSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function readBuilderSession(): BuilderSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BuilderSession;
    return typeof parsed.brief === "string" && Array.isArray(parsed.answers) ? parsed : null;
  } catch {
    return null;
  }
}

export function scopedDescription(session: BuilderSession) {
  return [session.brief, ...session.answers.map((answer, index) => `Scope answer ${index + 1}: ${answer}`)].join("\n\n");
}
