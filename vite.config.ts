import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const deployTarget = process.env.DEPLOY_TARGET ?? "cloudflare";
const nitroPreset =
  deployTarget === "node" ? "node-server" : "cloudflare-module";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  nitro: {
    preset: nitroPreset,
  },
  vite: {
    server: {
      host: "0.0.0.0",
      port: 5000,
      allowedHosts: true,
    },
  },
});
