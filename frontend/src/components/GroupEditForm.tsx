"use client";

import { useState } from "react";
import type { GroupDetail } from "@/hooks/useGroups";
import { useEditGroup } from "@/hooks/useGroups";
import { InlineError } from "./ErrorState";

export default function GroupEditForm({
  group,
  open,
  onClose,
}: {
  group: GroupDetail;
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? "");
  const [iconUrl, setIconUrl] = useState(group.icon_url ?? "");
  const edit = useEditGroup(group.id);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedIcon = iconUrl.trim();
    await edit.mutateAsync({
      name: name.trim(),
      description: description.trim() || null,
      icon_url: trimmedIcon === "" ? null : trimmedIcon,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl bg-white/40 backdrop-blur-xl shadow-xl p-6">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Edit group</h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label
              htmlFor="edit-group-name"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Name
            </label>
            <input
              id="edit-group-name"
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md p-3 bg-gray-100/60 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#558d73] text-gray-700"
            />
          </div>
          <div>
            <label
              htmlFor="edit-group-description"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Description
            </label>
            <textarea
              id="edit-group-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md p-3 bg-gray-100/60 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#558d73] text-gray-700"
              rows={3}
            />
          </div>
          <div>
            <label
              htmlFor="edit-group-icon"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Icon URL (optional)
            </label>
            <input
              id="edit-group-icon"
              type="url"
              placeholder="https://…"
              value={iconUrl}
              onChange={(e) => setIconUrl(e.target.value)}
              className="w-full rounded-md p-3 bg-gray-100/60 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#558d73] text-gray-700"
            />
            <p className="mt-1 text-xs text-gray-600">
              Must start with https://. Leave blank for the auto-generated
              avatar.
            </p>
          </div>
          {edit.error && (
            <InlineError message={(edit.error as Error).message} />
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
              disabled={edit.isPending}
              className="rounded-lg bg-[#3e7f6b]/80 px-4 py-2 text-white hover:bg-[#358d73] disabled:opacity-50 transition-colors"
            >
              {edit.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
