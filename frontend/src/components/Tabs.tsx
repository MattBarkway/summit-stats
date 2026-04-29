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
    <div className="inline-flex flex-wrap gap-1 rounded-full bg-white/30 backdrop-blur-xl p-1 shadow-md">
      {tabs.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
              active
                ? "bg-white/70 text-gray-900 shadow-sm"
                : "text-gray-700 hover:bg-white/50"
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span
                className={`ml-2 text-xs ${
                  active ? "text-gray-600" : "text-gray-500"
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
