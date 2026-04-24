import { Stack } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect, useRef } from 'react';
import { useEngine } from '../src/hooks/useEngine';
import { useExplorer } from '../src/hooks/useExplorer';
import { useChessStore } from '../src/store';
import { loadSession, saveSession, clearSession } from '../src/storage/gameStorage';
import { deserializeNavigationPath } from '../src/utils/navigationUtils';
import { serializePgn } from '../src/pgn/pgnSerializer';
import type { SessionState } from '../src/storage/storageTypes';

// Register the PWA service worker on web
if (Platform.OS === 'web' && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch((err) => {
      console.warn('[SW] registration failed:', err);
    });
  });
}

function useSessionPersistence() {
  const loadPgn = useChessStore((s) => s.loadPgn);
  const navigateToNode = useChessStore((s) => s.navigateToNode);
  const setActiveLibraryGame = useChessStore((s) => s.setActiveLibraryGame);
  const didRestore = useRef(false);

  // Restore session once on mount
  useEffect(() => {
    if (didRestore.current) return;
    didRestore.current = true;
    const session = loadSession();
    if (!session?.pgn) return;
    try {
      loadPgn(session.pgn);
      const path = deserializeNavigationPath(
        session.navigationPath ? JSON.stringify(session.navigationPath) : null
      );
      if (path.length > 0) {
        // Defer navigation one tick so the tree is settled
        setTimeout(() => navigateToNode(path), 0);
      }
      if (session.activeLibraryEntryId) {
        setActiveLibraryGame(session.activeLibraryEntryId, session.activeGameId);
      }
    } catch {
      clearSession();
    }
  }, []);

  // Persist session on relevant state changes (debounced 2 s)
  const currentFen = useChessStore((s) => s.currentFen);
  const navigationPath = useChessStore((s) => s.navigationPath);
  const moveTree = useChessStore((s) => s.moveTree);
  const metadata = useChessStore((s) => s.metadata);
  const activeLibraryEntryId = useChessStore((s) => s.activeLibraryEntryId);
  const activeGameId = useChessStore((s) => s.activeGameId);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moveTreeRef = useRef(moveTree);
  const metadataRef = useRef(metadata);
  const navigationPathRef = useRef(navigationPath);
  const activeEntryRef = useRef(activeLibraryEntryId);
  const activeGameRef = useRef(activeGameId);

  useEffect(() => { moveTreeRef.current = moveTree; }, [moveTree]);
  useEffect(() => { metadataRef.current = metadata; }, [metadata]);
  useEffect(() => { navigationPathRef.current = navigationPath; }, [navigationPath]);
  useEffect(() => { activeEntryRef.current = activeLibraryEntryId; }, [activeLibraryEntryId]);
  useEffect(() => { activeGameRef.current = activeGameId; }, [activeGameId]);

  useEffect(() => {
    if (!moveTree) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        const tree = moveTreeRef.current;
        if (!tree) return;
        const pgn = serializePgn(tree, metadataRef.current);
        const session: SessionState = {
          pgn,
          navigationPath: navigationPathRef.current,
          activeLibraryEntryId: activeEntryRef.current,
          activeGameId: activeGameRef.current,
          timestamp: new Date().toISOString(),
        };
        saveSession(session);
      } catch {}
    }, 2000);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [currentFen, navigationPath, activeLibraryEntryId, activeGameId]);
}

function RootLayoutInner() {
  useEngine();
  useExplorer();
  useSessionPersistence();

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
