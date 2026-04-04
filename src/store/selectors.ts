/**
 * Memoizable selectors derived from the Zustand store.
 * Use with useChessStore(selectCanGoForward) etc.
 */

import type { ChessStore } from './chessStore';
import type { NavigationPath, MoveTree } from '../types/moveTree';

/** Returns true if there is at least one move forward to navigate to. */
export function selectCanGoForward(s: ChessStore): boolean {
  const { moveTree, navigationPath, currentNode } = s;
  if (!moveTree) return false;
  // At root — can go forward if mainLine has moves
  if (navigationPath.length === 0) return moveTree.mainLine.length > 0;
  if (!currentNode) return false;
  // Resolve the current line and check if there is a next index
  const line = resolveCurrentLine(moveTree, navigationPath);
  const lastIdx = navigationPath[navigationPath.length - 1].index;
  return lastIdx < line.length - 1;
}

/** Returns true if there is at least one move backward to navigate to. */
export function selectCanGoBack(s: ChessStore): boolean {
  return s.navigationPath.length > 0;
}

// ── Internal helper ──────────────────────────────────────────────────────────

function resolveCurrentLine(tree: MoveTree, path: NavigationPath) {
  let line = tree.mainLine;
  for (let i = 0; i < path.length - 1; i++) {
    const seg = path[i];
    const nextSeg = path[i + 1];
    if (nextSeg.variationIndex !== undefined) {
      line = line[seg.index]?.variations[nextSeg.variationIndex] ?? [];
    }
  }
  return line;
}
