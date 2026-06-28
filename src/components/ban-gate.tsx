import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { getMe } from "@/lib/fns/auth";

export function BanGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["ban-check", user?.id],
    enabled: !!user,
    queryFn: () => getMe(),
  });

  if (loading) return null;
  if (!user) return <>{children}</>;

  if (profile?.is_banned) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-destructive/10 text-destructive">
          <Ban className="h-8 w-8" />
        </div>
        <h1 className="font-display text-2xl font-bold">Account banned</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Your account has been suspended and you cannot access the site.
          {profile.banned_reason && (
            <span className="mt-1 block">Reason: {profile.banned_reason}</span>
          )}
        </p>
        <Button
          variant="outline"
          onClick={() => {
            localStorage.removeItem("wagurigba_token");
            window.location.href = "/";
          }}
        >
          Sign out
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
