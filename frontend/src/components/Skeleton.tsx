export function SkeletonLine({
  width = "100%",
  height = "0.875rem",
  className = "",
}: {
  width?: string | number;
  height?: string | number;
  className?: string;
}) {
  return (
    <div
      className={`rounded bg-white/40 animate-pulse ${className}`}
      style={{ width, height }}
    />
  );
}

export function SkeletonCircle({
  size = 40,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={`rounded-full bg-white/40 animate-pulse ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export function SkeletonCard({
  className = "",
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl bg-gray-100/40 backdrop-blur-xl shadow-md p-5 ${className}`}
    >
      {children}
    </div>
  );
}

export function GroupCardSkeleton() {
  return (
    <SkeletonCard>
      <div className="flex items-start justify-between gap-3">
        <SkeletonLine width="60%" height="1.25rem" />
        <SkeletonLine width="3rem" height="1rem" />
      </div>
      <SkeletonLine width="80%" height="0.75rem" className="mt-3" />
      <SkeletonLine width="40%" height="0.625rem" className="mt-3" />
    </SkeletonCard>
  );
}

export function FeedEntrySkeleton() {
  return (
    <li className="flex items-start gap-3 rounded-2xl bg-gray-100/40 backdrop-blur-xl shadow-md px-4 py-3">
      <SkeletonCircle size={40} />
      <div className="flex-1 space-y-2 pt-1">
        <SkeletonLine width="70%" />
        <SkeletonLine width="40%" height="0.75rem" />
        <SkeletonLine width="25%" height="0.625rem" />
      </div>
    </li>
  );
}

export function HeaderSkeleton() {
  return (
    <header className="rounded-2xl bg-gray-100/40 backdrop-blur-xl shadow-xl p-6">
      <SkeletonLine width="40%" height="1.875rem" />
      <SkeletonLine width="65%" height="0.875rem" className="mt-2" />
      <SkeletonLine width="55%" height="0.75rem" className="mt-3" />
    </header>
  );
}

export function StatBoxSkeleton() {
  return (
    <div className="rounded-2xl bg-gray-100/40 backdrop-blur-xl shadow-md p-4">
      <SkeletonLine width="50%" height="0.625rem" />
      <SkeletonLine width="80%" height="1.25rem" className="mt-2 mx-auto" />
    </div>
  );
}
