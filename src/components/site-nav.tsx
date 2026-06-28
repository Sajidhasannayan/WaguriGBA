import { Link, useNavigate } from "@tanstack/react-router";
import { Gamepad2, Library, User as UserIcon, LogIn, LogOut, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { isOnline } from "@/lib/presence";
import { clearStoredToken } from "@/lib/token";
import { searchUsers } from "@/lib/fns/admin";

export function SiteNav() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<
    Array<{
      id: string;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      last_seen: string | null;
    }>
  >([]);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const term = q.trim();
    const t = setTimeout(async () => {
      try {
        const data = await searchUsers({ data: { q: term } });
        setResults(data);
      } catch {
        setResults([]);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  function signOut() {
    clearStoredToken();
    navigate({ to: "/" });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-magenta text-primary-foreground ring-glow">
            <Gamepad2 className="h-5 w-5" />
          </div>
          <span className="text-gradient-primary">WaguriGBA</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          <Link
            to="/library"
            className="rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-surface hover:text-foreground [&.active]:text-foreground"
          >
            <span className="inline-flex items-center gap-2">
              <Library className="h-4 w-4" />Library
            </span>
          </Link>
          {user && (
            <Link
              to="/profile"
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-surface hover:text-foreground [&.active]:text-foreground"
            >
              <span className="inline-flex items-center gap-2">
                <UserIcon className="h-4 w-4" />Profile
              </span>
            </Link>
          )}
        </nav>
        <div ref={boxRef} className="relative hidden flex-1 max-w-xs md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Find players…"
            className="h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
          {open && q.trim() && (
            <div className="absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-lg border border-border bg-card shadow-xl">
              {results.length === 0 ? (
                <div className="p-3 text-xs text-muted-foreground">No players found.</div>
              ) : (
                results.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setOpen(false);
                      setQ("");
                      navigate({ to: "/u/$username", params: { username: r.username } });
                    }}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-surface"
                  >
                    <UserAvatar
                      src={r.avatar_url}
                      name={r.display_name ?? r.username}
                      size="sm"
                      online={isOnline(r.last_seen)}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm">{r.display_name ?? r.username}</div>
                      <div className="truncate text-xs text-muted-foreground">@{r.username}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link to="/profile" className="md:hidden">
                <UserAvatar src={null} name={user.email} size="sm" />
              </Link>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />Sign out
              </Button>
            </>
          ) : (
            <Button
              asChild
              size="sm"
              className="bg-gradient-to-r from-primary to-magenta text-primary-foreground hover:opacity-90"
            >
              <Link to="/auth">
                <LogIn className="mr-2 h-4 w-4" />Sign in
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
