import { createFileRoute } from "@tanstack/react-router";
import { promises as fs } from "node:fs";
import path from "node:path";
import { verifyToken } from "@/lib/jwt";

const ALLOWED_EXT = new Set(["gba", "zip", "gbc", "gb"]);
const MAX_BYTES = 64 * 1024 * 1024; // 64 MB

export const Route = createFileRoute("/api/roms/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        if (!auth.startsWith("Bearer ")) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        const payload = await verifyToken(auth.slice(7));
        if (!payload || payload.role !== "admin") {
          return Response.json({ error: "Forbidden" }, { status: 403 });
        }

        let formData: FormData;
        try {
          formData = await request.formData();
        } catch {
          return Response.json({ error: "Invalid multipart body" }, { status: 400 });
        }

        const file = formData.get("file");
        if (!(file instanceof File)) {
          return Response.json({ error: "No file field in request" }, { status: 400 });
        }

        if (file.size > MAX_BYTES) {
          return Response.json({ error: "File exceeds 64 MB limit" }, { status: 413 });
        }

        const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
        if (!ALLOWED_EXT.has(ext)) {
          return Response.json(
            { error: "Only .gba, .gbc, .gb, and .zip files are allowed" },
            { status: 400 }
          );
        }

        const base = file.name
          .replace(/\.[^.]+$/, "")
          .replace(/[^a-zA-Z0-9._\-\s]/g, "")
          .trim()
          .replace(/\s+/g, "_")
          .slice(0, 60);
        const safeName = `${base || "rom"}_${Date.now()}.${ext}`;

        const destDir = path.join(process.cwd(), "public", "roms");
        await fs.mkdir(destDir, { recursive: true });
        const destPath = path.join(destDir, safeName);

        const buf = Buffer.from(await file.arrayBuffer());
        await fs.writeFile(destPath, buf);

        return Response.json({
          url: `/api/roms/serve?file=${encodeURIComponent(safeName)}`,
          filename: safeName,
        });
      },
    },
  },
});
