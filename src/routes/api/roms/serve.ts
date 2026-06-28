import { createFileRoute } from "@tanstack/react-router";
import { promises as fs } from "node:fs";
import path from "node:path";

const ALLOWED_EXT = new Set(["gba", "zip", "gbc", "gb"]);
const MIME: Record<string, string> = {
  gba: "application/octet-stream",
  gbc: "application/octet-stream",
  gb: "application/octet-stream",
  zip: "application/zip",
};

export const Route = createFileRoute("/api/roms/serve")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const filename = url.searchParams.get("file") ?? "";

        if (!filename || !/^[a-zA-Z0-9._-]+$/.test(filename)) {
          return new Response("Not found", { status: 404 });
        }

        const ext = filename.split(".").pop()?.toLowerCase() ?? "";
        if (!ALLOWED_EXT.has(ext)) {
          return new Response("Not found", { status: 404 });
        }

        const filePath = path.join(process.cwd(), "public", "roms", filename);
        try {
          const buf = await fs.readFile(filePath);
          return new Response(buf, {
            headers: {
              "Content-Type": MIME[ext] ?? "application/octet-stream",
              "Content-Length": buf.byteLength.toString(),
              "Cache-Control": "public, max-age=31536000",
            },
          });
        } catch {
          return new Response("ROM file not found", { status: 404 });
        }
      },
    },
  },
});
