import { useState } from "react";
import { MessageSquare, Send } from "lucide-react";

export default function NotesSection({ issueKey, notes, onAddNote }) {
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

  return (
    <div className="flex flex-col gap-2 min-w-0">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
        <MessageSquare size={12} /> Notes
      </p>

      {notes.length > 0 && (
        <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
          {notes.map((n) => (
            <div key={n.id} className="text-xs bg-white rounded-lg border border-slate-100 px-2.5 py-1.5">
              <p className="text-slate-600 whitespace-pre-wrap break-words">{n.body}</p>
              <span className="text-slate-400 text-[10px] whitespace-nowrap">
                {new Date(n.created_at).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
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
