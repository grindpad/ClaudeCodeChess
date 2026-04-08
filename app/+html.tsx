import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * HTML shell for the Expo Router web build.
 * This file is only used during `expo export -p web` and `expo start --web`.
 * It injects PWA meta tags so the app can be installed on iPhone via Safari → Add to Home Screen.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />

        {/* Prevents white flash on load */}
        <ScrollViewStyleReset />

        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* iOS standalone mode — removes Safari browser chrome */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Chess" />

        {/* iOS ignores manifest icons — needs a dedicated apple-touch-icon tag */}
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />

        {/* Android / Chrome theme colour */}
        <meta name="theme-color" content="#1a1a2e" />
      </head>
      <body>{children}</body>
    </html>
  );
}
