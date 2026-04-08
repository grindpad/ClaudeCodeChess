/**
 * EngineController — owns the Stockfish engine lifecycle via a StockfishBridge.
 *
 * Safe UCI command sequence per search:
 *   1. stop           (only if isSearching)
 *   2. isready        (always — synchronisation point)
 *   3. readyok        (we wait for this before sending any further commands)
 *   4. setoption …    (only if MultiPV changed — after readyok, engine is settled)
 *   5. position fen X
 *   6. go depth N
 *
 * Moving setoption to after readyok is critical: the WASM build crashes when
 * setoption is sent before the engine has fully processed a stop.
 *
 * Platform branching:
 *   - Web     → StockfishBridgeWeb    (Web Worker, requires WASM support)
 *   - iOS     → StockfishBridgeIOS    (hidden WebView bridge)
 *   - Android → StockfishBridgeNative (react-native-stockfish-chess-engine)
 */

import { Chess } from 'chess.js';
import { parseUciLine } from './uciParser';
import { isWasmSupported, isWeb } from '../utils/platform';
import { createStockfishBridge } from './StockfishBridgeFactory';
import { STARTING_FEN } from '../types/moveTree';
import type { StockfishBridge } from './StockfishBridge';
import type { EngineOutput, EngineStatus } from '../types/engine';

type OutputFn = (output: Partial<EngineOutput>) => void;
type StatusFn = (status: EngineStatus) => void;

interface PendingSearch {
  fen: string;
  depth: number;
  multiPv: number;
}

export class EngineController {
  private bridge: StockfishBridge | null = null;
  private pendingTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly onOutput: OutputFn;
  private readonly onStatus: StatusFn;
  private readonly debounceMs = 150;
  private analysisFen: string = STARTING_FEN;
  private isSearching = false;
  private currentMultiPv = 1;
  /**
   * Set in the debounce timer; consumed in the readyok handler.
   * Ensures position+go (and setoption) are only sent after the engine confirms
   * it is fully settled via readyok.
   */
  private pendingSearch: PendingSearch | null = null;

  constructor(onOutput: OutputFn, onStatus: StatusFn) {
    this.onOutput = onOutput;
    this.onStatus = onStatus;
  }

  initialize(): void {
    // Web: requires WASM and Worker support
    if (isWeb() && (!isWasmSupported() || typeof Worker === 'undefined')) {
      this.onStatus('unsupported');
      return;
    }

    try {
      const bridge = createStockfishBridge();
      this.bridge = bridge;

      bridge.onOutput(this.handleMessage.bind(this));

      bridge.launch().then(() => {
        // launch() resolves once the worker/process is started.
        // Send initial UCI handshake.
        bridge.sendCommand('uci');
        bridge.sendCommand('isready');
      }).catch((err) => {
        console.error('[EngineController] bridge launch failed:', err);
        this.isSearching = false;
        this.pendingSearch = null;
        this.currentMultiPv = 1;
        this.onStatus('error');
        // Schedule a restart after a short delay (mirrors the old worker onerror path)
        setTimeout(() => {
          this.bridge?.shutdown();
          this.bridge = null;
          this.initialize();
        }, 1000);
      });

      this.onStatus('loading');
    } catch (err) {
      console.error('[EngineController] failed to create bridge:', err);
      this.onStatus('error');
    }
  }

  private handleMessage(line: string): void {
    if (!line) return;

    if (line === 'readyok') {
      if (this.pendingSearch) {
        // Engine is fully settled — now safe to change options and start search
        const { fen, depth, multiPv } = this.pendingSearch;
        this.pendingSearch = null;

        // setoption AFTER readyok: engine is idle and settled, safest moment
        if (multiPv !== this.currentMultiPv) {
          this.bridge!.sendCommand(`setoption name MultiPV value ${multiPv}`);
          this.currentMultiPv = multiPv;
        }

        this.bridge!.sendCommand(`position fen ${fen}`);
        this.bridge!.sendCommand(`go depth ${depth}`);
        this.isSearching = true;
        this.onStatus('analyzing');
      } else {
        // Initial handshake, or readyok after a cancelled search
        this.onStatus('ready');
      }
      return;
    }

    if (line.startsWith('uciok')) return;

    const parsed = parseUciLine(line);
    if (!parsed) return;

    if (line.startsWith('bestmove')) {
      this.isSearching = false;
      this.onOutput(parsed);
      // Don't report 'ready' if we are already mid-cycle for a new search:
      // the readyok for that search will call onStatus('analyzing') instead.
      if (!this.pendingSearch) {
        this.onStatus('ready');
      }
    } else if (line.startsWith('info') && parsed.score !== undefined) {
      if (parsed.pv && parsed.pv.moves.length > 0) {
        parsed.pv = { ...parsed.pv, san: this.computeSan(parsed.pv.moves) };
      }
      this.onOutput(parsed);
    }
  }

  private computeSan(uciMoves: string[]): string[] {
    try {
      const chess = new Chess(this.analysisFen);
      const san: string[] = [];
      for (const uci of uciMoves) {
        const from = uci.slice(0, 2);
        const to = uci.slice(2, 4);
        const promotion = uci[4] as 'q' | 'r' | 'b' | 'n' | undefined;
        san.push(chess.move({ from, to, promotion }).san);
      }
      return san;
    } catch {
      return [];
    }
  }

  analyzePosition(fen: string, depth: number, multiPv: number): void {
    this.analysisFen = fen;
    if (!this.bridge) return;

    if (this.pendingTimer) {
      clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }

    this.pendingTimer = setTimeout(() => {
      if (!this.bridge) return;

      if (this.isSearching) {
        this.bridge.sendCommand('stop');
        this.isSearching = false;
      }

      // Store params; setoption + position + go are sent only after readyok
      this.pendingSearch = { fen, depth, multiPv };
      this.bridge.sendCommand('isready');
    }, this.debounceMs);
  }

  stopAnalysis(): void {
    if (this.pendingTimer) {
      clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }
    this.pendingSearch = null;
    if (this.isSearching) {
      this.bridge?.sendCommand('stop');
      this.isSearching = false;
    }
  }

  destroy(): void {
    this.stopAnalysis();
    this.bridge?.shutdown();
    this.bridge = null;
  }
}
