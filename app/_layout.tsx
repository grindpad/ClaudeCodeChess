import { Stack } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEngine } from '../src/hooks/useEngine';
import { useExplorer } from '../src/hooks/useExplorer';

// Register the PWA service worker on web
if (Platform.OS === 'web' && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch((err) => {
      console.warn('[SW] registration failed:', err);
    });
  });
}

function RootLayoutInner() {
  // Both hooks subscribe to currentFen via subscribeWithSelector — no re-renders here.
  useEngine();
  useExplorer();

  // Mount the hidden WebView for the iOS Stockfish engine bridge.
  // react-native-webview is require()'d inside the Platform.OS check so it is
  // never evaluated on web (where it would cause a bundling error).
  let iosWebView = null;
  if (Platform.OS === 'ios') {
    const { WebView } = require('react-native-webview');
    const { getIOSBridge } = require('../src/engine/StockfishBridgeFactory');
    const bridge = getIOSBridge();
    const webViewProps = bridge.getWebViewProps();
    iosWebView = <WebView {...webViewProps} />;
  }

  return (
    <>
      {iosWebView}
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <RootLayoutInner />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
