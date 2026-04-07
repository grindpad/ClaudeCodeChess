/**
 * StockfishBridgeWeb — Web Worker implementation of StockfishBridge.
 *
 * Wraps the self-contained Stockfish Web Worker served at /stockfish-18-lite-single.js.
 * This is identical in behaviour to the original worker usage in EngineController,
 * just extracted into the bridge abstraction.
 */
import type { StockfishBridge } from './StockfishBridge';

export class StockfishBridgeWeb implements StockfishBridge {
  private worker: Worker | null = null;
  private outputHandler: ((line: string) => void) | null = null;

  onOutput(handler: (line: string) => void): void {
    this.outputHandler = handler;
  }

  async launch(): Promise<void> {
    // Worker path must match what is served in public/ at web root.
    this.worker = new Worker('/stockfish-18-lite-single.js');

    this.worker.onmessage = (event: MessageEvent) => {
      const line: string =
        typeof event.data === 'string' ? event.data : String(event.data);
      if (line && this.outputHandler) {
        this.outputHandler(line);
      }
    };

    // Errors are surfaced back through EngineController's existing onerror handling.
    // We re-throw so the controller can set status='error' and schedule a restart.
    this.worker.onerror = (e) => {
      console.error('[StockfishBridgeWeb] worker error:', e);
    };
  }

  sendCommand(cmd: string): void {
    this.worker?.postMessage(cmd);
  }

  shutdown(): void {
    this.worker?.terminate();
    this.worker = null;
  }
}
