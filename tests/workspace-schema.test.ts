import test from "node:test";
import assert from "node:assert/strict";
import { generateWorkspace, workspaceSchema } from "../lib/workspace-schema";

test("the three stated examples generate materially distinct valid configurations", () => {
  const saas = generateWorkspace({ description: "I'm building a subscription SaaS using Next.js, Supabase, Stripe, GitHub, and Vercel. I want revenue metrics and deployment monitoring." });
  const freelance = generateWorkspace({ description: "I build websites for small businesses. I manage client deadlines, project notes, repositories, and tasks. I prefer a light interface." });
  const ai = generateWorkspace({ description: "I'm building an AI product and need API monitoring, issue tracking, documentation, incidents, and a technical operations dashboard." });
  [saas, freelance, ai].forEach(item => assert.deepEqual(workspaceSchema.parse(item), item));
  assert.equal(saas.category, "saas"); assert.equal(freelance.category, "client"); assert.equal(ai.category, "ai");
  assert.equal(freelance.theme, "light"); assert.notDeepEqual(saas.modules, freelance.modules); assert.notDeepEqual(ai.modules, freelance.modules);
});
