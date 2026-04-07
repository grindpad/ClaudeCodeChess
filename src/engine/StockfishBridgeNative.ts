/**
 * StockfishBridgeNative — Native module implementation of StockfishBridge.
 *
 * Uses react-native-stockfish-chess-engine (Android only, v0.1.5).
 *
 * API used from the package:
 *   mainLoop()           — starts the Stockfish process (async, runs until 'quit')
 *   sendCommand(cmd)     — sends a UCI command string to the engine input queue
 *   shutdownStockfish()  — terminates the engine process
 *
 * Output is delivered via a NativeEventEmitter on the 'stockfish-output' event,
 * where each emission is a single UCI output line (string).
 *
 * IMPORTANT: This module is Android-only. On iOS, the NativeModules binding is
 * absent; EngineController detects this via the thrown LINKING_ERROR and the
 * caller should set engineStatus = 'unsupported' instead of calling launch().
 */
import { NativeEventEmitter, NativeModules } from 'react-native';
import type { StockfishBridge } from './StockfishBridge';

export class StockfishBridgeNative implements StockfishBridge {
  private outputHandler: ((line: string) => void) | null = null;
  private eventSubscription: { remove: () => void } | null = null;

  onOutput(handler: (line: string) => void): void {
    this.outputHandler = handler;
  }

  async launch(): Promise<void> {
    // The NativeEventEmitter key matches the native module name used in the package.
    const emitter = new NativeEventEmitter(
      NativeModules.ReactNativeStockfishChessEngine
    );

    this.eventSubscription = emitter.addListener(
      'stockfish-output',
      (line: string) => {
        if (line && this.outputHandler) {
          this.outputHandler(line);
        }
      }
    );

    // mainLoop() starts the Stockfish process and runs until 'quit' is sent.
    // It is intentionally NOT awaited — it resolves only when Stockfish exits.
    const { mainLoop } = require('react-native-stockfish-chess-engine');
    mainLoop().catch((err: unknown) => {
      console.error('[StockfishBridgeNative] mainLoop error:', err);
    });
  }

  sendCommand(cmd: string): void {
    const { sendCommand } = require('react-native-stockfish-chess-engine');
    sendCommand(cmd).catch((err: unknown) => {
      console.error('[StockfishBridgeNative] sendCommand error:', err);
    });
  }

  shutdown(): void {
    this.eventSubscription?.remove();
    this.eventSubscription = null;

    const { shutdownStockfish } = require('react-native-stockfish-chess-engine');
    shutdownStockfish().catch((err: unknown) => {
      console.error('[StockfishBridgeNative] shutdownStockfish error:', err);
    });
  }
}
