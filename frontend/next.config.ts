import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Add allowed dev origins for tunneling services
  allowedDevOrigins: [
    "*.devtunnels.ms",
    "*.ngrok-free.app",
    "t8l76r1n-3000.euw.devtunnels.ms",
    "8981-2a03-6f02-00-a200.ngrok-free.app",
  ],
  experimental: {
    // Enable experimental features if needed
  },
};

export default nextConfig;
