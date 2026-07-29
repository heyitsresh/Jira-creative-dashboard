import { useEffect, useState } from "react";
import { colorForKey } from "../lib/colors";

const VISITOR_KEY = "jira-dashboard-visitor-id";
const HEARTBEAT_MS = 15000;
const MAX_AVATARS = 4;

function getVisitorId() {
  if (typeof window === "undefined") return null;
  let id = window.localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
    window.localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

export default function PresenceIndicator() {
  const [viewers, setViewers] = useState([]);
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    const visitorId = getVisitorId();
    if (!visitorId) return;

    async function heartbeat() {
      try {
        await fetch("/api/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitorId }),
        });
      } catch {
        // Presence is decorative — never surface this as an app error.
      }
    }

    async function poll() {
      try {
        const resp = await fetch("/api/presence");
        const data = await resp.json();
        setConfigured(data.configured !== false);
        setViewers(data.viewers || []);
      } catch {
        // Same — fail silently.
      }
    }

    heartbeat();
    poll();
    const heartbeatId = setInterval(heartbeat, HEARTBEAT_MS);
    const pollId = setInterval(poll, HEARTBEAT_MS);
    return () => {
      clearInterval(heartbeatId);
      clearInterval(pollId);
    };
  }, []);

  if (!configured || viewers.length === 0) return null;

  const shown = viewers.slice(0, MAX_AVATARS);
  const overflow = viewers.length - shown.length;

  return (
    <div
      className="flex items-center gap-1.5"
      title={`${viewers.length} viewing this dashboard right now`}
    >
      <div className="flex -space-x-2">
        {shown.map((id) => (
          <span
            key={id}
            className="h-7 w-7 rounded-full border-2 border-white flex items-center justify-center relative"
            style={{ backgroundColor: colorForKey(id) }}
          >
            <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 border border-white" />
          </span>
        ))}
        {overflow > 0 && (
          <span className="h-7 w-7 rounded-full border-2 border-white bg-slate-200 text-slate-600 text-[10px] font-semibold flex items-center justify-center">
            +{overflow}
          </span>
        )}
      </div>
      <span className="hidden sm:inline text-xs text-slate-500">
        {viewers.length} viewing now
      </span>
    </div>
  );
}
