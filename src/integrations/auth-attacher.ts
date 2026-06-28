import { createMiddleware } from "@tanstack/react-start";
import { TOKEN_KEY } from "@/lib/token";

export const attachAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }
);
