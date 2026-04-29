"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCreateGroup } from "@/hooks/useGroups";
import { InlineError } from "./ErrorState";

export default function CreateGroupModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const create = useCreateGroup();

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const group = await create.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
    });
    onClose();
    setName("");
    setDescription("");
    router.push(`/groups/${group.id}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl bg-white/40 backdrop-blur-xl shadow-xl p-6">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Create a group
        </h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label
              htmlFor="group-name"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Name
            </label>
            <input
              id="group-name"
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md p-3 bg-gray-100/60 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#558d73] text-gray-700"
            />
          </div>
          <div>
            <label
              htmlFor="group-description"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Description (optional)
            </label>
            <textarea
              id="group-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md p-3 bg-gray-100/60 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#558d73] text-gray-700"
              rows={3}
            />
          </div>
          {create.error && (
            <InlineError message={(create.error as Error).message} />
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white/40 px-4 py-2 text-gray-700 hover:bg-white/70 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={create.isPending}
              className="rounded-lg bg-[#3e7f6b]/80 px-4 py-2 text-white hover:bg-[#358d73] disabled:opacity-50 transition-colors duration-200"
            >
              {create.isPending ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
