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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900/80 ring-1 ring-white/10 backdrop-blur-xl shadow-2xl shadow-black/50 p-6">
        <h2 className="mb-4 text-xl font-bold tracking-tight text-slate-100">
          Create a group
        </h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label
              htmlFor="group-name"
              className="mb-1 block text-sm font-medium text-slate-300"
            >
              Name
            </label>
            <input
              id="group-name"
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md p-3 bg-white/5 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-orange-400 text-slate-100 placeholder:text-slate-500"
            />
          </div>
          <div>
            <label
              htmlFor="group-description"
              className="mb-1 block text-sm font-medium text-slate-300"
            >
              Description (optional)
            </label>
            <textarea
              id="group-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md p-3 bg-white/5 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-orange-400 text-slate-100 placeholder:text-slate-500"
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
              className="rounded-lg ring-1 ring-white/10 bg-white/5 px-4 py-2 text-slate-200 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={create.isPending}
              className="rounded-lg bg-orange-400 px-4 py-2 text-slate-950 font-bold hover:bg-orange-500 disabled:opacity-50 transition-colors"
            >
              {create.isPending ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
