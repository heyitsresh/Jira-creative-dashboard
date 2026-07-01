import { useCallback, useEffect, useState } from "react";
import Head from "next/head";
import Layout from "../components/Layout";
import OverviewTab from "../components/OverviewTab";
import AllTasksTab from "../components/AllTasksTab";
import AssigneeTab from "../components/AssigneeTab";
import ClientTab from "../components/ClientTab";
import ProductTab from "../components/ProductTab";
import { emptyFilters, getDueBucket } from "../lib/issueUtils";

export default function Home() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [activeTab, setActiveTab] = useState("tasks");
  const [filters, setFilters] = useState(emptyFilters());
  const [selectedAssignee, setSelectedAssignee] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/jira");
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data?.error || `Request failed (${resp.status})`);
      }
      setIssues(data.issues || []);
      setFetchedAt(data.fetchedAt || new Date().toISOString());
    } catch (err) {
      setError(String(err?.message || err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function goToMaster(field, value) {
    setFilters((prev) => ({
      ...prev,
      [field]: field === "client" ? [value] : value,
    }));
    setActiveTab("tasks");
  }

  function handleFilterChange(field, value) {
    setFilters((prev) => ({ ...prev, [field]: value }));
  }

  function handleToggleClient(brand) {
    setFilters((prev) => ({
      ...prev,
      client: prev.client.includes(brand)
        ? prev.client.filter((b) => b !== brand)
        : [...prev.client, brand],
    }));
  }

  function handleClear(field, value) {
    if (field === "client") {
      setFilters((prev) => ({ ...prev, client: prev.client.filter((b) => b !== value) }));
    } else {
      setFilters((prev) => ({ ...prev, [field]: "" }));
    }
  }

  function handleClearAll() {
    setFilters(emptyFilters());
  }

  function handlePersonClick(name) {
    setSelectedAssignee(name);
    setActiveTab("assignee");
  }

  const overdueCount = issues.filter((i) => getDueBucket(i.dueDate) === "Overdue").length;

  return (
    <>
      <Head>
        <title>Jira Dashboard</title>
        <meta name="description" content="Read-only dashboard of open CREATE tasks across our brands" />
      </Head>
      <Layout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        issues={issues}
        onRefresh={load}
        loading={loading}
        fetchedAt={fetchedAt}
        overdueCount={overdueCount}
        onSearch={(value) => goToMaster("search", value)}
        onBellClick={() => goToMaster("dueBucket", "Overdue")}
        onStatusClick={(status) => goToMaster("status", status)}
        onPersonClick={handlePersonClick}
      >
        {error && (
          <div className="card border-red-200 bg-red-50 text-red-700 text-sm p-4 mb-6">
            <p className="font-medium mb-1">Couldn&apos;t load Jira data</p>
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {loading && issues.length === 0 && !error ? (
          <div className="text-center text-sm text-slate-400 py-20">
            Loading open CREATE tasks from Jira…
          </div>
        ) : (
          <>
            {activeTab === "overview" && (
              <OverviewTab issues={issues} onDrill={goToMaster} />
            )}
            {activeTab === "tasks" && (
              <AllTasksTab
                issues={issues}
                filters={filters}
                onFilterChange={handleFilterChange}
                onToggleClient={handleToggleClient}
                onClear={handleClear}
                onClearAll={handleClearAll}
              />
            )}
            {activeTab === "assignee" && (
              <AssigneeTab
                issues={issues}
                selectedAssignee={selectedAssignee}
                onSelectAssignee={setSelectedAssignee}
              />
            )}
            {activeTab === "client" && <ClientTab issues={issues} />}
            {activeTab === "product" && <ProductTab issues={issues} />}
          </>
        )}
      </Layout>
    </>
  );
}
