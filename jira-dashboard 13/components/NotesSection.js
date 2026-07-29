import { useState } from "react";
import { MessageSquare, Send, Check } from "lucide-react";

export default function NotesSection({ issueKey, notes, onAddNote, onToggleResolve }) {
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function submit() {
    if (!body.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await onAddNote(issueKey, { body: body.trim() });
      setBody("");
    } catch (err) {
      setError(String(err?.message || err));
    } finally {
      setSubmitting(false);
    }
  }

  // Open notes first, resolved ones sink to the bottom.
  const sorted = [...notes].sort((a, b) => Number(a.resolved) - Number(b.resolved));

  return (
    <div className="flex flex-col gap-2 min-w-0">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
        <MessageSquare size={12} /> Notes
      </p>

      {sorted.length > 0 && (
        <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
          {sorted.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-2 text-xs bg-white rounded-lg border px-2.5 py-1.5 transition-opacity ${
                n.resolved ? "border-slate-100 opacity-50" : "border-slate-100"
              }`}
            >
              <button
                onClick={() => onToggleResolve(n.id, !n.resolved).catch(() => {})}
                title={n.resolved ? "Mark unresolved" : "Mark resolved"}
                className={`mt-0.5 h-4 w-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                  n.resolved
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : "border-slate-300 text-transparent hover:border-emerald-400"
                }`}
              >
                <Check size={10} strokeWidth={3} />
              </button>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-slate-600 whitespace-pre-wrap break-words ${
                    n.resolved ? "line-through" : ""
                  }`}
                >
                  {n.body}
                </p>
                <span className="text-slate-400 text-[10px] whitespace-nowrap">
                  {new Date(n.created_at).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="Leave a note…"
          className="text-xs border border-slate-200 rounded-full px-3 py-1 flex-1 min-w-[140px] focus:outline-none focus:ring-2 focus:ring-[#7b61ff]/30"
        />
        <button
          onClick={submit}
          disabled={submitting || !body.trim()}
          className="h-6 w-6 rounded-full bg-gradient-to-br from-[#7b61ff] to-[#9c6bff] text-white flex items-center justify-center disabled:opacity-40 shrink-0"
        >
          <Send size={12} />
        </button>
      </div>
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  );
}
