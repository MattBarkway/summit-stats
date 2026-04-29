"use client";

import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import CyclePill from "@/components/CyclePill";
import ErrorState from "@/components/ErrorState";
import GroupIcon from "@/components/GroupIcon";
import { useAuth } from "@/hooks/useAuth";
import { useGroupPreview, useJoinGroup } from "@/hooks/useGroups";

export default function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();
  const { data: user, isLoading: authLoading } = useAuth();
  const {
    data: preview,
    isLoading: previewLoading,
    error: previewError,
  } = useGroupPreview(code);
  const join = useJoinGroup();
  const [bouncedToAuth, setBouncedToAuth] = useState(false);

  useEffect(() => {
    if (authLoading || bouncedToAuth) return;
    if (!user) {
      setBouncedToAuth(true);
      const next = encodeURIComponent(`/join/${code}`);
      window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/strava?next=${next}`;
    }
  }, [authLoading, user, code, bouncedToAuth]);

  const handleJoin = async () => {
    const group = await join.mutateAsync(code);
    router.push(`/groups/${group.id}`);
  };

  if (previewError) {
    return (
      <main className="mx-auto max-w-md px-4 py-12">
        <ErrorState
          title="Invite not found"
          message="This invite code doesn't match any group. Check the link and try again."
        />
      </main>
    );
  }

  if (previewLoading || !preview) {
    return (
      <main className="mx-auto max-w-md px-4 py-12">
        <div className="rounded-2xl bg-gray-100/40 backdrop-blur-xl shadow-xl p-6">
          <p className="text-center text-gray-700">Loading invite…</p>
        </div>
      </main>
    );
  }

  const groupForIcon = {
    id: code,
    name: preview.name,
    icon_url: preview.icon_url,
  };

  const cta =
    !user && !authLoading
      ? "Connect Strava to join"
      : authLoading || !user
        ? "Redirecting to Strava…"
        : join.isPending
          ? "Joining…"
          : `Join ${preview.name}`;

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-2xl bg-gray-100/40 backdrop-blur-xl shadow-xl p-6">
        <div className="flex flex-col items-center text-center">
          <GroupIcon group={groupForIcon} size={72} />
          <h1 className="mt-4 text-2xl font-semibold text-gray-900">
            {preview.name}
          </h1>
          <p className="mt-1 text-sm text-gray-700">
            Invited by {preview.owner_name} · {preview.member_count} member
            {preview.member_count === 1 ? "" : "s"}
          </p>
          <div className="mt-3">
            <CyclePill info={preview} compact />
          </div>
        </div>

        {join.error && (
          <div className="mt-4">
            <ErrorState
              title="Couldn't join"
              message={(join.error as Error).message}
            />
          </div>
        )}

        <div className="mt-6 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/groups")}
            className="rounded-lg border border-gray-300 bg-white/40 px-4 py-2 text-gray-700 hover:bg-white/70 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleJoin}
            disabled={!user || join.isPending}
            className="rounded-lg bg-[#3e7f6b]/80 px-4 py-2 text-white hover:bg-[#358d73] disabled:opacity-50 transition-colors"
          >
            {cta}
          </button>
        </div>
      </div>
    </main>
  );
}
