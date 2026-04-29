"use client";

import { useState } from "react";
import { useCreateChallenge } from "@/hooks/useGroups";
import { InlineError } from "./ErrorState";

const inputCls =
  "w-full rounded-md p-3 bg-white/5 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-orange-400 text-slate-100";

export default function CreateChallengeModal({
  groupId,
  open,
  onClose,
}: {
  groupId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [segmentId, setSegmentId] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [pointsWinner, setPointsWinner] = useState("500");
  const [pointsTop3, setPointsTop3] = useState("200");
  const [pointsFinish, setPointsFinish] = useState("50");
  const create = useCreateChallenge(groupId);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = Number(segmentId);
    if (Number.isNaN(id) || id <= 0) return;
    await create.mutateAsync({
      segment_id: id,
      ends_at: new Date(endsAt).toISOString(),
      points_winner: Number(pointsWinner),
      points_top3: Number(pointsTop3),
      points_finish: Number(pointsFinish),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900/80 ring-1 ring-white/10 backdrop-blur-xl shadow-2xl shadow-black/50 p-6">
        <h2 className="mb-4 text-xl font-bold tracking-tight text-slate-100">
          New segment challenge
        </h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label
              htmlFor="seg-id"
              className="mb-1 block text-sm font-medium text-slate-300"
            >
              Segment ID
            </label>
            <input
              id="seg-id"
              required
              type="number"
              min="1"
              value={segmentId}
              onChange={(e) => setSegmentId(e.target.value)}
              className={inputCls}
            />
            <p className="mt-1 text-xs text-slate-500">
              Find at strava.com/segments/&lt;id&gt;
            </p>
          </div>
          <div>
            <label
              htmlFor="seg-ends"
              className="mb-1 block text-sm font-medium text-slate-300"
            >
              Deadline
            </label>
            <input
              id="seg-ends"
              required
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label
                htmlFor="pts-winner"
                className="mb-1 block text-xs font-medium text-slate-400"
              >
                Winner
              </label>
              <input
                id="pts-winner"
                type="number"
                min="0"
                value={pointsWinner}
                onChange={(e) => setPointsWinner(e.target.value)}
                className="w-full rounded-md p-2 bg-white/5 ring-1 ring-white/10 text-slate-100 tabular-nums"
              />
            </div>
            <div>
              <label
                htmlFor="pts-top3"
                className="mb-1 block text-xs font-medium text-slate-400"
              >
                Top 3
              </label>
              <input
                id="pts-top3"
                type="number"
                min="0"
                value={pointsTop3}
                onChange={(e) => setPointsTop3(e.target.value)}
                className="w-full rounded-md p-2 bg-white/5 ring-1 ring-white/10 text-slate-100 tabular-nums"
              />
            </div>
            <div>
              <label
                htmlFor="pts-finish"
                className="mb-1 block text-xs font-medium text-slate-400"
              >
                Finish
              </label>
              <input
                id="pts-finish"
                type="number"
                min="0"
                value={pointsFinish}
                onChange={(e) => setPointsFinish(e.target.value)}
                className="w-full rounded-md p-2 bg-white/5 ring-1 ring-white/10 text-slate-100 tabular-nums"
              />
            </div>
          </div>
          {create.error && (
            <InlineError message={(create.error as Error).message} />
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg ring-1 ring-white/10 bg-white/5 px-4 py-2 text-slate-200 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={create.isPending}
              className="rounded-lg bg-orange-400 px-4 py-2 text-slate-950 font-bold hover:bg-orange-500 disabled:opacity-50 transition-colors"
            >
              {create.isPending ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
