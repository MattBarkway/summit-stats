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
        className="flex-1 rounded-md p-3 bg-white/5 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-orange-400 text-slate-100 placeholder:text-slate-500 font-mono text-sm"
      />
      <button
        type="submit"
        disabled={join.isPending}
        className="rounded-lg bg-orange-400 px-5 text-slate-950 font-bold hover:bg-orange-500 disabled:opacity-50 transition-colors duration-200"
      >
        {join.isPending ? "Joining..." : "Join"}
      </button>
      {join.error && <InlineError message={(join.error as Error).message} />}
    </form>
  );
}
