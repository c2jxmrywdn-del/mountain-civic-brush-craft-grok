import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { OpenState, StudioHandle, StudioView, Telemetry } from "@/studio/createStudio";

export const Route = createFileRoute("/")({ component: Home });

const VIEWS: { id: StudioView; label: string }[] = [
  { id: "front", label: "Front" },
  { id: "side", label: "Side" },
  { id: "rear", label: "Rear" },
  { id: "cabin", label: "Cabin" },
  { id: "bay", label: "Bay" },
];

function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const studioRef = useRef<StudioHandle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [telemetry, setTelemetry] = useState<Telemetry>({
    rpm: 0,
    running: false,
    muted: false,
    available: true,
  });
  const [open, setOpen] = useState<OpenState>({ left: false, right: false, hood: false, engine: false });
  const [throttle, setThrottle] = useState(0);
  const [view, setView] = useState<StudioView>("front");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let handle: StudioHandle | null = null;
    let cancelled = false;
    void (async () => {
      try {
        const { createStudio } = await import("@/studio/createStudio");
        if (cancelled) return;
        handle = createStudio(canvas, {
          onTelemetry: setTelemetry,
          onParts: setOpen,
        });
        studioRef.current = handle;
        setReady(true);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "The studio could not start.");
      }
    })();
    return () => {
      cancelled = true;
      handle?.dispose();
      studioRef.current = null;
    };
  }, []);

  function chooseView(next: StudioView) {
    setView(next);
    const studio = studioRef.current;
    studio?.setView(next);
    const panels = studio?.getOpenState();
    if (next === "cabin" && panels && !panels.left) studio?.toggleDoor("left");
    if (next === "bay" && panels && !panels.engine) studio?.toggleHatch();
  }

  return (
    <main className="studio-shell relative">
      <canvas ref={canvasRef} className="studio-canvas" aria-label="Helion GT in a white studio. Drag to orbit. Click a door, the front lid, or the engine cover." />
      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4 sm:p-6">
        <div className="studio-bar pointer-events-auto rounded-2xl px-4 py-3">
          <p className="font-display text-2xl leading-none text-ink">Helion GT</p>
          <p className="mt-1 text-sm text-muted">Mid-engine study · pearl silver</p>
        </div>
        <div className="studio-bar pointer-events-auto rounded-2xl px-4 py-3 text-right">
          <p className="text-xs tracking-widest text-muted uppercase">Atelier</p>
          <p className="font-display text-xl leading-none text-ink">{telemetry.running ? `${Math.round(telemetry.rpm)} rpm` : "Engine off"}</p>
        </div>
      </header>
      <footer className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-4 sm:p-6">
        <div className="studio-bar flex flex-wrap items-center gap-2 rounded-2xl p-2">
          {VIEWS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={view === item.id}
              className={
                view === item.id
                  ? "rounded-full bg-ink px-3 py-2 text-sm text-panel"
                  : "rounded-full px-3 py-2 text-sm text-ink"
              }
              onClick={() => chooseView(item.id)}
            >
              {item.label}
            </button>
          ))}
          <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
          <Toggle label="Left door" pressed={open.left} onClick={() => studioRef.current?.toggleDoor("left")} />
          <Toggle label="Right door" pressed={open.right} onClick={() => studioRef.current?.toggleDoor("right")} />
          <Toggle label="Front lid" pressed={open.hood} onClick={() => studioRef.current?.toggleHood()} />
          <Toggle label="Engine cover" pressed={open.engine} onClick={() => studioRef.current?.toggleHatch()} />
        </div>
        <div className="studio-bar flex flex-wrap items-center gap-3 rounded-2xl px-3 py-2">
          <button
            type="button"
            className="rounded-full bg-accent px-4 py-2 text-sm text-accent-ink"
            onClick={() => {
              if (telemetry.running) {
                studioRef.current?.stop();
                setThrottle(0);
              } else {
                studioRef.current?.start();
              }
            }}
          >
            {telemetry.running ? "Stop engine" : "Start engine"}
          </button>
          <label className="flex min-w-40 flex-1 items-center gap-3 text-sm text-muted">
            Throttle
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(throttle * 100)}
              disabled={!telemetry.running}
              aria-label="Throttle"
              onChange={(event) => {
                const next = Number(event.target.value) / 100;
                setThrottle(next);
                studioRef.current?.setThrottle(next);
              }}
            />
          </label>
          <button
            type="button"
            aria-pressed={telemetry.muted}
            className="rounded-full border border-line px-3 py-2 text-sm text-ink"
            onClick={() => studioRef.current?.setMuted(!telemetry.muted)}
          >
            {telemetry.muted ? "Unmute" : "Mute"}
          </button>
          {!telemetry.available && <span className="text-sm text-muted">Sound unavailable</span>}
        </div>
      </footer>
      {!ready && !error && (
        <p className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-sm text-muted">
          Lighting the studio…
        </p>
      )}
      {error && (
        <p className="studio-bar absolute top-1/2 left-1/2 max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl px-4 py-3 text-sm text-ink">
          {error}
        </p>
      )}
    </main>
  );
}

function Toggle({ label, pressed, onClick }: { label: string; pressed: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={
        pressed
          ? "rounded-full bg-accent px-3 py-2 text-sm text-accent-ink"
          : "rounded-full border border-line px-3 py-2 text-sm text-ink"
      }
    >
      {label}
    </button>
  );
}
