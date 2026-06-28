import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { pingPresence } from "@/lib/presence";

/** Heartbeat for the signed-in user so last_seen stays fresh site-wide. */
export function PresencePinger() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    pingPresence(null, null).catch(() => {});
    const i = setInterval(() => {
      pingPresence(null, null).catch(() => {});
    }, 60 * 1000);
    return () => clearInterval(i);
  }, [user]);
  return null;
}