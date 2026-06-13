import { GeistPixelLine } from "geist/font/pixel";
import { AuthBackdrop } from "./auth-backdrop";

/*
  Auth brand panel (right column, lg+). Always near-black so the brand reads the
  same in light or dark mode. Flowfield backdrop + mark + one tagline + a quiet
  trust line - orient and reassure, don't sell.
*/
export function BrandPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-[#161310] lg:block">
      {/* animated backdrop, masked to fade toward the form edge */}
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          maskImage:
            "radial-gradient(120% 90% at 60% 45%, black 40%, transparent 85%)",
          WebkitMaskImage:
            "radial-gradient(120% 90% at 60% 45%, black 40%, transparent 85%)",
        }}
      >
        <AuthBackdrop />
      </div>

      {/* giant faint "0" monogram - pixel glyph (blocky, rectangular) */}
      {/* <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex select-none items-center justify-center"
      >
        <span
          className={`${GeistPixelGrid.className} leading-none text-[#828b97]/20 text-[clamp(18rem,34vw,46rem)]`}
        >
          0
        </span>
      </div> */}

      {/* content overlay */}
      <div className="relative flex h-full flex-col justify-between p-10 text-[#dde2e8]">
        <div className="flex items-center gap-2.5">
          {/* <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#22c58a] text-xs font-bold text-[#06231a]">
            L
          </span> */}
          <a
            href="https://log0.vercel.app/"
            className={`${GeistPixelLine.className} text-lg font-medium tracking-tight`}
          >
            log0
          </a>
        </div>

        <h2 className="max-w-md text-4xl leading-snug font-medium tracking-tight">
          From 10,000 logs <br /> to one incident.
        </h2>

        <div className="flex items-center gap-4 font-mono text-xs text-[#828b97]">
          {/* <a
            href="https://github.com/ashmitjsg/log0-services"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-[#dde2e8]"
          >
            Open source
          </a> */}
          <span className="text-[#3a352f]">·</span>
          <a
            href="https://log0.vercel.app/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-[#dde2e8]"
          >
            Docs
          </a>
        </div>
      </div>
    </div>
  );
}
