/**
 * StockfishBridgeFactory — selects the correct StockfishBridge implementation
 * at runtime based on the current platform.
 *
 * We use require() inside the factory so that the unused branch's module is
 * never evaluated on the other platform, avoiding native-module errors on web
 * and Worker errors on native.
 */
import { isWeb } from '../utils/platform';
import type { StockfishBridge } from './StockfishBridge';

export function createStockfishBridge(): StockfishBridge {
  if (isWeb()) {
    const { StockfishBridgeWeb } = require('./StockfishBridgeWeb');
    return new StockfishBridgeWeb() as StockfishBridge;
  }
  const { StockfishBridgeNative } = require('./StockfishBridgeNative');
  return new StockfishBridgeNative() as StockfishBridge;
}
