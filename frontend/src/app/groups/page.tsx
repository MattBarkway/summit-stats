"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import CreateGroupModal from "@/components/CreateGroupModal";
import ErrorState from "@/components/ErrorState";
import GroupCard from "@/components/GroupCard";
import JoinGroupForm from "@/components/JoinGroupForm";
import { GroupCardSkeleton } from "@/components/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useGroups } from "@/hooks/useGroups";

export default function GroupsPage() {
  const router = useRouter();
  const { data: user, isLoading: authLoading } = useAuth();
  const { data: groups, isLoading, error, refetch } = useGroups();
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push("/");
  }, [authLoading, user, router]);

  if (authLoading || !user) return null;

  return (
    <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-6">
      <div className="rounded-2xl bg-gray-100/40 backdrop-blur-xl shadow-xl p-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold text-gray-900">My Groups</h1>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="rounded-lg bg-[#3e7f6b]/80 px-4 py-2 font-medium text-white hover:bg-[#358d73] transition-colors duration-200"
          >
            + Create Group
          </button>
        </div>

        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
            Join with invite code
          </h2>
          <JoinGroupForm />
        </section>
      </div>

      <section>
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders have no stable identity
              <GroupCardSkeleton key={`group-skel-${i}`} />
            ))}
          </div>
        ) : error ? (
          <ErrorState
            title="Couldn't load groups"
            message={(error as Error).message}
            onRetry={() => refetch()}
          />
        ) : groups && groups.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((g) => (
              <GroupCard key={g.id} group={g} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-gray-100/40 backdrop-blur-xl shadow-xl p-6 text-center">
            <p className="text-gray-700">
              No groups yet. Create one or join with an invite code.
            </p>
          </div>
        )}
      </section>

      <CreateGroupModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </main>
  );
}
