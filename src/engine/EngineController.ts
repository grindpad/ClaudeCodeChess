/**
 * EngineController — owns the Stockfish Web Worker lifecycle.
 *
 * Architecture:
 * - stockfish-18-single.js (served from public/) runs as the Web Worker.
 *   It is a self-contained UCI engine: it receives UCI command strings via
 *   postMessage and sends UCI output strings back via postMessage.
 * - This class is the sole owner of the Worker reference.
 * - It debounces position changes (150 ms) to avoid firing analysis on every
 *   navigation keypress.
 * - It is constructed once by useEngine (mounted in the root layout) and
 *   destroyed on unmount.
 *
 * WASM availability:
 * - On Expo Web: full WASM + Web Workers → normal operation
 * - On Expo Go / native: isWasmSupported() returns false → status = 'unsupported'
 */

import { parseUciLine } from './uciParser';
import { isWasmSupported } from '../utils/platform';
import type { EngineOutput, EngineStatus } from '../types/engine';

type OutputFn = (output: Partial<EngineOutput>) => void;
type StatusFn = (status: EngineStatus) => void;

export class EngineController {
  private worker: Worker | null = null;
  private pendingTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly onOutput: OutputFn;
  private readonly onStatus: StatusFn;
  private readonly debounceMs = 150;

  constructor(onOutput: OutputFn, onStatus: StatusFn) {
    this.onOutput = onOutput;
    this.onStatus = onStatus;
  }

  initialize(): void {
    if (!isWasmSupported() || typeof Worker === 'undefined') {
      this.onStatus('unsupported');
      return;
    }

    try {
      // stockfish-18-single.js is served from public/ at the web root
      this.worker = new Worker('/stockfish-18-single.js');
      this.worker.onmessage = this.handleMessage.bind(this);
      this.worker.onerror = (e) => {
        console.error('[EngineController] worker error:', e);
        this.onStatus('error');
      };

      this.onStatus('loading');

      // Standard UCI handshake
      this.worker.postMessage('uci');
      this.worker.postMessage('isready');
    } catch (err) {
      console.error('[EngineController] failed to create worker:', err);
      this.onStatus('error');
    }
  }

  private handleMessage(event: MessageEvent): void {
    const line: string =
      typeof event.data === 'string' ? event.data : String(event.data);

    if (!line) return;

    if (line === 'readyok') {
      this.onStatus('ready');
      return;
    }

    if (line.startsWith('uciok')) {
      // UCI handshake complete — nothing needed
      return;
    }

    const parsed = parseUciLine(line);
    if (!parsed) return;

    if (line.startsWith('bestmove')) {
      this.onOutput(parsed);
      this.onStatus('ready');
    } else if (line.startsWith('info') && parsed.score !== undefined) {
      // Only forward lines that have a score (skip lines with only depth/nodes/time)
      this.onOutput(parsed);
    }
  }

  /**
   * Schedule analysis of the given position.
   * Cancels any pending analysis before starting; the 150 ms debounce prevents
   * a burst of analysis calls during fast navigation.
   */
  analyzePosition(fen: string, depth: number, multiPv: number): void {
    if (!this.worker) return;

    if (this.pendingTimer) {
      clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }

    this.pendingTimer = setTimeout(() => {
      if (!this.worker) return;
      this.worker.postMessage('stop');
      this.worker.postMessage(`position fen ${fen}`);
      const multipvFlag = multiPv > 1 ? ` multipv ${multiPv}` : '';
      this.worker.postMessage(`go depth ${depth}${multipvFlag}`);
      this.onStatus('analyzing');
    }, this.debounceMs);
  }

  stopAnalysis(): void {
    if (this.pendingTimer) {
      clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }
    this.worker?.postMessage('stop');
  }

  destroy(): void {
    this.stopAnalysis();
    this.worker?.terminate();
    this.worker = null;
  }
}
