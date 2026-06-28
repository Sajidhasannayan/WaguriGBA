import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () =>
        Response.json(
          { status: "ok", uptime: process.uptime?.() ?? null, timestamp: new Date().toISOString() },
          { headers: { "cache-control": "no-store" } },
        ),
    },
  },
});