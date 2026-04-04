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
  navigateForward: () => void;
  navigateBack: () => void;
  navigateToNode: (path: NavigationPath) => void;
  enterVariation: (nodeId: string, variationIndex: number) => void;
  resetToStartPosition: () => void;
  setAnnotation: (nodeId: string, comment: string) => void;
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

      // Check if this move already exists in the tree (avoid duplicates)
      if (existingNext && existingNext.uci === uci) {
        const newPath = advancePath(tree, navigationPath);
        set({ navigationPath: newPath, currentNode: existingNext, currentFen: existingNext.fen });
        return;
      }

      // Check if move exists as a variation of the current node
      if (lastSeg) {
        const currentNode = currentLine[lastSeg.index];
        if (currentNode) {
          for (let vi = 0; vi < currentNode.variations.length; vi++) {
            if (currentNode.variations[vi][0]?.uci === uci) {
              const newPath: NavigationPath = [...navigationPath, { variationIndex: vi, index: 0 }];
              const varNode = currentNode.variations[vi][0];
              set({ navigationPath: newPath, currentNode: varNode, currentFen: varNode.fen });
              return;
            }
          }
        }
      }

      // New move — create a node and append to the current line
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

      // Immutably append to the line
      const newLine = [...currentLine, newNode];
      const newTree = spliceLineIntoTree(tree, navigationPath, newLine);
      const newNodeMap = new Map(nodeMap);
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
      });
    },

    navigateForward() {
      const { moveTree, navigationPath } = get();
      if (!moveTree) return;
      const newPath = advancePath(moveTree, navigationPath);
      if (newPath === navigationPath) return;
      const node = resolveNode(moveTree, newPath);
      set({ navigationPath: newPath, currentNode: node, currentFen: node?.fen ?? moveTree.rootFen });
    },

    navigateBack() {
      const { moveTree, navigationPath } = get();
      if (!moveTree || navigationPath.length === 0) return;
      const newPath = retreatPath(navigationPath);
      const node = resolveNode(moveTree, newPath);
      set({ navigationPath: newPath, currentNode: node, currentFen: node?.fen ?? moveTree.rootFen });
    },

    navigateToNode(path) {
      const { moveTree } = get();
      if (!moveTree) return;
      const node = resolveNode(moveTree, path);
      set({ navigationPath: path, currentNode: node, currentFen: node?.fen ?? moveTree.rootFen });
    },

    enterVariation(nodeId, variationIndex) {
      const { moveTree, nodeMap } = get();
      if (!moveTree) return;
      // Find the path to nodeId, then append the variation entry
      // This is handled via navigateToNode after constructing the correct path
      // For now, delegates to the caller who builds the full path
    },

    resetToStartPosition() {
      const { moveTree } = get();
      const rootFen = moveTree?.rootFen ?? STARTING_FEN;
      set({ navigationPath: [], currentNode: null, currentFen: rootFen });
    },

    setAnnotation(nodeId, comment) {
      const { nodeMap, moveTree } = get();
      if (!moveTree) return;
      const node = nodeMap.get(nodeId);
      if (!node) return;
      node.comment = comment; // direct mutation is fine — Zustand tracks by reference
      set({ moveTree: { ...moveTree } }); // trigger re-render
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
