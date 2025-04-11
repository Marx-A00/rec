/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['bcryptjs'],
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      crypto: false,
    };
    return config;
  },
};

module.exports = nextConfig; 