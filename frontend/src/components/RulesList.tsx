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

  if (isLoading) return <p className="text-gray-700">Loading rules…</p>;
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
        <p className="text-sm text-gray-700">
          {rules?.length ?? 0} rule{rules?.length === 1 ? "" : "s"}
        </p>
        {isOwner && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1 rounded-lg bg-[#3e7f6b]/80 px-3 py-1.5 text-sm text-white hover:bg-[#358d73] transition-colors"
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
              className="flex items-center gap-3 rounded-2xl bg-gray-100/40 backdrop-blur-xl shadow-md px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800">
                  <span className="font-medium">
                    {TRIGGER_LABELS[r.trigger_type]}
                  </span>{" "}
                  · {ruleSummary(r)}
                </p>
              </div>
              <span className="rounded-full bg-[#3e7f6b]/15 px-2.5 py-0.5 text-sm font-medium text-[#3e7f6b]">
                {r.points} pts
              </span>
              {isOwner && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditing(r)}
                    className="rounded-md p-1.5 text-gray-600 hover:bg-white/50 hover:text-gray-900"
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
                    className="rounded-md p-1.5 text-red-600 hover:bg-red-50"
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
        <div className="rounded-2xl bg-gray-100/40 backdrop-blur-xl shadow-md p-5 text-center text-gray-700">
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
