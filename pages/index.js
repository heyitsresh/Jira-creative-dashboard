import { useCallback, useEffect, useState } from "react";
import Head from "next/head";
import Layout from "../components/Layout";
import OverviewTab from "../components/OverviewTab";
import AllTasksTab from "../components/AllTasksTab";
import AssigneeTab from "../components/AssigneeTab";
import ClientTab from "../components/ClientTab";
import { emptyFilters, getDueBucket } from "../lib/issueUtils";

export default function Home() {
  const [issues, setIssues] = useState([]);
  const [knownProjects, setKnownProjects] = useState([]);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [filters, setFilters] = useState(emptyFilters());

  const load = useCallback(async (projects) => {
    setLoading(true);
    setError(null);
    try {
      const qs = projects && projects.length ? `?projects=${encodeURIComponent(projects.join(","))}` : "";
      const resp = await fetch(`/api/jira${qs}`);
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data?.error || `Request failed (${resp.status})`);
      }
      setIssues(data.issues || []);
      setFetchedAt(data.fetchedAt || new Date().toISOString());
      setKnownProjects((prev) => {
        const set = new Set(prev);
        for (const i of data.issues || []) set.add(i.project);
        return Array.from(set).sort((a, b) => a.localeCompare(b));
      });
    } catch (err) {
      setError(String(err?.message || err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(selectedProjects);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjects]);

  function handleDrill(field, value) {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setActiveTab("tasks");
  }

  function handleFilterChange(field, value) {
    setFilters((prev) => ({ ...prev, [field]: value }));
  }

  function handleClear(field) {
    setFilters((prev) => ({ ...prev, [field]: "" }));
  }

  function handleClearAll() {
    setFilters(emptyFilters());
  }

  const overdueCount = issues.filter((i) => getDueBucket(i.dueDate) === "Overdue").length;

  return (
    <>
      <Head>
        <title>Jira Dashboard</title>
        <meta name="description" content="Read-only dashboard of open Jira tasks across all clients" />
      </Head>
      <Layout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        projects={knownProjects}
        selectedProjects={selectedProjects}
        onProjectsChange={setSelectedProjects}
        onRefresh={() => load(selectedProjects)}
        loading={loading}
        fetchedAt={fetchedAt}
        overdueCount={overdueCount}
        onSearch={(value) => handleDrill("search", value)}
        onBellClick={() => handleDrill("dueBucket", "Overdue")}
      >
        {error && (
          <div className="card border-red-200 bg-red-50 text-red-700 text-sm p-4 mb-6">
            <p className="font-medium mb-1">Couldn&apos;t load Jira data</p>
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {loading && issues.length === 0 && !error ? (
          <div className="text-center text-sm text-slate-400 py-20">
            Loading open tasks from Jira…
          </div>
        ) : (
          <>
            {activeTab === "overview" && (
              <OverviewTab issues={issues} onDrill={handleDrill} />
            )}
            {activeTab === "tasks" && (
              <AllTasksTab
                issues={issues}
                filters={filters}
                onFilterChange={handleFilterChange}
                onClear={handleClear}
                onClearAll={handleClearAll}
              />
            )}
            {activeTab === "assignee" && <AssigneeTab issues={issues} />}
            {activeTab === "client" && <ClientTab issues={issues} />}
          </>
        )}
      </Layout>
    </>
  );
}
