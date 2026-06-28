import { useEffect, useState } from "react";
import { decodeToken, getStoredToken, AUTH_EVENT, type AuthUser } from "@/lib/token";

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getStoredToken();
    setUser(token ? decodeToken(token) : null);
    setLoading(false);

    function onAuthChange() {
      const t = getStoredToken();
      setUser(t ? decodeToken(t) : null);
    }
    window.addEventListener(AUTH_EVENT, onAuthChange);
    return () => window.removeEventListener(AUTH_EVENT, onAuthChange);
  }, []);

  return { user, loading };
}
