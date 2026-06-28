import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Gamepad2, LogIn, UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, signUp } from "@/lib/fns/auth";
import { setStoredToken } from "@/lib/token";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · WaguriGBA" },
      { name: "description", content: "Sign in or create an account to save your progress." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  // Sign-in fields
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  // Sign-up fields
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");

  const [busy, setBusy] = useState(false);

  function switchMode(next: "signin" | "signup") {
    setMode(next);
    setEmailOrUsername("");
    setSignInPassword("");
    setEmail("");
    setUsername("");
    setSignUpPassword("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      let result: { token: string };
      if (mode === "signin") {
        if (!emailOrUsername.trim() || !signInPassword.trim())
          return toast.error("Fill in all fields");
        result = await signIn({ data: { emailOrUsername, password: signInPassword } });
      } else {
        if (!email.trim() || !username.trim() || !signUpPassword.trim())
          return toast.error("Fill in all fields");
        if (signUpPassword.length < 8)
          return toast.error("Password must be at least 8 characters");
        if (!/^[a-zA-Z0-9_]{3,24}$/.test(username.trim()))
          return toast.error("Username must be 3–24 characters: letters, numbers, underscore");
        result = await signUp({ data: { email, username: username.trim(), password: signUpPassword } });
      }
      setStoredToken(result.token);
      toast.success(mode === "signin" ? "Welcome back!" : "Account created!");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-magenta text-primary-foreground ring-glow">
            <Gamepad2 className="h-8 w-8" />
          </div>
          <h1 className="font-display text-2xl font-bold text-gradient-primary">WaguriGBA</h1>
          <p className="text-sm text-muted-foreground">
            {mode === "signin" ? "Sign in to your account" : "Create a new account"}
          </p>
        </div>

        <form onSubmit={submit} className="card-glass space-y-4 rounded-2xl p-6">
          {mode === "signin" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="emailOrUsername">Email or Username</Label>
                <Input
                  id="emailOrUsername"
                  type="text"
                  autoComplete="username"
                  placeholder="you@example.com or yourhandle"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  required
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="flex items-center rounded-md border border-input bg-transparent focus-within:ring-1 focus-within:ring-ring">
                  <span className="pl-3 text-muted-foreground">@</span>
                  <input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                    placeholder="yourhandle"
                    maxLength={24}
                    autoComplete="username"
                    className="h-9 w-full bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">3–24 chars · letters, numbers, underscore · cannot be changed later</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          <Button
            type="submit"
            disabled={busy}
            className="w-full bg-gradient-to-r from-primary to-magenta text-primary-foreground hover:opacity-90"
          >
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : mode === "signin" ? (
              <LogIn className="mr-2 h-4 w-4" />
            ) : (
              <UserPlus className="mr-2 h-4 w-4" />
            )}
            {mode === "signin" ? "Sign in" : "Create account"}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {mode === "signin"
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
