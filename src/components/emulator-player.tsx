import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Cloud, CloudUpload, Download, Save, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { downloadSaveForSlug, uploadSaveForSlug } from "@/lib/saves";
import { pingPresence, startPlaySession, endPlaySession } from "@/lib/presence";

type Props = {
  romSlug: string;
  romTitle: string;
  romId?: string | null;
  preloadedRomUrl?: string | null;
};

declare global {
  interface Window {
    EJS_player?: string;
    EJS_core?: string;
    EJS_gameUrl?: string;
    EJS_gameName?: string;
    EJS_pathtodata?: string;
    EJS_ready?: () => void;
    EJS_emulator?: {
      gameManager?: {
        getSaveFile?: () => Uint8Array;
        loadSaveFile?: (data: Uint8Array) => void;
      };
    };
    EJS_startOnLoaded?: boolean;
    EJS_color?: string;
  }
}

const EJS_CDN = "https://cdn.emulatorjs.org/stable/data/";

function isExternalUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

function toProxyUrl(url: string): string {
  return `/api/roms/proxy?url=${encodeURIComponent(url)}`;
}

export function EmulatorPlayer({ romSlug, romTitle, romId, preloadedRomUrl }: Props) {
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);

  // rawUrl: the URL stored in catalog (local path or external https://)
  const [rawUrl, setRawUrl] = useState<string | null>(null);
  // ejsUrl: resolved blob:// or local path ready for EmulatorJS
  const [ejsUrl, setEjsUrl] = useState<string | null>(null);

  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [started, setStarted] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const sessionIdRef = useRef<string | null>(null);
  const sessionStartRef = useRef<number>(0);
  const blobRef = useRef<string | null>(null);

  // Set rawUrl from preloaded catalog entry
  useEffect(() => {
    if (preloadedRomUrl && !rawUrl) setRawUrl(preloadedRomUrl);
  }, [preloadedRomUrl, rawUrl]);

  // When user picks a local file
  function onPickRom(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setRawUrl(url);
  }

  // Resolve rawUrl → ejsUrl
  // External URLs (Google Drive, etc.) are fetched via proxy → blob URL
  // Local/blob URLs are used directly
  useEffect(() => {
    if (!rawUrl) return;

    // Already a blob or local path — use directly
    if (rawUrl.startsWith("blob:") || rawUrl.startsWith("/")) {
      setEjsUrl(rawUrl);
      return;
    }

    // External URL — download via server proxy with progress
    if (isExternalUrl(rawUrl)) {
      let cancelled = false;
      setDownloading(true);
      setDownloadProgress(0);

      (async () => {
        try {
          const proxyUrl = toProxyUrl(rawUrl);
          const res = await fetch(proxyUrl);
          if (!res.ok) throw new Error(`Download failed (${res.status})`);

          const contentLength = res.headers.get("Content-Length");
          const total = contentLength ? parseInt(contentLength) : 0;

          if (!res.body) throw new Error("No response body");

          const reader = res.body.getReader();
          const chunks: Uint8Array[] = [];
          let received = 0;

          while (true) {
            const { done, value } = await reader.read();
            if (cancelled) return;
            if (done) break;
            chunks.push(value);
            received += value.length;
            if (total > 0) {
              setDownloadProgress(Math.round((received / total) * 100));
            } else {
              // Unknown size — pulse between 10–90
              setDownloadProgress((p) => Math.min(90, p + 2));
            }
          }

          const merged = new Uint8Array(received);
          let offset = 0;
          for (const chunk of chunks) {
            merged.set(chunk, offset);
            offset += chunk.length;
          }

          const blob = new Blob([merged], { type: "application/octet-stream" });
          const blobUrl = URL.createObjectURL(blob);
          blobRef.current = blobUrl;

          if (!cancelled) {
            setDownloadProgress(100);
            setEjsUrl(blobUrl);
          }
        } catch (err) {
          if (!cancelled) {
            toast.error(err instanceof Error ? err.message : "ROM download failed");
          }
        } finally {
          if (!cancelled) setDownloading(false);
        }
      })();

      return () => {
        cancelled = true;
        setDownloading(false);
      };
    }
  }, [rawUrl]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
    };
  }, []);

  // Boot EmulatorJS once ejsUrl is ready
  useEffect(() => {
    if (!ejsUrl || started) return;
    if (!containerRef.current) return;

    window.EJS_player = "#waguri-emu";
    window.EJS_core = "gba";
    window.EJS_gameUrl = ejsUrl;
    window.EJS_gameName = romSlug;
    window.EJS_pathtodata = EJS_CDN;
    window.EJS_startOnLoaded = true;
    window.EJS_color = "#a259ff";
    (window as unknown as { EJS_VirtualGamepadSettings?: unknown }).EJS_VirtualGamepadSettings = undefined;
    (window as unknown as { EJS_Buttons?: Record<string, boolean> }).EJS_Buttons = {
      virtualGamepad: true,
      virtualGamepadSettings: true,
    };
    window.EJS_ready = async () => {
      setReady(true);
      if (user) {
        try {
          const data = await downloadSaveForSlug(user.id, romSlug);
          if (data && window.EJS_emulator?.gameManager?.loadSaveFile) {
            window.EJS_emulator.gameManager.loadSaveFile(data);
            toast.success("Cloud save loaded");
          }
        } catch {
          // silent — no save yet is normal
        }
      }
    };

    const script = document.createElement("script");
    script.src = `${EJS_CDN}loader.js`;
    script.async = true;
    document.body.appendChild(script);
    setStarted(true);

    return () => {
      try { document.body.removeChild(script); } catch { /* noop */ }
    };
  }, [ejsUrl, started, romSlug, user]);

  // Presence heartbeat + play session tracking
  useEffect(() => {
    if (!user || !ready) return;
    let cancelled = false;
    (async () => {
      sessionIdRef.current = await startPlaySession(romSlug, romTitle);
      sessionStartRef.current = Date.now();
      if (!cancelled) await pingPresence(romSlug, romTitle);
    })();
    const beat = setInterval(() => { pingPresence(romSlug, romTitle).catch(() => {}); }, 45_000);
    const flush = () => {
      const secs = (Date.now() - sessionStartRef.current) / 1000;
      endPlaySession(sessionIdRef.current, secs).catch(() => {});
    };
    window.addEventListener("beforeunload", flush);
    return () => {
      cancelled = true;
      clearInterval(beat);
      window.removeEventListener("beforeunload", flush);
      flush();
      pingPresence(null, null).catch(() => {});
    };
  }, [user, ready, romSlug, romTitle]);

  async function saveToCloud() {
    if (!user) return toast.error("Sign in to use cloud saves");
    const data = window.EJS_emulator?.gameManager?.getSaveFile?.();
    if (!data || data.length === 0) return toast.error("No in-game save yet — save inside the game first");
    setBusy(true);
    try {
      await uploadSaveForSlug(user.id, romSlug, romTitle, data, romId);
      toast.success(`Saved ${romSlug}.sav to cloud`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally { setBusy(false); }
  }

  async function loadFromCloud() {
    if (!user) return toast.error("Sign in to use cloud saves");
    setBusy(true);
    try {
      const data = await downloadSaveForSlug(user.id, romSlug);
      if (!data) return toast.error("No cloud save for this game yet");
      window.EJS_emulator?.gameManager?.loadSaveFile?.(data);
      toast.success("Cloud save loaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    } finally { setBusy(false); }
  }

  function downloadLocal() {
    const data = window.EJS_emulator?.gameManager?.getSaveFile?.();
    if (!data) return toast.error("No save data available");
    const blob = new Blob([data.slice().buffer], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${romSlug}.sav`; a.click();
    URL.revokeObjectURL(url);
  }

  function uploadLocal(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    f.arrayBuffer().then((buf) => {
      window.EJS_emulator?.gameManager?.loadSaveFile?.(new Uint8Array(buf));
      toast.success("Local .sav loaded into emulator");
    });
  }

  // ── No ROM selected yet ──────────────────────────────────────────────────────
  if (!rawUrl) {
    return (
      <div className="card-glass rounded-2xl p-10 text-center">
        <h2 className="font-display text-2xl font-semibold">Load your ROM file</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          WaguriGBA never hosts copyrighted ROMs. Pick a{" "}
          <code className="font-mono text-cyan">.gba</code> file from your device to start playing — it stays in your browser.
        </p>
        <label className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-magenta px-5 py-3 text-sm font-medium text-primary-foreground ring-glow">
          <Upload className="h-4 w-4" />
          Choose .gba file
          <input type="file" accept=".gba,.zip" className="hidden" onChange={onPickRom} />
        </label>
      </div>
    );
  }

  // ── Downloading external ROM ─────────────────────────────────────────────────
  if (downloading) {
    return (
      <div className="card-glass rounded-2xl p-10 text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
        <h2 className="mt-4 font-display text-xl font-semibold">Downloading ROM…</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Fetching game data to your browser. This may take a moment.
        </p>
        {downloadProgress > 0 && (
          <div className="mx-auto mt-5 max-w-xs">
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-magenta transition-all duration-200"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{downloadProgress}%</p>
          </div>
        )}
      </div>
    );
  }

  // ── Emulator ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="card-glass overflow-hidden rounded-2xl p-2">
        <div className="relative aspect-video w-full bg-black">
          <div id="waguri-emu" ref={containerRef} className="absolute inset-0" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={saveToCloud} disabled={!ready || busy} className="bg-gradient-to-r from-primary to-magenta text-primary-foreground">
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CloudUpload className="mr-2 h-4 w-4" />}Save to cloud
        </Button>
        <Button onClick={loadFromCloud} disabled={!ready || busy} variant="outline">
          <Cloud className="mr-2 h-4 w-4" />Load from cloud
        </Button>
        <Button onClick={downloadLocal} disabled={!ready} variant="outline">
          <Download className="mr-2 h-4 w-4" />Download .sav
        </Button>
        <label className="inline-flex cursor-pointer items-center rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-surface">
          <Save className="mr-2 h-4 w-4" />Load .sav file
          <input type="file" accept=".sav,.srm" className="hidden" onChange={uploadLocal} />
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        Tip: save inside the game (in-game menu) first, then click{" "}
        <span className="text-foreground">Save to cloud</span> so your{" "}
        <span className="font-mono text-cyan">{romSlug}.sav</span> persists across devices.
      </p>
    </div>
  );
}
