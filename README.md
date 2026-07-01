# Jira Dashboard

Standalone, read-only Next.js dashboard of all open Jira tasks (`statusCategory != Done`) across every project/client on `ave7.atlassian.net`. Separate app from the Pendleton tracker — nothing here writes back to Jira.

## Tabs

- **Overview** — charts only (by assignee, status, priority, client, due date). Click any bar to jump to **All Tasks** pre-filtered to that segment.
- **All Tasks** — full sortable table, search box, dropdown filters, one-click Client pills, active-filter chips, ticket links, and an expandable **Linked Items** column showing each linked issue's status (e.g. "1/2 linked done").
- **By Assignee** — pick a person, see their open tasks, filter by task type.
- **By Client** — pick a client, see open-task counts, an overdue count, status/assignee breakdown charts, and their task list.

A project picker in the header scopes the Jira query itself (defaults to all projects).

## How it works

- `pages/api/jira.js` is a server-only proxy. It authenticates to Jira with Basic auth (`JIRA_EMAIL` + `JIRA_API_TOKEN`), calls `GET /rest/api/3/search/jql` (the current endpoint — the old POST `/rest/api/3/search` was removed), pages through results with `nextPageToken` until `isLast`, and returns a normalized JSON array to the browser. It only ever issues `GET` requests to Jira and only exposes `GET` to the client — there is no code path that writes to Jira.
- The custom field `customfield_10866` ("Client") is parsed defensively — it's returned to the browser as a plain string whether Jira sends it as a string, a `{value}` object, or a multi-select array.

## Local development

```bash
npm install
cp .env.local.example .env.local   # then fill in JIRA_EMAIL / JIRA_API_TOKEN
npm run dev
```

Open http://localhost:3000.

## Deploying to Vercel

1. Push this folder to its own GitHub repo (keep it separate from Pendleton tracker).
2. In Vercel: **Add New → Project**, import the repo. Framework preset auto-detects as Next.js.
3. Under **Project Settings → Environment Variables**, add:
   - `JIRA_EMAIL`
   - `JIRA_API_TOKEN`
4. Deploy. No other config needed — `next.config.js` and `postcss.config.mjs` are already set up.

Or via CLI from this folder: `vercel` (then `vercel --prod`), setting the same two env vars when prompted or via `vercel env add`.

## Notes / assumptions

- Pagination is capped at 3,000 issues (30 pages × 100) as a safety limit, with a guard against a known Jira bug where `nextPageToken` can loop without `isLast` ever turning true.
- Due-date buckets (Overdue / Today / This Week / Next Week / Later / No Due Date) are computed client-side from `duedate` and are shared identically between the charts and the table filters, so a chart click and a manual filter always mean the same thing.
- Linked items use the `issuelinks` field; "done" is based on the linked issue's status category, not its literal status name, so it stays correct even if your workflows rename statuses.
