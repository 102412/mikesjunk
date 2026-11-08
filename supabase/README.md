# Kernova Supabase setup

1. Open **Supabase Dashboard → SQL Editor → New query** for the Kernova project.
2. Paste and run [`schema.sql`](./schema.sql).
3. In **Authentication → URL Configuration**, keep these redirect URLs:
   - `https://kernovaai.vercel.app/auth/callback`
   - `http://localhost:3030/auth/callback`
4. In **Authentication → Providers → Google**, leave Google enabled and save the client ID and secret there. Do not add either value to this repository.

What the script provisions:

- a private profile, entitlement, and credit wallet for each new Supabase user;
- Free, one-time build, Pro, SMB, and Enterprise plan definitions;
- dashboard, revision, member, integration, hosting, usage, and immutable credit-ledger records;
- row-level security so people can read only their own account data;
- RPCs used by the builder: `get_account_summary`, `create_dashboard_from_build`, and `record_dashboard_edit`.

Payments are intentionally not part of this migration. Until a payment provider is connected, do not promote a profile tier directly from the browser; make plan changes through a trusted server or a controlled admin workflow.
