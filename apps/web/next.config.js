/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@yieldmind/db", "@yieldmind/shared"],
  experimental: {
    typedRoutes: true,
  },
  images: {
    domains: ["explorer.testnet.mantle.xyz", "explorer.mantle.xyz"],
  },
}

module.exports = nextConfig
