import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: ['i.discogs.com', 'st.discogs.com', 'via.placeholder.com'],
  },
  reactStrictMode: true,
};

export default nextConfig;
