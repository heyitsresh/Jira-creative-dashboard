# Jira Dashboard

Standalone, read-only Next.js dashboard of open tasks in the **CREATE** Jira project (`project = CREATE AND statusCategory != Done`), scoped down to a specific whitelist of brands. Separate app from the Pendleton tracker — nothing here writes back to Jira.

## Scope assumptions (edit if wrong)

- **Project**: hardcoded to `project = CREATE` in `pages/api/jira.js`. If CREATE turns out to be a label instead of a project key, change the `buildJql()` function there.
- **Brands**: only issues whose Client field (`customfield_10866`) matches one of the 10 whitelisted brands in `lib/clientConfig.js` are ever returned — everything else is dropped server-side, before it reaches the browser. The list: David's Bridal - AMZ, David's Bridal - WM, Pendleton, Co2Lift, Studio Eclipse / Artisga Crafts, LMDC / La Maison du Choclat, My Protect Kit, Berri Organics, Byer of Maine, Voicegift. Matching is case-insensitive substring/regex, not exact string, since we can't see your live Jira data to confirm literal values — if a brand's tasks are missing or grouped wrong, that's the file to edit.
- **Task type**: uses the standard Issue Type field (`issuetype`) — no separate custom field assumed for "Infographics" / "A+ Content" / etc.
- **Days Running**: whole days between the issue's `created` date and today.

## Tabs

- **MASTER** (default landing tab) — every whitelisted-brand open task: key/link, summary, status, assignee, priority, client, type, Days Running, due date, project, updated, linked-item status, and a Notes column. Brand pills at the top are multi-select (pick two or more brands at once, OR logic). Dropdown filters for status/priority/assignee/type, free-text search, and filter chips that can be cleared individually.
- **Overview** — charts (assignee, status, priority, brand, due date). Click any bar to jump to MASTER pre-filtered to that segment.
- **By Assignee** — pick a person from the list (shows total open + an overdue badge per person), see their tasks, filter by task type.
- **By Client** — pick a brand, see its status/assignee breakdown and open-task list.
- **By Product** — grouped by ASIN, pulled out of each task's title (there's no structured "parent product" field in Jira for this). Sidebar lists every ASIN found with an open-task count and overdue badge, searchable; tasks whose title has no recognizable ASIN land under "No ASIN Detected" so nothing silently disappears. The matching pattern (`lib/asin.js`) assumes standard 10-character Amazon ASINs starting with "B0" — edit that file's regex if your titles use a different convention (a different prefix, brackets around it, etc.).

A header bar above every tab shows the total open-task count, a clickable count per status, and quick-access buttons for pinned people (currently Resh, Shiela, Vannessa — edit `lib/pinnedPeople.js` to change who's pinned or fix name matching). Clicking a pinned person jumps to By Assignee with them pre-selected; clicking a status jumps to MASTER filtered to that status.

## Shared notes (Supabase)

Notes on MASTER are stored in Supabase, not Jira — this is the one place the app writes data anywhere, and it never touches Jira. Reads/writes go through `pages/api/notes.js` using the **service role key**, kept server-side only; the browser never talks to Supabase directly, so there's no key to leak and no RLS policy to get wrong.

**Setup:**

1. Create a free project at supabase.com.
2. In the SQL editor, run:
   ```sql
   create table task_notes (
     id uuid primary key default gen_random_uuid(),
     issue_key text not null,
     author text not null,
     body text not null,
     created_at timestamptz not null default now()
   );
   create index task_notes_issue_key_idx on task_notes (issue_key);
   ```
3. In Project Settings → API, copy the **Project URL** and the **service_role** key (not the anon/public one).
4. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as env vars (locally in `.env.local`, in Vercel under Project Settings → Environment Variables).

Until those two env vars are set, the app still works fine — the Notes column just shows 0 notes and adding one returns a clear error instead of crashing.

**How "auto-update when shared" works:** MASTER polls `/api/notes` every 20 seconds for everyone viewing the dashboard, so a note one person adds shows up for everyone else within ~20s without a manual refresh. This isn't true push-realtime (that would mean exposing a Supabase key to the browser and setting up Row Level Security) — polling was the simpler, more secure trade-off. Say the word if you'd rather have instant push updates and I'll wire up Supabase Realtime instead.

There's no login on this — anyone with the dashboard URL can read and add notes. That matches "share with others" as described; let me know if you actually want it access-controlled.

## Local development

```bash
npm install
cp .env.local.example .env.local   # fill in JIRA_EMAIL / JIRA_API_TOKEN, and Supabase vars once ready
npm run dev
```

Open http://localhost:3000.

## Deploying to Vercel

1. Push this folder to its own GitHub repo.
2. In Vercel: **Add New → Project**, import the repo (auto-detects Next.js).
3. Under **Project Settings → Environment Variables**, add `JIRA_EMAIL`, `JIRA_API_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
4. Deploy.

Or via CLI: `vercel login`, then `vercel` from this folder, `vercel env add <NAME> production` for each var, then `vercel --prod`.

## Notes / other assumptions

- Pagination is capped at 3,000 issues from Jira (30 pages × 100) with a guard against the known Jira bug where `nextPageToken` can loop without `isLast` ever turning true. The brand whitelist filter is applied after pagination, so this cap is on *all* CREATE tasks fetched, not just whitelisted ones — unlikely to matter unless CREATE has thousands of open tasks outside your 10 brands.
- Due-date buckets (Overdue / Today / This Week / Next Week / Later / No Due Date) are shared identically between charts and table filters.
- Linked items use the `issuelinks` field; "done" is based on the linked issue's status *category*, not its literal status name.
