import { GeistPixelLine } from "geist/font/pixel";
import { AuthBackdrop } from "./auth-backdrop";
import { links } from "@/lib/links";

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
        <a
          href={links.website}
          className="flex items-center gap-2.5"
        >
          {/* log0 convergence mark: log-dots stream into one incident dot */}
          <svg
            viewBox="0 0 32 32"
            fill="none"
            aria-hidden="true"
            className="h-6 w-6"
          >
            <g stroke="#22c58a" strokeWidth="1.6" opacity="0.55">
              <line x1="16" y1="7" x2="26" y2="16" />
              <line x1="16" y1="16" x2="26" y2="16" />
              <line x1="16" y1="25" x2="26" y2="16" />
            </g>
            <g fill="#22c58a">
              <circle cx="5" cy="7" r="1.5" opacity="0.45" />
              <circle cx="5" cy="16" r="1.5" opacity="0.45" />
              <circle cx="5" cy="25" r="1.5" opacity="0.45" />
              <circle cx="11" cy="7" r="1.6" opacity="0.7" />
              <circle cx="11" cy="16" r="1.6" opacity="0.7" />
              <circle cx="11" cy="25" r="1.6" opacity="0.7" />
              <circle cx="16" cy="7" r="1.7" />
              <circle cx="16" cy="16" r="1.7" />
              <circle cx="16" cy="25" r="1.7" />
            </g>
            <circle cx="26" cy="16" r="6" fill="#22c58a" opacity="0.18" />
            <circle cx="26" cy="16" r="3.6" fill="#22c58a" />
          </svg>
          <span
            className={`${GeistPixelLine.className} text-lg font-medium tracking-tight`}
          >
            log0
          </span>
        </a>

        <h2 className="max-w-md text-4xl leading-snug font-medium tracking-tight">
          From 10,000 logs <br /> to one incident.
        </h2>

        <div className="flex items-center gap-4 font-mono text-xs text-[#828b97]">
          {/* <a
            href={links.github}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-[#dde2e8]"
          >
            Open source
          </a> */}
          {/* <span className="text-[#3a352f]">·</span> */}
          <a
            href={links.docs}
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
