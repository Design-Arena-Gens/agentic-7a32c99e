/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@vercel/kv", "openai", "chrono-node", "luxon"],
  },
};

export default nextConfig;
