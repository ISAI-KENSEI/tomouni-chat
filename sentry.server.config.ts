import * as Sentry from "@sentry/nextjs";

Sentry.init({
  // DSNはVercel環境変数 NEXT_PUBLIC_SENTRY_DSN に設定する
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 本番のみ有効化（DSN未設定ならSentryは無効）
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // パフォーマンスモニタリング: 10%のリクエストをサンプリング
  tracesSampleRate: 0.1,

  // エラーの重複排除
  beforeSend(event) {
    // 開発環境ではSentryに送信しない
    if (process.env.NODE_ENV === "development") {
      return null;
    }
    return event;
  },
});
