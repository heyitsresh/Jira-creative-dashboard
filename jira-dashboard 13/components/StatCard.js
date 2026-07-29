import useCountUp from "../lib/useCountUp";

export default function StatCard({ label, value, icon: Icon, gradient = ["#7b61ff", "#9c6bff"], caption }) {
  const displayValue = useCountUp(value);

  return (
    <div className="card p-4 min-w-0">
      <div className="flex items-start justify-between gap-2">
        {Icon && (
          <div
            className="h-11 w-11 rounded-xl flex items-center justify-center text-white shrink-0"
            style={{ background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` }}
          >
            <Icon size={20} strokeWidth={2.25} />
          </div>
        )}
        <div className="text-right min-w-0 flex-1">
          <p className="text-xs text-slate-400 truncate">{label}</p>
          <p className="text-xl font-semibold text-slate-800 mt-0.5 truncate">{displayValue}</p>
        </div>
      </div>
      {caption && (
        <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400 truncate">
          {caption}
        </div>
      )}
    </div>
  );
}
