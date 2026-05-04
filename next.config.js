const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const allowedOrigins = Array.from(
  new Set(
    [appUrl, "http://localhost:3000"]
      .map((value) => {
        try {
          return new URL(value).host;
        } catch {
          return null;
        }
      })
      .filter((value) => Boolean(value)),
  ),
);

// Content Security Policy: explicit allowlist. Connect-src includes Cloudinary
// for direct browser uploads. Add the payment provider's domains here when
// integrating Stripe/Mercado Pago. 'unsafe-inline' on style-src is required by
// Next/Tailwind injected styles; we don't allow it on script-src in production.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV !== "production" ? " 'unsafe-eval'" : ""),
  "connect-src 'self' https://res.cloudinary.com https://api.cloudinary.com",
  "media-src 'self' https://res.cloudinary.com",
  "frame-src 'self' https://www.openstreetmap.org https://www.google.com https://maps.google.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=(self)" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const adminNoIndexHeaders = [
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet" },
];

const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  experimental: {
    serverActions: {
      allowedOrigins,
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/admin/:path*",
        headers: adminNoIndexHeaders,
      },
      {
        source: "/login",
        headers: adminNoIndexHeaders,
      },
    ];
  },
};

module.exports = nextConfig;