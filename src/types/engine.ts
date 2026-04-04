export type EngineStatus =
  | 'idle'        // not yet initialized
  | 'loading'     // WASM loading
  | 'ready'       // ready to analyse
  | 'analyzing'   // currently analysing
  | 'error'       // worker crashed
  | 'unsupported'; // WASM not available (Expo Go / native)

export interface PvLine {
  /** UCI move sequence: ["e2e4", "e7e5", ...] */
  moves: string[];
  /** SAN equivalents computed after receiving the PV (filled in by EngineController) */
  san: string[];
}

export interface EngineOutput {
  depth: number;
  seldepth: number;
  nodes: number;
  nps: number;
  /** Time in milliseconds */
  time: number;
  score: {
    type: 'cp' | 'mate';
    /** Centipawns (positive = side to move winning), or moves-to-mate (negative = opponent mates) */
    value: number;
    isUpperBound: boolean;
    isLowerBound: boolean;
  } | null;
  /** Best line (MultiPV line 1) */
  pv: PvLine | null;
  /** All MultiPV lines when multiPvCount > 1 */
  multipv: PvLine[];
  /** Set only on "bestmove" message (analysis complete at target depth) */
  bestMove: string | null;
}
