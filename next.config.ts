import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // ── Webpack: polyfills para NDK en el browser bundle ───────────────────────
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        path: false,
        os: false,
        buffer: false,
      }
    }

    // Evitar que NDK intente cargar módulos nativos en el edge
    config.externals = config.externals || []
    if (isServer) {
      config.externals.push("bufferutil", "utf-8-validate")
    }

    return config
  },

  // ── Headers de seguridad ───────────────────────────────────────────────────
  async headers() {
    const isDev = process.env.NODE_ENV === "development"

    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      isDev
        ? "connect-src 'self' wss: ws: https:"
        : "connect-src 'self' wss: https:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: cspDirectives },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ]
  },

  // ── Redirects ──────────────────────────────────────────────────────────────
  async redirects() {
    return [
      { source: "/play",    destination: "/", permanent: false },
      { source: "/join",    destination: "/", permanent: false },
      { source: "/results", destination: "/", permanent: false },
    ]
  },

  poweredByHeader: false,
  compress: true,

  images: {
    formats: ["image/avif", "image/webp"],
  },
}

export default nextConfig
