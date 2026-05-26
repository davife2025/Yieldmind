/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@yieldmind/db",
    "@yieldmind/shared",
    "@yieldmind/agent",
  ],
  experimental: {
    typedRoutes: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "explorer.testnet.mantle.xyz" },
      { protocol: "https", hostname: "explorer.mantle.xyz" },
    ],
  },
  // Suppress punycode deprecation warning from ethers
  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false, net: false, tls: false }
    return config
  },
}

module.exports = nextConfig
