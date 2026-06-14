"use client";

import { useEffect, useRef } from "react";

/*
  Calm ASCII "flowfield" backdrop for the auth brand panel - a minimal port of
  the marketing-site field (single variant, non-interactive). Domain-warped
  turbulence rendered as a monospace glyph field in brand green.
*/

const RAMP = " .·:-=+*coO0#%@".split("");

export function AuthBackdrop({
  cell = 12,
  speed = 0.55,
  color = "#22c58a",
  dim = "rgba(34,197,138,0.18)",
}: {
  cell?: number;
  speed?: number;
  color?: string;
  dim?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0;
    let H = 0;
    let cols = 0;
    let rows = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      W = r.width;
      H = r.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.max(1, Math.floor(W / cell));
      rows = Math.max(1, Math.floor(H / cell));
      ctx.font = `${cell}px ui-monospace, "SFMono-Regular", monospace`;
      ctx.textBaseline = "top";
    };

    const field = (cx: number, cy: number, t: number) => {
      const tt = t * 0.3 * speed;
      let x = cx * 0.012;
      let y = cy * 0.012;
      x += Math.sin(y * 1.7 + tt) + 0.5 * Math.sin(y * 3.1 - tt * 1.3);
      y += Math.sin(x * 1.5 - tt * 0.9) + 0.5 * Math.sin(x * 2.7 + tt);
      const v =
        Math.sin(x * 1.3) * Math.cos(y * 1.1) +
        0.5 * Math.sin(x * 2.6 + y * 1.7) +
        0.25 * Math.cos(x * 4.1 - y * 3.3);
      return Math.pow(Math.max(0, (v / 1.75) * 0.5 + 0.5), 1.4);
    };

    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, W, H);
      for (let gy = 0; gy < rows; gy++) {
        for (let gx = 0; gx < cols; gx++) {
          const bri = field(gx * cell + cell * 0.5, gy * cell + cell * 0.5, t);
          if (bri < 0.08) continue;
          const ch =
            RAMP[
              Math.min(RAMP.length - 1, Math.floor(bri * (RAMP.length - 1)))
            ];
          if (ch === " ") continue;
          ctx.globalAlpha = Math.min(1, 0.25 + bri * 0.85);
          ctx.fillStyle = bri > 0.6 ? color : dim;
          ctx.fillText(ch, gx * cell, gy * cell);
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [cell, speed, color, dim]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="h-full w-full"
      style={{ display: "block" }}
    />
  );
}
