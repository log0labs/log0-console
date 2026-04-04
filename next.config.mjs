/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // Auth Service (port 8086)
      {
        source: "/api/v1/auth/:path*",
        destination: `${process.env.AUTH_API_URL}/api/v1/auth/:path*`,
      },
      {
        source: "/api/v1/tenants/:path*",
        destination: `${process.env.AUTH_API_URL}/api/v1/tenants/:path*`,
      },
      {
        source: "/api/v1/users/:path*",
        destination: `${process.env.AUTH_API_URL}/api/v1/users/:path*`,
      },
      {
        source: "/api/v1/api-keys/:path*",
        destination: `${process.env.AUTH_API_URL}/api/v1/api-keys/:path*`,
      },
      // Incident Service (port 8083)
      {
        source: "/api/v1/incidents/:path*",
        destination: `${process.env.INCIDENTS_API_URL}/api/v1/incidents/:path*`,
      },
    ];
  },
};

export default nextConfig;
