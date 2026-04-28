/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@timewell/shared"],
  experimental: {
    serverComponentsExternalPackages: [],
  },
};

module.exports = nextConfig;
