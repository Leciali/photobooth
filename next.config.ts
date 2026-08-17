import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Akses dev server dari perangkat lain di LAN (laptop teman, iPad kiosk).
  // `*.local` mencakup hostname mDNS seperti photobooth-print-server.local,
  // `192.168.*.*` mencakup IP LAN (bisa berubah karena DHCP).
  allowedDevOrigins: ["*.local", "192.168.*.*"],
};

export default nextConfig;
