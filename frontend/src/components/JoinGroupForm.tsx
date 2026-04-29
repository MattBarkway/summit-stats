"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useJoinGroup } from "@/hooks/useGroups";
import { InlineError } from "./ErrorState";

export default function JoinGroupForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const join = useJoinGroup();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    const group = await join.mutateAsync(code.trim());
    setCode("");
    router.push(`/groups/${group.id}`);
  };

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Invite code"
        className="flex-1 rounded-md p-3 bg-gray-100/60 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#558d73] text-gray-700 font-mono text-sm"
      />
      <button
        type="submit"
        disabled={join.isPending}
        className="rounded-lg bg-[#3e7f6b]/80 px-5 text-white hover:bg-[#358d73] disabled:opacity-50 transition-colors duration-200"
      >
        {join.isPending ? "Joining..." : "Join"}
      </button>
      {join.error && <InlineError message={(join.error as Error).message} />}
    </form>
  );
}
