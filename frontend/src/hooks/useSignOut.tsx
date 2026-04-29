import { useMutation, useQueryClient } from "@tanstack/react-query";

const API = process.env.NEXT_PUBLIC_API_URL;

/** Friendly logout — clears the session only. Does not touch any data. */
export function useSignOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API}/auth/strava/signout`, {
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

/** Destructive — revokes Strava token, deletes all user data, clears session. */
export function useDisconnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API}/auth/strava/disconnect`, {
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
