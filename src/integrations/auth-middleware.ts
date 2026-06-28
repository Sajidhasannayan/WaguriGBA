import { createMiddleware } from "@tanstack/react-start";
import { verifyToken } from "@/lib/jwt";

export const requireAuth = createMiddleware({ type: "function" }).server(
  async ({ next, request }) => {
    const authHeader = request?.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");
    const token = authHeader.slice(7);
    const payload = await verifyToken(token);
    if (!payload) throw new Error("Unauthorized");
    return next({
      context: { userId: payload.sub, email: payload.email, role: payload.role },
    });
  }
);

export const requireAdmin = createMiddleware({ type: "function" }).server(
  async ({ next, request }) => {
    const authHeader = request?.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");
    const token = authHeader.slice(7);
    const payload = await verifyToken(token);
    if (!payload || payload.role !== "admin") throw new Error("Forbidden");
    return next({
      context: { userId: payload.sub, email: payload.email, role: payload.role },
    });
  }
);
