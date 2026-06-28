import { useAuth } from "@/hooks/use-auth";

export function useIsAdmin() {
  const { user, loading } = useAuth();
  return { isAdmin: user?.role === "admin", loading };
}
