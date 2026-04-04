import type { MoveTree } from './moveTree';

export interface PgnMetadata {
  event: string | null;
  site: string | null;
  date: string | null;
  round: string | null;
  white: string | null;
  black: string | null;
  result: '1-0' | '0-1' | '1/2-1/2' | '*' | null;
  whiteElo: number | null;
  blackElo: number | null;
  eco: string | null;
  opening: string | null;
  timeControl: string | null;
  annotator: string | null;
  /** All raw PGN tag key→value pairs (for round-trip export) */
  rawTags: Record<string, string>;
}

export interface ParsedPgn {
  metadata: PgnMetadata;
  tree: MoveTree;
}
