"use client";

type TabDef<T extends string> = {
  id: T;
  label: string;
  count?: number;
};

export default function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: TabDef<T>[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="inline-flex gap-1 border-b border-white/10 -mb-px">
      {tabs.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`px-4 py-2 text-sm font-medium tracking-tight border-b-2 transition-all duration-200 ${
              active
                ? "border-orange-400 text-white"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span
                className={`ml-2 text-xs tabular-nums ${
                  active ? "text-slate-300" : "text-slate-500"
                }`}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
