import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getStoredToken, decodeToken } from "@/lib/token";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const token = getStoredToken();
    if (!token) throw redirect({ to: "/auth" });
    const user = decodeToken(token);
    if (!user) {
      localStorage.removeItem("wagurigba_token");
      throw redirect({ to: "/auth" });
    }
    return { user };
  },
  component: () => <Outlet />,
});
