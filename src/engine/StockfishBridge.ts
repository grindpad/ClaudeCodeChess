/**
 * StockfishBridge — platform-agnostic interface for communicating with the
 * Stockfish engine. Implementations exist for web (Web Worker) and native
 * (react-native-stockfish-chess-engine).
 */
export interface StockfishBridge {
  /** Start the engine process / load the worker. */
  launch(): Promise<void>;
  /** Send a raw UCI command string to the engine. */
  sendCommand(cmd: string): void;
  /**
   * Register the single handler that receives every output line from the engine.
   * Must be called before launch(). Only one handler is supported at a time.
   */
  onOutput(handler: (line: string) => void): void;
  /** Tear down the engine process / terminate the worker. */
  shutdown(): void;
}
