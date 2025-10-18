import { useQuery } from "@tanstack/react-query";
import { Athlete } from "@/hooks/useAthlete";

async function fetchAuth(): Promise<Athlete | null> {
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
