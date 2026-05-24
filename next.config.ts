import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    const headers = [
      // セキュリティヘッダー（全ルート）
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];

    // dev 環境では画像キャッシュを完全無効化 (キャッシュ起因の表示バグ防止)
    if (process.env.NODE_ENV === "development") {
      const noCacheHeaders = [
        { key: "Cache-Control", value: "no-store, must-revalidate" },
      ];
      headers.push(
        { source: "/mascots/:path*", headers: noCacheHeaders },
        { source: "/decor/:path*", headers: noCacheHeaders },
        { source: "/textures/:path*", headers: noCacheHeaders },
      );
    }

    return headers;
  },
};

// Sentry統合（NEXT_PUBLIC_SENTRY_DSN 未設定時は自動的に無効化）
export default withSentryConfig(nextConfig, {
  // ソースマップを本番でのみアップロード
  silent: true,
  // Vercel Cron Monitors を使わない
  disableLogger: true,
});

