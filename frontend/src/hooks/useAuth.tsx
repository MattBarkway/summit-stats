import { useQuery } from "@tanstack/react-query";

export type Me = {
  id?: number;
  firstname?: string;
  lastname?: string;
  profile?: string;
  profile_medium?: string;
};

async function fetchAuth(): Promise<Me | null> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/me`, {
    credentials: "include",
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error("Failed to fetch auth state");
  return res.json();
}

export function useAuth() {
  return useQuery({
    queryKey: ["auth"],
    queryFn: fetchAuth,
    staleTime: 1000 * 60 * 5,
  });
}
