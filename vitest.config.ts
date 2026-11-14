import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Unit tests for the console's pure logic (proxy routing, the SSE reader, the event reducer, the diff parser).
// Components are checked by `npm run typecheck`, `npm run lint` and `npm run build`.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
});
