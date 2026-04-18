/**
 * PGN parser: converts a PGN string into our canonical MoveTree + PgnMetadata.
 *
 * Uses @mliebelt/pgn-parser for the raw AST (handles full PGN grammar including
 * nested variations and comments). chess.js is used to compute FENs at each node
 * as we walk the tree recursively.
 *
 * NOTE: chess.js's loadPgn() is NOT used here because it silently drops
 * variations, NAGs, and comments.
 */

import { Chess } from 'chess.js';
import { v4 as uuidv4 } from 'uuid';
import { parseGame, parseGames } from '@mliebelt/pgn-parser';
import type { PgnMove, Tags } from '@mliebelt/pgn-types';
import type { ParsedPgn, PgnMetadata } from '../types/pgn';
import type { MoveNode, MoveTree } from '../types/moveTree';
import { STARTING_FEN } from '../types/moveTree';

// ── Single game ───────────────────────────────────────────────────────────────

export function parsePgn(pgn: string): ParsedPgn {
  const rawGame = parseGame(pgn);

  const rawTags: Record<string, string> = {};
  if (rawGame.tags) {
    const tags = rawGame.tags as Tags;
    for (const [key, val] of Object.entries(tags)) {
      if (val === null || val === undefined) continue;
      if (typeof val === 'string') {
        rawTags[key] = val;
      } else if (typeof val === 'object' && 'value' in val) {
        rawTags[key] = String((val as { value: unknown }).value);
      } else {
        rawTags[key] = String(val);
      }
    }
  }

  const rootFen = rawTags['FEN'] ?? STARTING_FEN;
  const metadata = extractMetadata(rawTags);

  const chess = new Chess(rootFen);
  const mainLine = buildLine(rawGame.moves ?? [], chess, null, 0);

  return {
    metadata,
    tree: { rootFen, mainLine },
  };
}

// ── Multi-game ────────────────────────────────────────────────────────────────

export interface ImportableGame {
  /** 0-based index within the PGN file */
  index: number;
  /** Raw single-game PGN string (can be passed to parsePgn) */
  pgn: string;
  white: string | null;
  black: string | null;
  event: string | null;
  date: string | null;
  result: string | null;
}

/**
 * Parses a PGN string that may contain one or more games.
 * Returns an array of ImportableGame descriptors.
 * Throws if the PGN is empty or completely unparseable.
 */
export function parseMultiPgn(pgn: string): ImportableGame[] {
  // Try multi-game parse first
  let rawGames: ReturnType<typeof parseGames>;
  try {
    rawGames = parseGames(pgn);
  } catch {
    // Fallback: single game
    rawGames = [parseGame(pgn)] as any;
  }

  if (!rawGames || rawGames.length === 0) {
    throw new Error('No valid games found in PGN');
  }

  // Re-split the raw PGN text into individual game strings so each can be
  // re-parsed with parsePgn() when the user selects it.
  const gameStrings = splitPgnIntoGames(pgn);

  return rawGames.map((raw, index) => {
    const rawTags: Record<string, string> = {};
    if (raw.tags) {
      const tags = raw.tags as Tags;
      for (const [key, val] of Object.entries(tags)) {
        if (val === null || val === undefined) continue;
        if (typeof val === 'string') {
          rawTags[key] = val;
        } else if (typeof val === 'object' && 'value' in val) {
          rawTags[key] = String((val as { value: unknown }).value);
        } else {
          rawTags[key] = String(val);
        }
      }
    }
    const result = rawTags['Result'] ?? null;
    return {
      index,
      pgn: gameStrings[index] ?? pgn,
      white: rawTags['White'] ?? null,
      black: rawTags['Black'] ?? null,
      event: rawTags['Event'] ?? null,
      date: rawTags['Date'] ?? null,
      result:
        result === '1-0' || result === '0-1' || result === '1/2-1/2' || result === '*'
          ? result
          : null,
    };
  });
}

/**
 * Splits a multi-game PGN string into individual game strings.
 * Each game starts with a '[' (tag section) and ends after the result token.
 */
function splitPgnIntoGames(pgn: string): string[] {
  const games: string[] = [];
  const lines = pgn.split('\n');
  let currentGame: string[] = [];
  let inGame = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('[')) {
      // New tag section — if we were in a game, save it
      if (inGame && currentGame.length > 0) {
        const gameText = currentGame.join('\n').trim();
        if (gameText) games.push(gameText);
        currentGame = [];
      }
      inGame = true;
      currentGame.push(line);
    } else {
      if (inGame) currentGame.push(line);
    }
  }

  // Push the last game
  if (currentGame.length > 0) {
    const gameText = currentGame.join('\n').trim();
    if (gameText) games.push(gameText);
  }

  return games.length > 0 ? games : [pgn];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractMetadata(tags: Record<string, string>): PgnMetadata {
  const num = (key: string): number | null => {
    const v = tags[key];
    if (!v) return null;
    const n = parseInt(v, 10);
    return isNaN(n) ? null : n;
  };
  const str = (key: string): string | null => tags[key] ?? null;
  const result = str('Result');

  return {
    event: str('Event'),
    site: str('Site'),
    date: str('Date'),
    round: str('Round'),
    white: str('White'),
    black: str('Black'),
    result:
      result === '1-0' || result === '0-1' || result === '1/2-1/2' || result === '*'
        ? result
        : null,
    whiteElo: num('WhiteElo'),
    blackElo: num('BlackElo'),
    eco: str('ECO'),
    opening: str('Opening'),
    timeControl: str('TimeControl'),
    annotator: str('Annotator'),
    rawTags: tags,
  };
}

function buildLine(
  rawMoves: PgnMove[],
  chess: Chess,
  parentId: string | null,
  basePly: number
): MoveNode[] {
  const nodes: MoveNode[] = [];

  for (const rawMove of rawMoves) {
    const san = rawMove.notation?.notation;
    if (!san) continue;

    // Snapshot chess state before applying this move (needed for variation branches)
    const fenBefore = chess.fen();

    const result = chess.move(san);
    if (!result) continue; // illegal move in PGN — skip

    const ply = basePly + nodes.length + 1;
    const node: MoveNode = {
      id: uuidv4(),
      san: result.san,
      uci: `${result.from}${result.to}${result.promotion ?? ''}`,
      fen: chess.fen(),
      ply,
      moveNumber: Math.ceil(ply / 2),
      color: result.color as 'w' | 'b',
      comment: rawMove.commentAfter ?? null,
      preComment: rawMove.commentMove ?? null,
      nags: (rawMove.nag ?? []).map((n: string) => parseInt(n.replace('$', ''), 10)),
      variations: [],
      parent: parentId,
    };

    // Build variation sub-trees — each branches from the position *before* this move
    if (rawMove.variations && rawMove.variations.length > 0) {
      for (const varMoves of rawMove.variations) {
        const varChess = new Chess(fenBefore);
        const varLine = buildLine(varMoves, varChess, parentId, ply - 1);
        node.variations.push(varLine);
      }
    }

    nodes.push(node);
    parentId = node.id;
  }

  return nodes;
}
