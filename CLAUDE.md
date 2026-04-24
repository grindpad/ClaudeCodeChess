# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Version Control

Commit and push to GitHub regularly throughout all work sessions. Every meaningful unit of progress (new feature, bug fix, refactor, etc.) should be its own commit with a clear, descriptive message. Never let significant work accumulate uncommitted.

---

## Project Overview

**ClaudeCodeChess** is a mobile-first chess study app built with Expo (SDK 55) + React Native. It supports full PGN import/export with recursive variations, Stockfish 18 engine analysis (web only), Lichess Masters Opening Explorer, and multiple board themes.

**GitHub:** https://github.com/grindpad/ClaudeCodeChess

---

## Tech Stack

| Layer | Library |
|---|---|
| Framework | Expo SDK 55 + Expo Router (file-based routing) |
| Board | react-native-chessboard |
| Chess logic | chess.js ^1.x |
| PGN parsing | Hand-written tokeniser + recursive-descent parser in `src/pgn/pgnParser.ts` |
| State | Zustand ^5.x with `subscribeWithSelector` middleware |
| Engine | Stockfish 18 single-threaded WASM (`public/stockfish-18-single.js`) |
| Gestures | react-native-gesture-handler + react-native-reanimated |
| Explorer API | Lichess Masters DB — `https://explorer.lichess.ovh/masters` (no auth) |

---

## Folder Structure

```
app/                        # Expo Router — routing only
  _layout.tsx               # Root layout; mounts useEngine() + useExplorer()
  index.tsx                 # Redirects → /(tabs)/board
  (tabs)/
    _layout.tsx             # Tab navigator
    board.tsx               # Main board screen
    settings.tsx            # Settings screen

src/
  components/
    board/
      BoardContainer.tsx    # Portrait/landscape layout; eval bar + board + panels
      ChessBoardWrapper.tsx # Controlled wrapper around react-native-chessboard
      EvaluationBar.tsx     # Sigmoid cp→% bar; horizontal (portrait) / vertical (landscape)
      NavigationControls.tsx# ⟪◀▶ + PGN + engine toggle + flip
    notation/
      NotationPanel.tsx     # Inline flow renderer; auto-scrolls to active move
      MoveToken.tsx         # Single tappable move chip (SAN + NAG)
      VariationBlock.tsx    # Recursive; collapsible at depth ≥ 2
      CommentBlock.tsx      # Inline comment text
    explorer/
      ExplorerPanel.tsx     # Loading/error/empty states container
      ExplorerMoveRow.tsx   # Move | freq bar | W%/D%/B% | avg rating; tap → makeMove
      ExplorerEmpty.tsx     # No data / offline / loading state
    pgn/
      PgnImportModal.tsx    # Paste text or file picker
    shared/
      PanelTabs.tsx         # Notation / Explorer tab switcher (wraps each in ErrorBoundary)
      ErrorBoundary.tsx     # React class component; labelled crash fallback + Try Again
      WinRateBar.tsx        # Tricolor W/D/B bar (segments < 4% hidden)

  store/
    index.ts                # Re-exports useChessStore
    chessStore.ts           # Single Zustand store (all slices composed)
    selectors.ts            # selectCanGoForward, selectCanGoBack
    slices/
      gameSlice.ts          # FEN, move tree, navigation, makeMove, nodeMap
      engineSlice.ts        # Engine output, status, depth, multiPV
      explorerSlice.ts      # Explorer data, LRU cache, loading/error
      uiSlice.ts            # Panel visibility, board flip, boardTheme, showCoordinates

  engine/
    stockfishWorker.ts      # Web Worker script (self-contained; uses importScripts)
    EngineController.ts     # Worker owner; 150ms debounce; UCI handshake
    uciParser.ts            # Pure: "info depth..." → EngineOutput; cpToBarValue sigmoid
    engineTypes.ts          # Re-exports from src/types/engine.ts

  pgn/
    pgnParser.ts            # Hand-written tokeniser + recursive-descent parser → MoveTree
    pgnSerializer.ts        # MoveTree → PGN string (7-tag STR, variations, NAGs, comments)

  api/
    lichessExplorer.ts      # fetchExplorerData(); AbortController; typed response
    explorerCache.ts        # In-memory LRU cache keyed by FEN (cap 200)

  hooks/
    useEngine.ts            # Creates/destroys EngineController; subscribeWithSelector on FEN
    useExplorer.ts          # 300ms debounced FEN subscription; respects explorerEnabled
    useNavigation.ts        # Navigation actions as a hook
    usePgnImport.ts         # File picker + paste + parse trigger

  types/
    moveTree.ts             # MoveNode, MoveTree, NavigationPath, STARTING_FEN (canonical)
    pgn.ts                  # PgnMetadata, ParsedPgn
    engine.ts               # EngineOutput, EngineStatus

  utils/
    fenUtils.ts             # fenToTurn(), fenToFullMove(), etc.
    nag.ts                  # NAG number → symbol ($1→!, $2→?, etc.)
    platform.ts             # isWasmSupported(), isWeb(), isNative()

public/
  stockfish-18-single.js    # Self-contained Stockfish Web Worker (served at web root)
  stockfish-18-single.wasm  # 107MB — GITIGNORED (exceeds GitHub's 100MB limit)
```

---

## Key Architecture Decisions

### Move Tree
Each `MoveNode` stores its resulting FEN at creation time. Navigation is O(1) — just `currentFen = node.fen`, never replaying moves. A flat `nodeMap: Map<string, MoveNode>` in the store enables O(1) jump-to-move and annotation edits.

`NavigationPath` is a `PathSegment[]` cursor:
- `[]` = at root
- `[{ index: 2 }]` = mainLine[2]
- `[{ index: 2 }, { variationIndex: 1, index: 0 }]` = mainLine[2].variations[1][0]

### Stockfish (Web Only)
- `stockfish-18-single.js` is a self-contained worker — `new Worker('/stockfish-18-single.js')` — no custom wrapper needed.
- Single-threaded build avoids `SharedArrayBuffer` / COOP-COEP header requirements.
- `EngineController` debounces analysis 150ms and uses `analysisId` to drop stale responses on FEN change.
- On native builds, `engineStatus === 'unsupported'` — eval bar and analysis button are hidden/disabled.
- The `.wasm` file must be present in `public/` locally but is gitignored. Copy it from `node_modules/stockfish/bin/` if missing.

### Zustand Subscriptions
`subscribeWithSelector` middleware is critical. `useEngine` and `useExplorer` hooks subscribe to `currentFen` changes without triggering component re-renders across the tree.

### Board ↔ Store FEN Sync
`ChessBoardWrapper` uses an `isUserMoveRef` flag:
- User makes a move → set ref `true` → call `store.makeMove()` → skip `resetBoard` in the useEffect (board already shows the move).
- External FEN change (navigation, PGN load) → ref is `false` → call `boardRef.current?.resetBoard(fen)`.

### PGN Parsing
**Do not use `chess.js` `loadPgn()`** — it silently drops all variations, NAGs, and comments. Always use the hand-written parser in `pgnParser.ts` which handles BOM, CRLF, `[%csl]`/`[%cal]` annotations, NAGs $0–$255, and multi-game files with correct boundary detection.

### Notation Rendering
Inline flow layout (not a FlatList). `renderLine()` in `VariationBlock.tsx` returns an array of `MoveToken`, `CommentBlock`, and nested `VariationBlock` components. A zero-height `View` with `flexBasis: '100%'` is used as a line-break within the wrapping flex container.

---

## Running the App

```bash
# Install dependencies
npm install

# Start dev server (choose platform in browser)
npx expo start

# Web only (engine works here)
npx expo start --web

# Build web bundle
npx expo export --platform web
```

> **Note:** After `expo export`, `dist/` will contain `stockfish-18-single.js` and `stockfish-18-single.wasm` (copied from `public/`). The WASM file is excluded from git — copy it from `node_modules/stockfish/bin/stockfish-18-single.wasm` to `public/` if it is missing.

---

## Metro Config

`metro.config.js` adds `wasm` to `assetExts` so Stockfish's WASM binary is bundled correctly:

```javascript
config.resolver.assetExts.push('wasm');
```

---

## Board Themes

Defined in `src/store/slices/uiSlice.ts` as `BOARD_THEMES`. Each theme has `white`, `black`, and `lastMoveHighlight` colors. Currently: `classic`, `blue`, `walnut`.

---

## Known Constraints

- Engine analysis is **web only**. On Expo Go / native, `engineStatus` is `'unsupported'`.
- `stockfish-18-single.wasm` is gitignored (107MB). Must be present locally in `public/` to run.
- Lichess Explorer requires an internet connection. Failures are caught and shown as a retry UI.
