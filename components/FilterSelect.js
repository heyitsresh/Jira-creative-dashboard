export default function FilterSelect({ label, value, options, onChange }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-slate-500 min-w-0">
      <span className="font-medium">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm border border-slate-200 rounded-md px-2 py-1.5 bg-white text-slate-700 min-w-[130px] max-w-[180px] focus:outline-none focus:ring-2 focus:ring-indigo-200"
      >
        <option value="">All</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}
