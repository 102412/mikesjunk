# Xpres.ai

A native SwiftUI community for people building with AI. The product name is centralized in `App/Models.swift` (`Brand`). iOS 26+, Swift 6, system tab/navigation/sheet presentation, native Liquid Glass tab chrome, light/dark appearance, Dynamic Type, semantic controls and haptics. No webview or cross-platform UI runtime.

**Delivery status:** implemented foundation with interactive development demo and production-path client/backend source. Linux validation passes; **no Xcode build or simulator run has been performed**. Live Supabase/Auth/Storage/Groq deployment has not been tested. This is not a production release or a claim that all acceptance criteria have been verified.

## Open and run on a Mac

1. Install Xcode 26 or newer and its iOS 26 simulator runtime. Select Xcode in Settings → Locations → Command Line Tools.
2. Install XcodeGen: `brew install xcodegen`.
3. In this checkout run `xcodegen generate` then `open Xpres.xcodeproj`.
4. Select the **Xpres** scheme and an iOS 26 iPhone simulator (iPhone 16 Pro is a suitable target). Run with **⌘R** using Debug.
5. Choose **Explore the fictional demo** on the welcome screen. No credentials or network are required for the sample feed/artwork. Demo access is compiled out of Release; production requests never use demo content. Demo edits are in memory and reset on exit/relaunch.
6. Run **⌘U** for the five native model/store tests. From a shell, use:

```sh
xcodebuild -list -project Xpres.xcodeproj
xcodebuild -showdestinations -project Xpres.xcodeproj -scheme Xpres
# Substitute an installed iOS 26 simulator name from the preceding output.
xcodebuild test -project Xpres.xcodeproj -scheme Xpres \
  -destination 'platform=iOS Simulator,name=iPhone 16 Pro' CODE_SIGNING_ALLOWED=NO
```

For a device, set your signing team and a unique bundle identifier in the app target. The project generator supplies the `xpres://auth/callback` URL scheme. The generated project/Info.plist and signing state are deliberately ignored; `project.yml` is the source of truth. The GitHub Actions iOS job is provided but has not been run here.

## What is implemented

- Five native destinations: Home, Explore, Create, AI Research, Profile.
- For You ranking using recency, likes, comments and self-reported interests; Following filter; refresh and paginated loading. This is a deterministic heuristic, not ML. Ranking operates over loaded pages.
- Five post types, screenshot carousels, native sharing of post text, linked resources, creator/project/resource navigation, comments, likes, private saves, paginated saved feed, follow/unfollow, reports, blocking, own-post/comment deletion. Likes/follows use optimistic state and rollback.
- Image composer via PhotosUI (up to six images), media-required app showcases, project creation/association, resource listings, build sessions with explicitly shared duration/milestones/commit links. Publishing is a single database transaction after sanitized media upload.
- Fictional offline artwork rendered natively, sample iOS/web projects, skills, Codex workflows, MCP listings, sessions and discussions. Sample engagement is fictional and labeled.
- Search/filter directory, project galleries/build logs, resource saving/reviewing, profiles, self-reported tiers, profile editor, follows/counts, blocked-account management, account deletion.
- Supabase email signup/login, Keychain session persistence, serialized refresh, email confirmation/recovery deep links, password update, logout. No credentials in the binary except the public Supabase anon key.
- Authenticated Groq research function, RLS-scoped full-text retrieval across posts/projects/resources/profiles/comments, optional Brave search abstraction, screenshot context, configurable text/vision models, provenance labels, numbered source references, and honest missing-provider/error states.
- Request quotas (5/minute and configurable 1–200/day, default 30), bounded tokens, 25-second research cancellation, no recursive tools, per-user 5-minute text-response cache and usage metadata. Cache lookup re-retrieves accessible context to avoid serving stale blocked/removed content. Vision answers are not cached.
- SQL foreign keys, constraints, indexes, RLS, atomic showcase validation, moderation flags, basic submission limits, private reports, upload reservations (60/day), and account-data cascades.
- JPEG-only upload Edge Function decodes with memory/resolution bounds and re-encodes without metadata. Clients cannot write directly to storage; user-scoped deletion permits cleanup of unattached uploads.

## Connect Supabase

Use a **new development Supabase project**. Do not point an unreviewed migration at production.

1. Install the Supabase CLI and authenticate on your machine.
2. Link and apply the migration:

```sh
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase functions deploy media-upload
supabase functions deploy research
supabase functions deploy account-delete
```

The CLI injects `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` into deployed functions. Never add the service role key to Xcode or the app. Gateway JWT verification is enabled, and functions also validate users with Auth. Use the project's legacy public **anon JWT key** for this configuration; newer publishable-key/gateway combinations need separate deployment validation.

3. In Supabase Auth enable email/password, email confirmation and a working SMTP provider. Set the redirect allowlist to `xpres://auth/callback` and require passwords of at least eight characters. The app explicitly supplies that redirect for signup/recovery. Validate both email flows on a device/simulator; email providers may rewrite custom-scheme links.
4. In Xcode app target → Build Settings add public user-defined values `SUPABASE_URL=https://YOUR_PROJECT.supabase.co` and `SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_JWT`. These populate Info.plist. Do not edit committed source to insert them.
5. Copy `.env.example` to ignored `.env` for server secrets **on your trusted machine**. Fill only the server fields, then use `supabase secrets set --env-file .env`. Keep secret values out of chat, Git and the client.

### Research configuration

Required server secret/configuration names:

| Name | Purpose |
| --- | --- |
| `GROQ_API_KEY` | Server-only Groq credential |
| `GROQ_TEXT_MODEL` | A currently supported Groq chat model you select |
| `GROQ_VISION_MODEL` | A currently supported image-capable Groq model, needed only for screenshot research |
| `WEB_SEARCH_PROVIDER=brave` | Optional external search implementation |
| `BRAVE_SEARCH_API_KEY` | Required only when Brave search is selected |
| `RESEARCH_DAILY_LIMIT` | Optional 1–200, default 30 |
| `RESEARCH_MAX_TOKENS` | Optional 100–3,000, default 1,200 |

Choose models from Groq's current catalog; no model is assumed to remain available. Required HTTPS destinations are your Supabase hostname, `api.groq.com`, and optionally `api.search.brave.com`. No web pages or repositories are downloaded/executed. Brave snippets are explicitly **not independently verified**. A retrieved URL is not proof of correctness. Missing vision configuration returns an unavailable state; missing web configuration allows clearly labeled internal-only synthesis. Demo research never invents an answer.

Sign in with Apple is **not implemented**: this checkout has no Apple team/capability/provider configuration. Before an App Store release that adds third-party social login, implement Apple nonce/token exchange and configure the Apple/Supabase provider. Email/password is the only live authentication method in this version.

## Security and operations

RLS restricts edits to owners; blocks are symmetric for query visibility and interactions; saves are private; reports and usage/cache tables are not client readable. `search_content` is security-invoker; only quota/cache/account cleanup uses a service role. Moderator access initially uses the trusted Supabase SQL dashboard/service role. Set `removed_at` on offending profiles/posts/projects/resources/comments/reviews to remove them from queries. Do not ship a service-role moderator client.

**Media is public.** The storage bucket intentionally uses public URLs for public posts. Blocking/removal hides database content, not an already copied public media URL. There is no private-post feature. Use a private bucket/signed access architecture before adding private sharing. Own-post deletion removes database media rows but does not immediately delete storage objects; unattached files can be cleaned with the owner's storage API or a scheduled retention job. Account deletion removes the user's flat storage directory first, then deletes Auth, cascading owned database data. Cleanup failure retains the account and permits retry, though some media may already be deleted.

Usage logs retain user UUID, time, status and token count, not prompt text. Cached answers may contain question-derived information; they are user-scoped and expire after five minutes. Expired cache rows are purged on subsequent successful research. Configure a scheduled cleanup job for physical deletion when traffic is idle; set a retention policy for usage rows before production. Supabase/Groq/search-provider logging and retention must also be reviewed. Quotas include failures and cache hits to bound abuse. Daily upload reservations include failed uploads.

Before production: review RLS against your real Supabase stack; configure backups, SMTP, monitoring, privacy policy, terms, age requirements and an operational moderation/report response process. There is no automated trust badge or claim of resource security review.

## Validation in this cloud environment

Node 24 is used for backend validation:

```sh
npm ci --ignore-scripts --cache /tmp/xpres-npm-cache
npm test
# Deno 2.5.6 or newer; system CA store is needed in this proxy-managed environment.
DENO_TLS_CA_STORE=system deno task check
python -m pip install --target /tmp/xpres-validation -r scripts/validation-requirements.txt
PYTHONPATH=/tmp/xpres-validation python scripts/validate_swift.py
```

Results during implementation:

- **22 Node tests passed**: actual PostgreSQL execution using PGlite (including 10 security/integrity subtests), research input/provider/citation/cache behavior, and actual JPEG decoding/re-encoding.
- All three Edge Function entry points passed **Deno type checking**.
- All 12 Swift files (including XCTest source) passed **tree-sitter syntax parsing**; XcodeGen YAML loaded and key target settings checked. This is not Swift compilation/type checking.
- Five native XCTest methods are included but **unrun**. No iOS simulator, UI accessibility audit, XcodeGen generation, Apple SDK build, live email flow, deployed RLS/storage integration, Groq call or Brave call was performed here.

The database harness mocks Supabase `auth` and `storage` schemas and roles, omits the unavailable PGlite pgcrypto extension (UUID generation is built in), then executes the complete migration against PostgreSQL. It tests real policies and triggers; it does not test GoTrue, PostgREST embedding, the storage service, or function deployment. Provider tests use explicit fixtures, not live inference.

## Known V1 gaps / release gates

- macOS build/test and real-device review remain mandatory. Confirm iOS 26 Liquid Glass, navigation, keyboard layout, dark appearance, VoiceOver, largest Dynamic Type and Reduce Motion. UI uses system transitions and no custom looping animation.
- No video **upload/creation** flow yet. Media/project models and detail views support manually provisioned HTTPS video playback via AVKit; players do not autoplay and pause on disappearance. The supported composer workflow is images.
- Explore loads up to 100 newest profiles/projects/resources and filters locally; it is not yet an unlimited server-paginated directory. Feed and saved posts paginate, but profile/project activity reflects loaded posts. Recent ordering follows the loaded server order; popular project ordering uses loaded likes. Some directory sorts/filters are approximate.
- No avatar uploader (initials or a provisioned HTTPS avatar), profile follower-list screen, project editor, offline production persistence, semantic retrieval, freehand visual selection, paid plans, or admin app. These are not represented by inert UI buttons.
- Production end-to-end tests and deployed monitoring are outstanding. Keys/provider access are prerequisites, not silently mocked integrations.
- App Store assets (icon, screenshots), legal copy, bundle signing, and Apple capabilities require the product owner's Mac/account.

Architecture: value models/validation in `Models`, observable application state and optimistic mutations in `Store`, authentication/REST/storage/functions in `API`, native screens in separate SwiftUI files, a cancellable research view model, pure testable backend orchestration helpers, and SQL-enforced data boundaries. There are no third-party iOS packages. Demo artwork is original SwiftUI drawing, not downloaded branding.
