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
import { parseGame } from '@mliebelt/pgn-parser';
import type { PgnMove, Tags } from '@mliebelt/pgn-types';
import type { ParsedPgn, PgnMetadata } from '../types/pgn';
import type { MoveNode, MoveTree } from '../types/moveTree';
import { STARTING_FEN } from '../types/moveTree';

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
