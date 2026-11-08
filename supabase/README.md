# Kernova Supabase setup

1. Open **Supabase Dashboard → SQL Editor → New query** for the Kernova project.
2. Paste and run [`schema.sql`](./schema.sql).
3. Paste and run [`google-calendar.sql`](./google-calendar.sql) before enabling the Calendar connection. It adds a server-only, RLS-protected token store; browser clients cannot read it.
4. In **Authentication → URL Configuration**, keep these redirect URLs:
   - `https://kernovaai.vercel.app/auth/callback`
   - `http://localhost:3030/auth/callback`
5. In **Authentication → Providers → Google**, leave Google enabled and save the client ID and secret there. Do not add either value to this repository.

For the direct Google Calendar connection, add these to the Google Cloud OAuth web client's **Authorized redirect URIs** (not JavaScript origins):

- `https://kernovaai.vercel.app/api/integrations/google-calendar/callback`
- `http://localhost:3035/api/integrations/google-calendar/callback`

Set `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`, `GOOGLE_OAUTH_STATE_SECRET`, `INTEGRATION_TOKEN_ENCRYPTION_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` as server-only Vercel environment variables. The last two must never be shared with a browser or committed.

What the script provisions:

- a private profile, entitlement, and credit wallet for each new Supabase user;
- Free, one-time build, Pro, SMB, and Enterprise plan definitions;
- dashboard, revision, member, integration, hosting, usage, and immutable credit-ledger records;
- row-level security so people can read only their own account data;
- RPCs used by the builder: `get_account_summary`, `create_dashboard_from_build`, and `record_dashboard_edit`.

Payments are intentionally not part of this migration. Until a payment provider is connected, do not promote a profile tier directly from the browser; make plan changes through a trusted server or a controlled admin workflow.
