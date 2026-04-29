import { useMutation, useQueryClient } from "@tanstack/react-query";

const API = process.env.NEXT_PUBLIC_API_URL;

export function useSignOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API}/auth/strava/deauth`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`${res.status}: ${await res.text()}`);
      }
    },
    onSuccess: () => qc.clear(),
  });
}
