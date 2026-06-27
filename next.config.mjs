/** @type {import('next').NextConfig} */
const nextConfig = {
  // /api/v1/* is proxied by the Route Handler at app/api/v1/[...path]/route.ts
  // (next.config rewrites 500 on Vercel for 200 responses from external origins).
};

export default nextConfig;
