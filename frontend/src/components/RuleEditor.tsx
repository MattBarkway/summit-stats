"use client";

import { useState } from "react";
import {
  type Rule,
  type RuleTrigger,
  useCreateRule,
  useUpdateRule,
} from "@/hooks/useGroups";
import { InlineError } from "./ErrorState";

const TRIGGERS: { id: RuleTrigger; label: string; hasThreshold: boolean }[] = [
  { id: "distance_km", label: "Distance (km)", hasThreshold: true },
  { id: "elevation_m", label: "Elevation (m)", hasThreshold: true },
  { id: "kom", label: "KOM", hasThreshold: false },
  { id: "top_ten", label: "Top 10 segment", hasThreshold: false },
  { id: "achievement", label: "Achievement count", hasThreshold: true },
];

const SPORTS = [
  "",
  "Ride",
  "Run",
  "VirtualRide",
  "EBikeRide",
  "MountainBikeRide",
  "GravelRide",
  "Walk",
  "Hike",
  "Swim",
  "TrailRun",
];

export default function RuleEditor({
  groupId,
  open,
  onClose,
  existing,
}: {
  groupId: string;
  open: boolean;
  onClose: () => void;
  existing?: Rule;
}) {
  const editing = !!existing;
  const [trigger, setTrigger] = useState<RuleTrigger>(
    existing?.trigger_type ?? "distance_km",
  );
  const [threshold, setThreshold] = useState(
    existing?.threshold?.toString() ?? "",
  );
  const [points, setPoints] = useState(existing?.points?.toString() ?? "");
  const [sport, setSport] = useState(existing?.sport_type ?? "");

  const create = useCreateRule(groupId);
  const update = useUpdateRule(groupId);
  const def = TRIGGERS.find((t) => t.id === trigger) ?? TRIGGERS[0];

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const thresholdNum = def.hasThreshold ? Number(threshold) : 1;
    const pointsNum = Number(points);
    if (Number.isNaN(thresholdNum) || Number.isNaN(pointsNum)) return;

    if (editing && existing) {
      await update.mutateAsync({
        ruleId: existing.id,
        threshold: def.hasThreshold ? thresholdNum : undefined,
        points: pointsNum,
      });
    } else {
      await create.mutateAsync({
        trigger_type: trigger,
        threshold: thresholdNum,
        points: pointsNum,
        sport_type: sport || null,
      });
    }
    onClose();
  };

  const error = (create.error ?? update.error) as Error | null;
  const isPending = create.isPending || update.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl bg-white/40 backdrop-blur-xl shadow-xl p-6">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          {editing ? "Edit rule" : "Add rule"}
        </h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label
              htmlFor="rule-trigger"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Trigger
            </label>
            <select
              id="rule-trigger"
              disabled={editing}
              value={trigger}
              onChange={(e) => setTrigger(e.target.value as RuleTrigger)}
              className="w-full rounded-md p-3 bg-gray-100/60 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#558d73] text-gray-700 disabled:opacity-60"
            >
              {TRIGGERS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {!editing && (
            <div>
              <label
                htmlFor="rule-sport"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Sport
              </label>
              <select
                id="rule-sport"
                value={sport}
                onChange={(e) => setSport(e.target.value)}
                className="w-full rounded-md p-3 bg-gray-100/60 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#558d73] text-gray-700"
              >
                {SPORTS.map((s) => (
                  <option key={s} value={s}>
                    {s || "Any sport"}
                  </option>
                ))}
              </select>
            </div>
          )}

          {def.hasThreshold && (
            <div>
              <label
                htmlFor="rule-threshold"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Threshold
              </label>
              <input
                id="rule-threshold"
                required
                type="number"
                step="0.1"
                min="0"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="w-full rounded-md p-3 bg-gray-100/60 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#558d73] text-gray-700"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="rule-points"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Points
            </label>
            <input
              id="rule-points"
              required
              type="number"
              min="0"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              className="w-full rounded-md p-3 bg-gray-100/60 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#558d73] text-gray-700"
            />
          </div>

          {error && <InlineError message={error.message} />}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white/40 px-4 py-2 text-gray-700 hover:bg-white/70 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-[#3e7f6b]/80 px-4 py-2 text-white hover:bg-[#358d73] disabled:opacity-50 transition-colors"
            >
              {isPending ? "Saving…" : editing ? "Save" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
