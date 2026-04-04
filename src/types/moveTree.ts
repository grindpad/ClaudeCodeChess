/**
 * Canonical move tree types. Every other file imports from here.
 *
 * The tree is recursive: MoveNode.variations holds alternative sub-lines.
 * No separate node registry is needed; the tree itself is the source of truth.
 * A flat nodeMap (Map<id, MoveNode>) is maintained in the store for O(1) lookups.
 */

/** Numeric Annotation Glyph — $1=!, $2=?, $3=!!, $4=??, $5=!?, $6=?! */
export type Nag = number;

export interface MoveNode {
  /** Stable UUID assigned at parse/create time. Never changes. */
  id: string;
  /** Standard algebraic notation: "e4", "Nf3", "O-O" */
  san: string;
  /** UCI coordinate notation: "e2e4", "g1f3", "e1g1" — used for engine and board */
  uci: string;
  /** FEN string of the position *after* this move. Computed once at creation. */
  fen: string;
  /** Half-move count from the root (root's children have ply=1) */
  ply: number;
  /** Full-move display number (1, 2, 3…) */
  moveNumber: number;
  /** Side that made this move */
  color: 'w' | 'b';
  /** Comment placed after this move in the PGN */
  comment: string | null;
  /** Comment placed before this move in the PGN (rare) */
  preComment: string | null;
  /** Numeric annotation glyphs (can be multiple, e.g. [1, 18] = "!+-") */
  nags: Nag[];
  /**
   * Alternative lines branching from the position *before* this move.
   * variations[i] is a complete sub-line starting with an alternative to this move.
   */
  variations: MoveNode[][];
  /** ID of the parent node; null for direct children of the root */
  parent: string | null;
}

export interface MoveTree {
  /** Starting FEN — STARTING_FEN by default, or from a PGN [FEN "..."] tag */
  rootFen: string;
  /** The primary sequence of moves */
  mainLine: MoveNode[];
}

/**
 * A single step in a NavigationPath cursor.
 * - `index`: position within the current line (mainLine or a variation)
 * - `variationIndex`: if present, the next segment is inside node.variations[variationIndex]
 */
export interface PathSegment {
  index: number;
  variationIndex?: number;
}

/**
 * Cursor into the move tree. Examples:
 *   []                                       → at root (starting position)
 *   [{ index: 0 }]                           → mainLine[0] (after 1st main-line move)
 *   [{ index: 4 }]                           → mainLine[4]
 *   [{ index: 4 }, { variationIndex: 1, index: 2 }]
 *                                            → mainLine[4].variations[1][2]
 */
export type NavigationPath = PathSegment[];

/** Standard starting position FEN */
export const STARTING_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
