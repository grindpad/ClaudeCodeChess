/**
 * StockfishBridgeFactory — selects the correct StockfishBridge implementation
 * at runtime based on the current platform.
 *
 * Platform routing:
 *   web     → StockfishBridgeWeb    (Web Worker, requires WASM + Worker support)
 *   iOS     → StockfishBridgeIOS    (hidden WebView bridge — singleton)
 *   Android → StockfishBridgeNative (react-native-stockfish-chess-engine)
 *
 * All implementations are loaded via require() inside their respective branches
 * so that the unused module is NEVER evaluated on other platforms — preventing
 * Worker construction errors on native and NativeModules errors on web.
 *
 * The iOS bridge is a singleton: the root layout mounts one hidden WebView that
 * holds a reference into the same StockfishBridgeIOS instance that EngineController
 * uses. getIOSBridge() must be used both here and in _layout.tsx so they share
 * the identical webViewRef.
 */
import { Platform } from 'react-native';
import { isWeb } from '../utils/platform';
import type { StockfishBridge } from './StockfishBridge';

// Singleton instance for the iOS WebView bridge.
let iosBridgeInstance: import('./StockfishBridgeIOS').StockfishBridgeIOS | null = null;

/**
 * Returns (creating if necessary) the singleton iOS WebView bridge.
 * Called both from createStockfishBridge() and from app/_layout.tsx when
 * mounting the hidden WebView so both parties share the same instance.
 */
export function getIOSBridge(): import('./StockfishBridgeIOS').StockfishBridgeIOS {
  if (!iosBridgeInstance) {
    const { StockfishBridgeIOS } = require('./StockfishBridgeIOS');
    iosBridgeInstance = new StockfishBridgeIOS();
  }
  return iosBridgeInstance!;
}

export function createStockfishBridge(): StockfishBridge {
  if (isWeb()) {
    const { StockfishBridgeWeb } = require('./StockfishBridgeWeb');
    return new StockfishBridgeWeb() as StockfishBridge;
  }
  if (Platform.OS === 'ios') {
    return getIOSBridge();
  }
  const { StockfishBridgeNative } = require('./StockfishBridgeNative');
  return new StockfishBridgeNative() as StockfishBridge;
}
