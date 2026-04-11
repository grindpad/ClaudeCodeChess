/**
 * EngineController — owns the Stockfish engine lifecycle via a StockfishBridge.
 *
 * Safe UCI command sequence per search:
 *   1. stop           (only if isSearching — wait for bestmove before proceeding)
 *   2. isready        (sent after bestmove confirming stop, or immediately if idle)
 *   3. readyok        (we wait for this before sending any further commands)
 *   4. setoption …    (only if MultiPV changed — after readyok)
 *   5. position fen X
 *   6. go depth N
 *
 * BUG-E FIX — isStopping flag:
 *   While stopping (stop sent, bestmove not yet received), queue the next search
 *   in pendingSearch but do NOT send isready yet. Send isready only after bestmove.
 *   This prevents double-readyok races that corrupt engine state with MultiPV > 1.
 *
 * BUG-E FIX — Watchdog:
 *   10-second watchdog. Resets on each info line. Clears on bestmove.
 *   On fire: full worker teardown + reinitialise + retry pending search.
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

const WATCHDOG_MS = 10_000;

export class EngineController {
  private bridge: StockfishBridge | null = null;
  private pendingTimer: ReturnType<typeof setTimeout> | null = null;
  private watchdogTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly onOutput: OutputFn;
  private readonly onStatus: StatusFn;
  private readonly debounceMs = 150;
  private analysisFen: string = STARTING_FEN;
  private isSearching = false;
  /** True between sending "stop" and receiving "bestmove". */
  private isStopping = false;
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
        this.startWatchdog();
      }).catch((err) => {
        console.error('[EngineController] bridge launch failed:', err);
        this.isSearching = false;
        this.isStopping = false;
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
      const savedSearch = this.pendingSearch ??
        (this.isSearching ? { fen: this.analysisFen, depth: 20, multiPv: this.currentMultiPv } : null);
      this.bridge?.shutdown();
      this.bridge = null;
      this.isSearching = false;
      this.isStopping = false;
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
        this.startWatchdog();
        this.onStatus('analyzing');
      } else if (!this.isSearching) {
        // BUG-E FIX: only set ready if we're not already in a search
        // (guards against stale readyok from a previous stop cycle)
        this.onStatus('ready');
      }
      return;
    }

    if (line.startsWith('uciok')) return;

    const parsed = parseUciLine(line);
    if (!parsed) return;

    if (line.startsWith('bestmove')) {
      this.isSearching = false;
      const wasStopping = this.isStopping;
      this.isStopping = false;
      this.clearWatchdog();
      this.onOutput(parsed);

      // BUG-E FIX: now that bestmove is confirmed, send isready for queued search
      if (this.pendingSearch) {
        this.bridge?.sendCommand('isready');
        this.startWatchdog();
      } else if (!wasStopping) {
        this.onStatus('ready');
      } else {
        // Was stopping without a pending search (user called stopAnalysis)
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
        // BUG-E FIX: send stop, set isStopping, queue search for after bestmove
        this.bridge.sendCommand('stop');
        this.isStopping = true;
        this.isSearching = false;
        this.pendingSearch = { fen, depth, multiPv };
        // startWatchdog for the stop response (bestmove expected)
        this.startWatchdog();
      } else if (this.isStopping) {
        // BUG-E FIX: already stopping, just update the pending search
        this.pendingSearch = { fen, depth, multiPv };
      } else {
        // Ready to go — send isready immediately
        this.pendingSearch = { fen, depth, multiPv };
        this.bridge.sendCommand('isready');
        this.startWatchdog();
      }
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
      this.isStopping = true;
      // Watchdog for the stop acknowledgement
      this.startWatchdog();
    }
  }

  destroy(): void {
    if (this.pendingTimer) {
      clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }
    this.pendingSearch = null;
    this.clearWatchdog();
    if (this.isSearching || this.isStopping) {
      this.bridge?.sendCommand('stop');
    }
    this.isSearching = false;
    this.isStopping = false;
    this.bridge?.shutdown();
    this.bridge = null;
  }
}
