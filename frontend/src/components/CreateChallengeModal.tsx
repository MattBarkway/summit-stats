"use client";

import { useState } from "react";
import { useCreateChallenge } from "@/hooks/useGroups";
import { InlineError } from "./ErrorState";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl bg-white/40 backdrop-blur-xl shadow-xl p-6">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          New segment challenge
        </h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label
              htmlFor="seg-id"
              className="mb-1 block text-sm font-medium text-gray-700"
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
              className="w-full rounded-md p-3 bg-gray-100/60 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#558d73] text-gray-700"
            />
            <p className="mt-1 text-xs text-gray-600">
              Find at strava.com/segments/&lt;id&gt;
            </p>
          </div>
          <div>
            <label
              htmlFor="seg-ends"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Deadline
            </label>
            <input
              id="seg-ends"
              required
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="w-full rounded-md p-3 bg-gray-100/60 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#558d73] text-gray-700"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label
                htmlFor="pts-winner"
                className="mb-1 block text-xs font-medium text-gray-700"
              >
                Winner
              </label>
              <input
                id="pts-winner"
                type="number"
                min="0"
                value={pointsWinner}
                onChange={(e) => setPointsWinner(e.target.value)}
                className="w-full rounded-md p-2 bg-gray-100/60 border border-gray-300 text-gray-700"
              />
            </div>
            <div>
              <label
                htmlFor="pts-top3"
                className="mb-1 block text-xs font-medium text-gray-700"
              >
                Top 3
              </label>
              <input
                id="pts-top3"
                type="number"
                min="0"
                value={pointsTop3}
                onChange={(e) => setPointsTop3(e.target.value)}
                className="w-full rounded-md p-2 bg-gray-100/60 border border-gray-300 text-gray-700"
              />
            </div>
            <div>
              <label
                htmlFor="pts-finish"
                className="mb-1 block text-xs font-medium text-gray-700"
              >
                Finish
              </label>
              <input
                id="pts-finish"
                type="number"
                min="0"
                value={pointsFinish}
                onChange={(e) => setPointsFinish(e.target.value)}
                className="w-full rounded-md p-2 bg-gray-100/60 border border-gray-300 text-gray-700"
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
              className="rounded-lg border border-gray-300 bg-white/40 px-4 py-2 text-gray-700 hover:bg-white/70 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={create.isPending}
              className="rounded-lg bg-[#3e7f6b]/80 px-4 py-2 text-white hover:bg-[#358d73] disabled:opacity-50 transition-colors"
            >
              {create.isPending ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
