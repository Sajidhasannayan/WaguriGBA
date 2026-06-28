import { createFileRoute } from "@tanstack/react-router";

const ALLOWED_HOSTS = new Set([
  "drive.usercontent.google.com",
  "drive.google.com",
  "docs.google.com",
]);

const MAX_SIZE = 96 * 1024 * 1024; // 96 MB hard cap

export const Route = createFileRoute("/api/roms/proxy")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const rawUrl = new URL(request.url).searchParams.get("url");
        if (!rawUrl) {
          return new Response("Missing url param", { status: 400 });
        }

        let target: URL;
        try {
          target = new URL(rawUrl);
        } catch {
          return new Response("Invalid URL", { status: 400 });
        }

        if (!ALLOWED_HOSTS.has(target.hostname)) {
          return new Response("Domain not allowed", { status: 403 });
        }

        let upstream: Response;
        try {
          upstream = await fetch(target.toString(), {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
            redirect: "follow",
          });
        } catch (err) {
          return new Response(`Failed to reach upstream: ${String(err)}`, {
            status: 502,
          });
        }

        if (!upstream.ok) {
          return new Response(`Upstream returned ${upstream.status}`, {
            status: 502,
          });
        }

        const contentLength = upstream.headers.get("Content-Length");
        if (contentLength && parseInt(contentLength) > MAX_SIZE) {
          return new Response("File too large (max 96 MB)", { status: 413 });
        }

        const contentType =
          upstream.headers.get("Content-Type") ?? "application/octet-stream";

        const headers: Record<string, string> = {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=3600",
          "Access-Control-Allow-Origin": "*",
        };
        if (contentLength) headers["Content-Length"] = contentLength;

        return new Response(upstream.body, { status: 200, headers });
      },
    },
  },
});
