// Read-only proxy to Jira Cloud. Never issues anything but GET requests to
// Jira, and only exposes GET to the browser. No writes, transitions, or
// mutations of any kind happen here.

import { matchBrand } from "../../lib/clientConfig";
import { extractAsin } from "../../lib/asin";

const JIRA_SITE = "https://ave7.atlassian.net";
const JIRA_PROJECT = "CREATE";
const CLIENT_FIELD = "customfield_10866";
const FIELDS = [
  "summary",
  "status",
  "assignee",
  "priority",
  "duedate",
  "project",
  "issuetype",
  "updated",
  "created",
  "issuelinks",
  CLIENT_FIELD,
].join(",");

const MAX_PAGES = 30; // safety cap: 30 * 100 = up to 3000 issues
const PAGE_SIZE = 100;

function normalizeClient(raw) {
  if (raw === null || raw === undefined) return "Unspecified";
  if (typeof raw === "string") return raw.trim() || "Unspecified";
  if (Array.isArray(raw)) {
    const vals = raw
      .map((v) => normalizeClient(v))
      .filter((v) => v && v !== "Unspecified");
    return vals.length ? vals.join(", ") : "Unspecified";
  }
  if (typeof raw === "object") {
    if (typeof raw.value === "string") return raw.value;
    if (typeof raw.name === "string") return raw.name;
  }
  return String(raw);
}

function mapLinkedItems(issuelinks) {
  if (!Array.isArray(issuelinks)) return [];
  const items = [];
  for (const link of issuelinks) {
    const dir = link.outwardIssue ? "outward" : link.inwardIssue ? "inward" : null;
    if (!dir) continue;
    const linked = dir === "outward" ? link.outwardIssue : link.inwardIssue;
    const relation =
      (dir === "outward" ? link.type?.outward : link.type?.inward) ||
      "related to";
    items.push({
      key: linked.key,
      url: `${JIRA_SITE}/browse/${linked.key}`,
      summary: linked.fields?.summary || "(no summary)",
      status: linked.fields?.status?.name || "Unknown",
      statusCategory: linked.fields?.status?.statusCategory?.name || "Unknown",
      relation,
    });
  }
  return items;
}

function daysOpenFromCreated(createdStr) {
  if (!createdStr) return null;
  const created = new Date(createdStr);
  if (Number.isNaN(created.getTime())) return null;
  const startOfDay = (d) => {
    const c = new Date(d);
    c.setHours(0, 0, 0, 0);
    return c;
  };
  const ms = startOfDay(new Date()).getTime() - startOfDay(created).getTime();
  return Math.max(0, Math.round(ms / 86400000));
}

// Returns the mapped issue, or null if its Client field doesn't match any
// whitelisted brand (see lib/clientConfig.js) — those issues are dropped
// entirely rather than shown as "Unspecified".
function mapIssue(raw) {
  const f = raw.fields || {};
  const rawClient = normalizeClient(f[CLIENT_FIELD]);
  const brand = matchBrand(rawClient);
  if (!brand) return null;

  return {
    key: raw.key,
    summary: f.summary || "(no summary)",
    url: `${JIRA_SITE}/browse/${raw.key}`,
    status: f.status?.name || "Unknown",
    statusCategory: f.status?.statusCategory?.name || "Unknown",
    assignee: f.assignee?.displayName || "Unassigned",
    priority: f.priority?.name || "None",
    dueDate: f.duedate || null,
    project: f.project?.key || "Unknown",
    projectName: f.project?.name || f.project?.key || "Unknown",
    client: brand,
    asin: extractAsin(f.summary),
    issueType: f.issuetype?.name || "Unknown",
    updated: f.updated || null,
    created: f.created || null,
    daysOpen: daysOpenFromCreated(f.created),
    linkedItems: mapLinkedItems(f.issuelinks),
  };
}

function buildJql() {
  return `project = ${JSON.stringify(JIRA_PROJECT)} AND statusCategory != Done ORDER BY updated DESC`;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({
      error: "This endpoint is read-only and only supports GET.",
    });
  }

  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;
  if (!email || !token) {
    return res.status(500).json({
      error:
        "Server is missing JIRA_EMAIL / JIRA_API_TOKEN environment variables.",
    });
  }

  const jql = buildJql();
  const authHeader =
    "Basic " + Buffer.from(`${email}:${token}`).toString("base64");

  const issues = [];
  const seenTokens = new Set();
  let nextPageToken = null;
  let isLast = false;
  let page = 0;

  try {
    while (!isLast && page < MAX_PAGES) {
      const params = new URLSearchParams({
        jql,
        fields: FIELDS,
        maxResults: String(PAGE_SIZE),
      });
      if (nextPageToken) params.set("nextPageToken", nextPageToken);

      const url = `${JIRA_SITE}/rest/api/3/search/jql?${params.toString()}`;
      const resp = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: authHeader,
          Accept: "application/json",
        },
      });

      if (!resp.ok) {
        const bodyText = await resp.text();
        let bodyJson;
        try {
          bodyJson = JSON.parse(bodyText);
        } catch {
          bodyJson = { raw: bodyText };
        }
        return res.status(resp.status).json({
          error: "Jira API request failed.",
          status: resp.status,
          details: bodyJson,
        });
      }

      const data = await resp.json();
      for (const raw of data.issues || []) {
        const mapped = mapIssue(raw);
        if (mapped) issues.push(mapped);
      }

      isLast = Boolean(data.isLast) || !data.nextPageToken;
      if (!isLast) {
        // Defensive guard against the known Jira bug where nextPageToken
        // loops without isLast ever becoming true.
        if (seenTokens.has(data.nextPageToken)) break;
        seenTokens.add(data.nextPageToken);
        nextPageToken = data.nextPageToken;
      }
      page += 1;
    }

    res.setHeader("Cache-Control", "private, no-store");
    return res.status(200).json({
      issues,
      count: issues.length,
      truncated: page >= MAX_PAGES && !isLast,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(502).json({
      error: "Failed to reach Jira.",
      details: String(err?.message || err),
    });
  }
}
