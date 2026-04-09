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
 * A2 FIX — Watchdog timer:
 *   If no engine output is received within WATCHDOG_MS after starting analysis,
 *   the bridge is shut down and re-initialized automatically. This handles the
 *   case where the WASM worker silently crashes or becomes unresponsive on iOS Safari.
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

const WATCHDOG_MS = 8000;

export class EngineController {
  private bridge: StockfishBridge | null = null;
  private pendingTimer: ReturnType<typeof setTimeout> | null = null;
  private watchdogTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly onOutput: OutputFn;
  private readonly onStatus: StatusFn;
  private readonly debounceMs = 150;
  private analysisFen: string = STARTING_FEN;
  private isSearching = false;
  private currentMultiPv = 1;
  private pendingSearch: PendingSearch | null = null;

  constructor(onOutput: OutputFn, onStatus: StatusFn) {
    this.onOutput = onOutput;
    this.onStatus = onStatus;
  }

  initialize(): void {
    if (isWeb() && (!isWasmSupported() || typeof Worker === 'undefined')) {
      this.onStatus('unsupported');
      return;
    }

    try {
      const bridge = createStockfishBridge();
      this.bridge = bridge;

      bridge.onOutput(this.handleMessage.bind(this));

      bridge.launch().then(() => {
        bridge.sendCommand('uci');
        bridge.sendCommand('isready');
        // Start watchdog for initial readyok
        this.startWatchdog();
      }).catch((err) => {
        console.error('[EngineController] bridge launch failed:', err);
        this.isSearching = false;
        this.pendingSearch = null;
        this.currentMultiPv = 1;
        this.clearWatchdog();
        this.onStatus('error');
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

  // ── Watchdog ─────────────────────────────────────────────────────────────────

  private startWatchdog(): void {
    this.clearWatchdog();
    this.watchdogTimer = setTimeout(() => {
      console.warn('[EngineController] Watchdog: no response in', WATCHDOG_MS, 'ms — restarting');
      // Save current search intent so it fires after re-init
      const savedSearch = this.pendingSearch ??
        (this.isSearching ? { fen: this.analysisFen, depth: 20, multiPv: this.currentMultiPv } : null);
      this.bridge?.shutdown();
      this.bridge = null;
      this.isSearching = false;
      this.currentMultiPv = 1;
      this.pendingSearch = savedSearch;
      this.onStatus('loading');
      this.initialize();
    }, WATCHDOG_MS);
  }

  private clearWatchdog(): void {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  // ── Message handler ───────────────────────────────────────────────────────────

  private handleMessage(line: string): void {
    if (!line) return;

    if (line === 'readyok') {
      this.clearWatchdog();
      if (this.pendingSearch) {
        const { fen, depth, multiPv } = this.pendingSearch;
        this.pendingSearch = null;

        if (multiPv !== this.currentMultiPv) {
          this.bridge!.sendCommand(`setoption name MultiPV value ${multiPv}`);
          this.currentMultiPv = multiPv;
        }

        this.bridge!.sendCommand(`position fen ${fen}`);
        this.bridge!.sendCommand(`go depth ${depth}`);
        this.isSearching = true;
        // Restart watchdog for the analysis phase
        this.startWatchdog();
        this.onStatus('analyzing');
      } else {
        this.onStatus('ready');
      }
      return;
    }

    if (line.startsWith('uciok')) return;

    const parsed = parseUciLine(line);
    if (!parsed) return;

    if (line.startsWith('bestmove')) {
      this.isSearching = false;
      this.clearWatchdog();
      this.onOutput(parsed);
      if (!this.pendingSearch) {
        this.onStatus('ready');
      }
    } else if (line.startsWith('info') && parsed.score !== undefined) {
      // Reset watchdog on each info line — engine is alive
      this.startWatchdog();
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

  // ── Public API ────────────────────────────────────────────────────────────────

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

      this.pendingSearch = { fen, depth, multiPv };
      this.bridge.sendCommand('isready');
      // Start watchdog waiting for readyok
      this.startWatchdog();
    }, this.debounceMs);
  }

  stopAnalysis(): void {
    if (this.pendingTimer) {
      clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }
    this.pendingSearch = null;
    this.clearWatchdog();
    if (this.isSearching) {
      this.bridge?.sendCommand('stop');
      this.isSearching = false;
    }
  }

  destroy(): void {
    this.stopAnalysis();
    this.clearWatchdog();
    this.bridge?.shutdown();
    this.bridge = null;
  }
}
