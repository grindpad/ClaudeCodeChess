/**
 * Pure UCI output parser — no side effects, no imports of React or Zustand.
 * Converts raw Stockfish text lines into partial EngineOutput objects.
 */

import type { EngineOutput, PvLine } from '../types/engine';

export function parseUciLine(line: string): Partial<EngineOutput> | null {
  if (line.startsWith('info')) return parseInfoLine(line);
  if (line.startsWith('bestmove')) return parseBestMoveLine(line);
  return null;
}

function parseBestMoveLine(line: string): Partial<EngineOutput> {
  const parts = line.split(' ');
  const idx = parts.indexOf('bestmove');
  return { bestMove: idx !== -1 ? (parts[idx + 1] ?? null) : null };
}

function parseInfoLine(line: string): Partial<EngineOutput> {
  const tokens = line.split(' ');
  const result: Partial<EngineOutput> & { multipv?: PvLine[] } = {};

  for (let i = 0; i < tokens.length; i++) {
    switch (tokens[i]) {
      case 'depth':
        result.depth = parseInt(tokens[++i] ?? '0', 10);
        break;
      case 'seldepth':
        result.seldepth = parseInt(tokens[++i] ?? '0', 10);
        break;
      case 'nodes':
        result.nodes = parseInt(tokens[++i] ?? '0', 10);
        break;
      case 'nps':
        result.nps = parseInt(tokens[++i] ?? '0', 10);
        break;
      case 'time':
        result.time = parseInt(tokens[++i] ?? '0', 10);
        break;
      case 'score': {
        const type = tokens[++i] as 'cp' | 'mate';
        const value = parseInt(tokens[++i] ?? '0', 10);
        const next = tokens[i + 1];
        const isUpperBound = next === 'upperbound';
        const isLowerBound = next === 'lowerbound';
        if (isUpperBound || isLowerBound) i++;
        result.score = { type, value, isUpperBound, isLowerBound };
        break;
      }
      case 'pv': {
        const moves = tokens.slice(i + 1);
        // Trim any trailing non-move tokens (shouldn't happen, but guard against it)
        const pvMoves = moves.filter((m) => /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(m));
        const pvLine: PvLine = { moves: pvMoves, san: [] };
        result.pv = pvLine;
        i = tokens.length; // pv goes to end of line
        break;
      }
      // multipv line number — store which line this is for multi-PV support
      case 'multipv':
        // We merge multipv lines in the store's _receiveEngineOutput action
        // Here we just pass the raw line number along as a non-standard field
        (result as Record<string, unknown>)._multipvLine = parseInt(tokens[++i] ?? '1', 10);
        break;
    }
  }

  // Attach score and depth to the pv line so each multipv line carries its own eval
  if (result.pv) {
    result.pv = {
      ...result.pv,
      score: result.score ?? null,
      depth: result.depth,
    };
  }

  return result;
}

/**
 * Converts a centipawn score to a [-1, 1] float suitable for an evaluation bar.
 * Uses a sigmoid curve capped at ±10 pawns (1000 cp) → ±1.
 */
export function cpToBarValue(cp: number): number {
  // Sigmoid: f(x) = 2 / (1 + e^(-x/400)) - 1
  return 2 / (1 + Math.exp(-cp / 400)) - 1;
}

/**
 * Formats an engine score for display (e.g. "+1.23", "M4", "-M3").
 * Always from White's perspective.
 */
export function formatScore(
  score: EngineOutput['score'],
  sideToMove: 'w' | 'b'
): string {
  if (!score) return '0.00';

  // Scores in UCI are always from the side-to-move's perspective
  const whiteValue = sideToMove === 'w' ? score.value : -score.value;

  if (score.type === 'mate') {
    const mate = sideToMove === 'w' ? score.value : -score.value;
    return mate > 0 ? `M${mate}` : `-M${Math.abs(mate)}`;
  }

  const pawns = whiteValue / 100;
  return pawns >= 0 ? `+${pawns.toFixed(2)}` : pawns.toFixed(2);
}
