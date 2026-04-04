/**
 * Serializes a MoveTree + PgnMetadata back to a PGN string.
 * Produces standard export-format PGN compatible with any chess GUI.
 */

import type { MoveTree, MoveNode } from '../types/moveTree';
import type { PgnMetadata } from '../types/pgn';
import { nagToSymbol } from '../utils/nag';

export function serializePgn(tree: MoveTree, metadata: PgnMetadata | null): string {
  const tags = buildTagSection(tree, metadata);
  const moves = buildMoveSection(tree.mainLine, true);
  const result = metadata?.result ?? '*';
  return `${tags}\n${moves} ${result}`.trim();
}

// ── Tag section ────────────────────────────────────────────────────────────────

function buildTagSection(tree: MoveTree, metadata: PgnMetadata | null): string {
  // Start with the seven required tags (STR), then optional extras
  const str: Array<[string, string]> = [
    ['Event', metadata?.event ?? '?'],
    ['Site', metadata?.site ?? '?'],
    ['Date', metadata?.date ?? '????.??.??'],
    ['Round', metadata?.round ?? '?'],
    ['White', metadata?.white ?? '?'],
    ['Black', metadata?.black ?? '?'],
    ['Result', metadata?.result ?? '*'],
  ];

  const optional: Array<[string, string | number | null | undefined]> = [
    ['WhiteElo', metadata?.whiteElo],
    ['BlackElo', metadata?.blackElo],
    ['ECO', metadata?.eco],
    ['Opening', metadata?.opening],
    ['TimeControl', metadata?.timeControl],
    ['Annotator', metadata?.annotator],
  ];

  // Non-STR tags from rawTags that aren't already covered above
  const strKeys = new Set(['Event','Site','Date','Round','White','Black','Result',
    'WhiteElo','BlackElo','ECO','Opening','TimeControl','Annotator','FEN','SetUp']);
  const extra: Array<[string, string]> = [];
  if (metadata?.rawTags) {
    for (const [key, val] of Object.entries(metadata.rawTags)) {
      if (!strKeys.has(key) && val != null) extra.push([key, val]);
    }
  }

  // FEN tag if non-standard starting position
  if (tree.rootFen !== 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1') {
    str.push(['SetUp', '1']);
    str.push(['FEN', tree.rootFen]);
  }

  const lines: string[] = [];
  for (const [key, val] of str) {
    lines.push(tag(key, String(val)));
  }
  for (const [key, val] of optional) {
    if (val != null) lines.push(tag(key, String(val)));
  }
  for (const [key, val] of extra) {
    lines.push(tag(key, val));
  }

  return lines.join('\n');
}

function tag(key: string, val: string): string {
  // Escape backslashes and double-quotes inside the value
  const escaped = val.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `[${key} "${escaped}"]`;
}

// ── Move section ───────────────────────────────────────────────────────────────

/**
 * Recursively serializes a line of MoveNodes.
 * @param isFirstInGame  When true, always show the move number on the first move.
 */
function buildMoveSection(nodes: MoveNode[], isFirstInGame: boolean): string {
  const parts: string[] = [];
  let forceNumber = isFirstInGame;

  for (const node of nodes) {
    // Move number prefix
    if (node.color === 'w') {
      parts.push(`${node.moveNumber}.`);
      forceNumber = false;
    } else if (forceNumber) {
      parts.push(`${node.moveNumber}...`);
      forceNumber = false;
    }

    // Pre-move comment
    if (node.preComment?.trim()) {
      parts.push(`{ ${node.preComment.trim()} }`);
    }

    // The move itself
    parts.push(node.san);

    // NAGs
    for (const nag of node.nags) {
      parts.push(`$${nag}`);
    }

    // Post-move comment
    if (node.comment?.trim()) {
      parts.push(`{ ${node.comment.trim()} }`);
    }

    // Variations — each is wrapped in ( )
    for (const variation of node.variations) {
      if (variation.length === 0) continue;
      const varText = buildMoveSection(variation, true);
      parts.push(`( ${varText} )`);
      // After a variation, force the move number to be shown on the next move
      forceNumber = true;
    }
  }

  return parts.join(' ');
}
