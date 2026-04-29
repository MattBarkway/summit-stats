"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  type Rule,
  type RuleTrigger,
  useDeleteRule,
  useGroupRules,
} from "@/hooks/useGroups";
import ErrorState from "./ErrorState";
import RuleEditor from "./RuleEditor";

const TRIGGER_LABELS: Record<RuleTrigger, string> = {
  distance_km: "Distance ≥",
  elevation_m: "Elevation ≥",
  kom: "KOM",
  top_ten: "Top 10",
  achievement: "Achievements ≥",
};

function ruleSummary(r: Rule): string {
  const sport = r.sport_type ?? "Any";
  switch (r.trigger_type) {
    case "distance_km":
      return `${sport} · ${r.threshold} km`;
    case "elevation_m":
      return `${sport} · ${r.threshold} m`;
    case "kom":
      return `${sport} · KOM`;
    case "top_ten":
      return `${sport} · Top 10`;
    case "achievement":
      return `${sport} · ${r.threshold} achievement${r.threshold === 1 ? "" : "s"}`;
  }
}

export default function RulesList({
  groupId,
  isOwner,
}: {
  groupId: string;
  isOwner: boolean;
}) {
  const { data: rules, isLoading, error, refetch } = useGroupRules(groupId);
  const remove = useDeleteRule(groupId);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [creating, setCreating] = useState(false);

  if (isLoading) return <p className="text-slate-400">Loading rules…</p>;
  if (error)
    return (
      <ErrorState
        title="Couldn't load rules"
        message={(error as Error).message}
        onRetry={() => refetch()}
      />
    );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400 tabular-nums">
          {rules?.length ?? 0} rule{rules?.length === 1 ? "" : "s"}
        </p>
        {isOwner && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1 rounded-lg bg-orange-400 px-3 py-1.5 text-sm font-bold text-slate-950 hover:bg-orange-500 transition-colors"
          >
            <Plus size={14} />
            Add rule
          </button>
        )}
      </div>

      {rules && rules.length > 0 ? (
        <ul className="space-y-2">
          {rules.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-3 rounded-2xl bg-white/5 ring-1 ring-white/10 shadow-md px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200">
                  <span className="font-semibold">
                    {TRIGGER_LABELS[r.trigger_type]}
                  </span>{" "}
                  · <span className="text-slate-400">{ruleSummary(r)}</span>
                </p>
              </div>
              <span className="rounded-full bg-orange-400/15 ring-1 ring-orange-400/30 px-2.5 py-0.5 text-sm font-bold tabular-nums text-orange-300">
                {r.points} pts
              </span>
              {isOwner && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditing(r)}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-slate-100"
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (
                        !confirm(
                          "Delete this rule? Earned points for it will be removed.",
                        )
                      )
                        return;
                      await remove.mutateAsync(r.id);
                    }}
                    className="rounded-md p-1.5 text-red-400 hover:bg-red-500/10"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-2xl bg-white/5 backdrop-blur-xl ring-1 ring-white/10 shadow-md p-5 text-center text-slate-400">
          No rules yet. {isOwner ? "Add one to start awarding points." : ""}
        </div>
      )}

      {(creating || editing) && (
        <RuleEditor
          groupId={groupId}
          open
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          existing={editing ?? undefined}
        />
      )}
    </div>
  );
}
