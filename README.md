# ProjectOS V1

ProjectOS is an adaptive project operating-system demonstration: a user describes their project and receives a schema-validated workspace made from an approved module registry.

## What works

- Public landing page, demo, onboarding, workspace, settings, and integrations routes.
- Deterministic conversational workspace generation for SaaS, client/freelance, AI-operations, and general projects.
- Zod-validated configuration—no AI output is executable code.
- Browser-local demo persistence for workspace configuration, tasks, notes, resources, activities, and GitHub lookup state.
- Real public GitHub repository lookup through a validated server route (metadata, recent commits, open-issue count).
- Project-aware assistant API. It uses a deterministic safe fallback unless a server-only `OPENAI_API_KEY` is provided.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Run validation with:

```bash
npm run lint
npm run test
npm run build
```

## Data and integration boundaries

This V1 explicitly runs in **local-demo mode**. Local storage is not a multi-user database and should not be used for sensitive project data. GitHub is not represented as connected until the repository lookup succeeds. The optional OpenAI key stays server-side—copy `.env.example` to `.env.local` locally and never commit credentials.

## Deployment

This is a standard Next.js app for Vercel. To complete a connected deployment, authenticate a GitHub account, create/push the target repository, then import that repository into Vercel (or use the Vercel CLI while authenticated). No one-off deployment should be represented as a repository-linked production deployment.
