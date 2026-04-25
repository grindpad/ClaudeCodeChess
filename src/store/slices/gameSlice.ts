import { Chess } from 'chess.js';
import { v4 as uuidv4 } from 'uuid';
import type { StateCreator } from 'zustand';
import type { ChessStore } from '../chessStore';
import type { MoveNode, MoveTree, NavigationPath, PathSegment } from '../../types/moveTree';
import type { PgnMetadata } from '../../types/pgn';
import { STARTING_FEN } from '../../types/moveTree';
import { parsePgn } from '../../pgn/pgnParser';

export interface GameSlice {
  // ── State ──────────────────────────────────────────────────────────────────
  currentFen: string;
  moveTree: MoveTree | null;
  metadata: PgnMetadata | null;
  navigationPath: NavigationPath;
  currentNode: MoveNode | null;
  /** Flat lookup map for O(1) node access by ID */
  nodeMap: Map<string, MoveNode>;

  // ── Actions ────────────────────────────────────────────────────────────────
  loadPgn: (pgn: string) => void;
  makeMove: (uci: string) => void;
  /** Commits a pending move conflict as a new variation nested under the existing next node. */
  commitPendingMoveAsVariation: () => void;
  /** Commits a pending move conflict by replacing the existing mainline continuation. */
  commitPendingMoveReplaceLine: () => void;
  /** Promotes the variation at path to the mainline; the old mainline becomes variation[0]. */
  promoteVariation: (path: NavigationPath) => void;
  navigateForward: () => void;
  navigateBack: () => void;
  navigateToNode: (path: NavigationPath) => void;
  enterVariation: (nodeId: string, variationIndex: number) => void;
  resetToStartPosition: () => void;
  setAnnotation: (nodeId: string, comment: string) => void;
  newGame: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildNodeMap(nodes: MoveNode[], map: Map<string, MoveNode>): void {
  for (const node of nodes) {
    map.set(node.id, node);
    for (const variation of node.variations) {
      buildNodeMap(variation, map);
    }
  }
}

/** Removes a subtree of nodes (and all their variation descendants) from the map. */
function removeNodesFromMap(nodes: MoveNode[], map: Map<string, MoveNode>): void {
  for (const node of nodes) {
    map.delete(node.id);
    for (const variation of node.variations) {
      removeNodesFromMap(variation, map);
    }
  }
}

/**
 * Depth-first search for a node by ID. Returns the NavigationPath to that node,
 * or null if not found.
 */
function findPathToNode(tree: MoveTree, nodeId: string): NavigationPath | null {
  return searchLine(tree.mainLine, nodeId, []);
}

function searchLine(
  line: MoveNode[],
  nodeId: string,
  basePath: NavigationPath,
  variationIndex?: number
): NavigationPath | null {
  for (let i = 0; i < line.length; i++) {
    // Build the path segment for this node
    const nodePath: NavigationPath =
      variationIndex !== undefined
        ? [...basePath, { variationIndex, index: i }]
        : [...basePath, { index: i }];
    const node = line[i];
    if (node.id === nodeId) return nodePath;
    for (let vi = 0; vi < node.variations.length; vi++) {
      const found = searchLine(node.variations[vi], nodeId, nodePath, vi);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Given a tree and a NavigationPath, return the line (array of MoveNodes)
 * that the path cursor is currently inside.
 */
function getCurrentLine(tree: MoveTree, path: NavigationPath): MoveNode[] {
  if (path.length === 0) return tree.mainLine;
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

/**
 * Resolve a NavigationPath to the MoveNode it points to.
 * Returns null if the path is empty (at root).
 */
function resolveNode(tree: MoveTree, path: NavigationPath): MoveNode | null {
  if (path.length === 0) return null;
  const line = getCurrentLine(tree, path);
  const lastSeg = path[path.length - 1];
  return line[lastSeg.index] ?? null;
}

function advancePath(tree: MoveTree, path: NavigationPath): NavigationPath {
  if (path.length === 0) {
    if (tree.mainLine.length > 0) return [{ index: 0 }];
    return path;
  }
  const line = getCurrentLine(tree, path);
  const lastSeg = path[path.length - 1];
  if (lastSeg.index + 1 < line.length) {
    return [...path.slice(0, -1), { ...lastSeg, index: lastSeg.index + 1 }];
  }
  return path; // already at end
}

function retreatPath(path: NavigationPath): NavigationPath {
  if (path.length === 0) return path;
  const lastSeg = path[path.length - 1];
  if (lastSeg.index > 0) {
    return [...path.slice(0, -1), { ...lastSeg, index: lastSeg.index - 1 }];
  }
  // At index 0 of a variation — pop back to the fork node
  if (path.length > 1) return path.slice(0, -1);
  return []; // back to root
}

/** Extract [from, to] squares from a UCI string for lastMoveSquares. */
function uciToSquares(uci: string | null | undefined): [string, string] | null {
  if (!uci || uci.length < 4) return null;
  return [uci.slice(0, 2), uci.slice(2, 4)];
}

// ── Slice factory ─────────────────────────────────────────────────────────────

export const createGameSlice: StateCreator<ChessStore, [['zustand/subscribeWithSelector', never]], [], GameSlice> =
  (set, get) => ({
    currentFen: STARTING_FEN,
    moveTree: null,
    metadata: null,
    navigationPath: [],
    currentNode: null,
    nodeMap: new Map(),

    loadPgn(pgn) {
      try {
        const { metadata, tree } = parsePgn(pgn);
        const nodeMap = new Map<string, MoveNode>();
        buildNodeMap(tree.mainLine, nodeMap);
        set({
          moveTree: tree,
          metadata,
          nodeMap,
          navigationPath: [],
          currentNode: null,
          currentFen: tree.rootFen,
          lastMoveSquares: null,
          // BUG-003 FIX: Clear stale explorer data from the previous game
          explorerData: null,
          explorerError: null,
          engineOutput: null,
        });
      } catch (err) {
        console.error('PGN parse error:', err);
      }
    },

    makeMove(uci) {
      const { currentFen, moveTree, navigationPath, nodeMap } = get();
      const chess = new Chess(currentFen);
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promotion = uci.length === 5 ? uci[4] : undefined;

      const result = chess.move({ from, to, promotion });
      if (!result) return; // illegal move — board will snap back

      const newFen = chess.fen();
      const tree = moveTree ?? { rootFen: STARTING_FEN, mainLine: [] };
      const currentLine = getCurrentLine(tree, navigationPath);
      const lastSeg = navigationPath.length > 0 ? navigationPath[navigationPath.length - 1] : null;
      const nextIndex = lastSeg ? lastSeg.index + 1 : 0;
      const existingNext = currentLine[nextIndex];

      // BUG-A FIX: lastMoveSquares updated here so explorer/engine moves show the arrow
      const lastMove: [string, string] = [from, to];

      // Check if this move already exists as the next main-line move
      if (existingNext && existingNext.uci === uci) {
        const newPath = advancePath(tree, navigationPath);
        set({ navigationPath: newPath, currentNode: existingNext, currentFen: existingNext.fen, lastMoveSquares: lastMove });
        return;
      }

      // BUG-002 FIX: Check if move exists as a variation of the *next* node
      // (existingNext.variations hold alternatives from the same position as existingNext)
      if (existingNext) {
        for (let vi = 0; vi < existingNext.variations.length; vi++) {
          if (existingNext.variations[vi][0]?.uci === uci) {
            const nextPath: NavigationPath = lastSeg
              ? [...navigationPath.slice(0, -1), { ...lastSeg, index: lastSeg.index + 1 }]
              : [{ index: 0 }];
            const newPath: NavigationPath = [...nextPath, { variationIndex: vi, index: 0 }];
            const varNode = existingNext.variations[vi][0];
            set({ navigationPath: newPath, currentNode: varNode, currentFen: varNode.fen, lastMoveSquares: lastMove });
            return;
          }
        }
      }

      // FEATURE-2: Existing continuation diverges from new move — show conflict popup.
      if (existingNext) {
        const conflictParent = lastSeg ? currentLine[lastSeg.index] : null;
        const newMoveNumber = result.color === 'b'
          ? (conflictParent?.moveNumber ?? 0)
          : (conflictParent?.moveNumber ?? 0) + 1;
        set({
          pendingMove: {
            uci,
            newSan: result.san,
            newMoveNumber,
            newColor: result.color as 'w' | 'b',
            existingSan: existingNext.san,
            existingMoveNumber: existingNext.moveNumber,
            existingColor: existingNext.color,
          },
        });
        return;
      }

      // New move — create a node and splice into the current line.
      // BUG-001 FIX: Truncate the line at nextIndex (discard any nodes after the current
      // position), then append the new node. Also remove orphaned nodes from nodeMap.
      const parentNode = lastSeg ? currentLine[lastSeg.index] : null;
      const newNode: MoveNode = {
        id: uuidv4(),
        san: result.san,
        uci,
        fen: newFen,
        ply: (parentNode?.ply ?? 0) + 1,
        moveNumber: result.color === 'b'
          ? (parentNode?.moveNumber ?? 0)
          : (parentNode?.moveNumber ?? 0) + 1,
        color: result.color as 'w' | 'b',
        comment: null,
        preComment: null,
        nags: [],
        variations: [],
        parent: parentNode?.id ?? null,
      };

      // Remove truncated nodes from nodeMap before building the new tree
      const newNodeMap = new Map(nodeMap);
      const truncated = currentLine.slice(nextIndex);
      removeNodesFromMap(truncated, newNodeMap);

      // Slice the line at the current position and append the new node
      const newLine = [...currentLine.slice(0, nextIndex), newNode];
      const newTree = spliceLineIntoTree(tree, navigationPath, newLine);
      newNodeMap.set(newNode.id, newNode);

      const newPath: NavigationPath = lastSeg
        ? [...navigationPath.slice(0, -1), { ...lastSeg, index: lastSeg.index + 1 }]
        : [{ index: 0 }];

      set({
        moveTree: newTree,
        nodeMap: newNodeMap,
        navigationPath: newPath,
        currentNode: newNode,
        currentFen: newFen,
        lastMoveSquares: lastMove,
        hasUnsavedChanges: true,
      });
    },

    navigateForward() {
      const { moveTree, navigationPath } = get();
      if (!moveTree) return;
      const newPath = advancePath(moveTree, navigationPath);
      if (newPath === navigationPath) return;
      const node = resolveNode(moveTree, newPath);
      // BUG-C FIX: sync lastMoveSquares with the node we navigated to
      set({ navigationPath: newPath, currentNode: node, currentFen: node?.fen ?? moveTree.rootFen, lastMoveSquares: uciToSquares(node?.uci) });
    },

    navigateBack() {
      const { moveTree, navigationPath } = get();
      if (!moveTree || navigationPath.length === 0) return;
      const newPath = retreatPath(navigationPath);
      const node = resolveNode(moveTree, newPath);
      // BUG-C FIX: sync lastMoveSquares with the node we navigated to
      set({ navigationPath: newPath, currentNode: node, currentFen: node?.fen ?? moveTree.rootFen, lastMoveSquares: uciToSquares(node?.uci) });
    },

    navigateToNode(path) {
      const { moveTree } = get();
      if (!moveTree) return;
      const node = resolveNode(moveTree, path);
      // BUG-C FIX: sync lastMoveSquares with the node we navigated to
      set({ navigationPath: path, currentNode: node, currentFen: node?.fen ?? moveTree.rootFen, lastMoveSquares: uciToSquares(node?.uci) });
    },

    enterVariation(nodeId, variationIndex) {
      const { moveTree, nodeMap } = get();
      if (!moveTree) return;
      const node = nodeMap.get(nodeId);
      if (!node) return;
      const variation = node.variations[variationIndex];
      if (!variation || variation.length === 0) return;
      // Find the path to this node by searching the tree, then append the variation entry
      const nodePath = findPathToNode(moveTree, nodeId);
      if (!nodePath) return;
      const newPath: NavigationPath = [...nodePath, { variationIndex, index: 0 }];
      const firstVarNode = variation[0];
      set({ navigationPath: newPath, currentNode: firstVarNode, currentFen: firstVarNode.fen, lastMoveSquares: uciToSquares(firstVarNode.uci) });
    },

    resetToStartPosition() {
      const { moveTree } = get();
      const rootFen = moveTree?.rootFen ?? STARTING_FEN;
      // BUG-C FIX: no last move at root position
      set({ navigationPath: [], currentNode: null, currentFen: rootFen, lastMoveSquares: null });
    },

    setAnnotation(nodeId, comment) {
      const { nodeMap, moveTree } = get();
      if (!moveTree) return;
      const node = nodeMap.get(nodeId);
      if (!node) return;
      node.comment = comment; // direct mutation is fine — Zustand tracks by reference
      set({ moveTree: { ...moveTree } }); // trigger re-render
    },

    newGame() {
      // BUG-G FIX: reset ALL derived state so board, engine, explorer all clear
      set({
        moveTree: null,
        metadata: null,
        nodeMap: new Map(),
        navigationPath: [],
        currentNode: null,
        currentFen: STARTING_FEN,
        lastMoveSquares: null,
        explorerData: null,
        explorerError: null,
        engineOutput: null,
        activeLibraryEntryId: null,
        activeGameId: null,
        hasUnsavedChanges: false,
        pendingMove: null,
        pendingPromotion: null,
      });
    },

    commitPendingMoveAsVariation() {
      const { pendingMove, currentFen, moveTree, navigationPath, nodeMap } = get();
      if (!pendingMove || !moveTree) return;

      const { uci } = pendingMove;
      const chess = new Chess(currentFen);
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promotion = uci.length === 5 ? uci[4] : undefined;
      const result = chess.move({ from, to, promotion });
      if (!result) return;

      const newFen = chess.fen();
      const currentLine = getCurrentLine(moveTree, navigationPath);
      const lastSeg = navigationPath.length > 0 ? navigationPath[navigationPath.length - 1] : null;
      const nextIndex = lastSeg ? lastSeg.index + 1 : 0;
      const existingNext = currentLine[nextIndex];
      if (!existingNext) return;

      const parentNode = lastSeg ? currentLine[lastSeg.index] : null;
      const newNode: MoveNode = {
        id: uuidv4(),
        san: result.san,
        uci,
        fen: newFen,
        ply: (parentNode?.ply ?? 0) + 1,
        moveNumber: result.color === 'b'
          ? (parentNode?.moveNumber ?? 0)
          : (parentNode?.moveNumber ?? 0) + 1,
        color: result.color as 'w' | 'b',
        comment: null,
        preComment: null,
        nags: [],
        variations: [],
        parent: parentNode?.id ?? null,
      };

      const newVariationIndex = existingNext.variations.length;
      const updatedExistingNext: MoveNode = {
        ...existingNext,
        variations: [...existingNext.variations, [newNode]],
      };

      // Replace existingNext in the current line (keep all surrounding nodes intact)
      const newLine = [
        ...currentLine.slice(0, nextIndex),
        updatedExistingNext,
        ...currentLine.slice(nextIndex + 1),
      ];
      const newTree = spliceLineIntoTree(moveTree, navigationPath, newLine);

      const newNodeMap = new Map(nodeMap);
      newNodeMap.set(newNode.id, newNode);
      newNodeMap.set(updatedExistingNext.id, updatedExistingNext);

      // Path to existingNext (which now holds the new variation)
      const existingNextPath: NavigationPath = lastSeg
        ? [...navigationPath.slice(0, -1), { ...lastSeg, index: nextIndex }]
        : [{ index: 0 }];
      // Path to the new variation's first node
      const newPath: NavigationPath = [
        ...existingNextPath,
        { variationIndex: newVariationIndex, index: 0 },
      ];

      set({
        moveTree: newTree,
        nodeMap: newNodeMap,
        navigationPath: newPath,
        currentNode: newNode,
        currentFen: newFen,
        lastMoveSquares: [from, to],
        hasUnsavedChanges: true,
        pendingMove: null,
      });
    },

    commitPendingMoveReplaceLine() {
      const { pendingMove, currentFen, moveTree, navigationPath, nodeMap } = get();
      if (!pendingMove || !moveTree) return;

      const { uci } = pendingMove;
      const chess = new Chess(currentFen);
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promotion = uci.length === 5 ? uci[4] : undefined;
      const result = chess.move({ from, to, promotion });
      if (!result) return;

      const newFen = chess.fen();
      const currentLine = getCurrentLine(moveTree, navigationPath);
      const lastSeg = navigationPath.length > 0 ? navigationPath[navigationPath.length - 1] : null;
      const nextIndex = lastSeg ? lastSeg.index + 1 : 0;
      const parentNode = lastSeg ? currentLine[lastSeg.index] : null;

      const newNode: MoveNode = {
        id: uuidv4(),
        san: result.san,
        uci,
        fen: newFen,
        ply: (parentNode?.ply ?? 0) + 1,
        moveNumber: result.color === 'b'
          ? (parentNode?.moveNumber ?? 0)
          : (parentNode?.moveNumber ?? 0) + 1,
        color: result.color as 'w' | 'b',
        comment: null,
        preComment: null,
        nags: [],
        variations: [],
        parent: parentNode?.id ?? null,
      };

      // Remove all nodes from nextIndex onwards (they're discarded)
      const newNodeMap = new Map(nodeMap);
      removeNodesFromMap(currentLine.slice(nextIndex), newNodeMap);

      const newLine = [...currentLine.slice(0, nextIndex), newNode];
      const newTree = spliceLineIntoTree(moveTree, navigationPath, newLine);
      newNodeMap.set(newNode.id, newNode);

      const newPath: NavigationPath = lastSeg
        ? [...navigationPath.slice(0, -1), { ...lastSeg, index: nextIndex }]
        : [{ index: 0 }];

      set({
        moveTree: newTree,
        nodeMap: newNodeMap,
        navigationPath: newPath,
        currentNode: newNode,
        currentFen: newFen,
        lastMoveSquares: [from, to],
        hasUnsavedChanges: true,
        pendingMove: null,
      });
    },

    promoteVariation(path) {
      const { moveTree, nodeMap } = get();
      if (!moveTree || path.length === 0) return;

      // path = [..., { variationIndex: vi, index: 0 }] — path to variation's first node
      const lastSeg = path[path.length - 1];
      const vi = lastSeg.variationIndex;
      if (vi === undefined) return;

      // forkPath = path to the fork node (the node whose .variations[vi] we promote)
      const forkPath = path.slice(0, -1);
      if (forkPath.length === 0) return;

      const forkNode = resolveNode(moveTree, forkPath);
      if (!forkNode || !forkNode.variations[vi] || forkNode.variations[vi].length === 0) return;

      const forkLastSeg = forkPath[forkPath.length - 1];
      const forkIndex = forkLastSeg.index;

      // parentLine = the line that contains forkNode
      const parentLine = getCurrentLine(moveTree, forkPath);
      const nextIndex = forkIndex + 1;
      const promotedVariation = forkNode.variations[vi];
      const oldContinuation = parentLine.slice(nextIndex);

      // New variations on forkNode: old mainline continuation first (if any), then rest
      const remainingVariations = forkNode.variations.filter((_, i) => i !== vi);
      const newVariations: MoveNode[][] = oldContinuation.length > 0
        ? [oldContinuation, ...remainingVariations]
        : remainingVariations;

      const newForkNode: MoveNode = { ...forkNode, variations: newVariations };

      // New parent line: everything before forkNode, then newForkNode, then promoted nodes
      const newParentLine: MoveNode[] = [
        ...parentLine.slice(0, forkIndex),
        newForkNode,
        ...promotedVariation,
      ];

      // Replace the parent line in the tree
      const newTree = spliceLineIntoTree(moveTree, forkPath, newParentLine);

      // Update nodeMap: forkNode object changed (new variations)
      const newNodeMap = new Map(nodeMap);
      newNodeMap.set(newForkNode.id, newForkNode);

      // Path to the first promoted node (now at forkIndex+1 in the parent line)
      const promotedFirstPath: NavigationPath = [
        ...forkPath.slice(0, -1),
        { ...forkLastSeg, index: forkIndex + 1 },
      ];
      const promotedFirst = promotedVariation[0];

      set({
        moveTree: newTree,
        nodeMap: newNodeMap,
        navigationPath: promotedFirstPath,
        currentNode: promotedFirst,
        currentFen: promotedFirst.fen,
        lastMoveSquares: uciToSquares(promotedFirst.uci),
        hasUnsavedChanges: true,
        pendingPromotion: null,
      });
    },
  });

// ── Tree mutation helpers ─────────────────────────────────────────────────────

/**
 * Returns a new MoveTree where the line pointed to by `path` is replaced with `newLine`.
 * If path is empty, replaces the mainLine.
 */
function spliceLineIntoTree(tree: MoveTree, path: NavigationPath, newLine: MoveNode[]): MoveTree {
  if (path.length === 0) {
    return { ...tree, mainLine: newLine };
  }
  // Walk the path to find the variation parent and index to replace
  // This creates a shallow-copy chain from root to the modified variation
  return {
    ...tree,
    mainLine: spliceLineInNodes(tree.mainLine, path, newLine, 0),
  };
}

function spliceLineInNodes(
  line: MoveNode[],
  path: NavigationPath,
  newLine: MoveNode[],
  depth: number
): MoveNode[] {
  if (depth >= path.length - 1) return newLine;

  const seg = path[depth];
  const nextSeg = path[depth + 1];
  if (nextSeg.variationIndex === undefined) return newLine;

  return line.map((node, i) => {
    if (i !== seg.index) return node;
    const newVariations = node.variations.map((varLine, vi) => {
      if (vi !== nextSeg.variationIndex) return varLine;
      return spliceLineInNodes(varLine, path, newLine, depth + 1);
    });
    return { ...node, variations: newVariations };
  });
}
