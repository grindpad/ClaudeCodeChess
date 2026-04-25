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
  _layout.tsx               # Root layout; mounts useEngine() + useExplorer(); session persistence
  index.tsx                 # Redirects → /(tabs)/board
  import-select.tsx         # Multi-game picker after PGN import
  games.tsx                 # Library browser (LibraryEntry rows, swipe-to-delete, export)
  library-entry.tsx         # Drill-down for multi-game entries
  (tabs)/
    _layout.tsx             # Tab navigator
    board.tsx               # Main board screen; mounts SaveGameModal
    settings.tsx            # Settings screen

src/
  components/
    board/
      BoardContainer.tsx    # Portrait/landscape layout; eval bar + board + panels
      ChessBoardWrapper.tsx # Controlled wrapper around react-native-chessboard
      EvaluationBar.tsx     # Sigmoid cp→% bar; horizontal (portrait) / vertical (landscape)
      NavigationControls.tsx# ⏮◀▶⇅ nav buttons + panel selector label + variation picker
      Sidebar.tsx           # Slide-in menu (swipe from left edge); New/Save/Import/Engine/Settings
    notation/
      NotationPanel.tsx     # Inline flow renderer; auto-scrolls to active move
      MoveToken.tsx         # Single tappable move chip (SAN + NAG)
      VariationBlock.tsx    # Recursive; collapsible at depth ≥ 2; auto-expands on navigation
      CommentBlock.tsx      # Inline comment text
      VariationPickerModal.tsx # Modal shown by ▶ when next position branches
    explorer/
      ExplorerPanel.tsx     # Loading/error/empty states container
      ExplorerMoveRow.tsx   # Move | freq bar | W%/D%/B% | avg rating; tap → makeMove
      ExplorerEmpty.tsx     # No data / offline / loading state
    pgn/
      PgnImportModal.tsx    # Paste text or file picker; auto-saves to library on import
      SaveGameModal.tsx     # Bottom-sheet; White/Black/Event/Date; saves/updates library entry
    shared/
      PanelTabs.tsx         # Notation / Explorer / Engine swipeable container (ErrorBoundary each)
      ErrorBoundary.tsx     # React class component; labelled crash fallback + Try Again
      WinRateBar.tsx        # Tricolor W/D/B bar (segments < 4% hidden)

  storage/
    storageTypes.ts         # StoredGameRecord, LibraryEntry, SessionState types
    gameStorage.ts          # localStorage CRUD: saveEntry, getEntry, getAllEntries, deleteEntry,
                            #   updateEntry, updateGame, saveSession, loadSession, clearSession

  store/
    index.ts                # Re-exports useChessStore
    chessStore.ts           # Single Zustand store (all slices composed)
    selectors.ts            # selectCanGoForward, selectCanGoBack
    slices/
      gameSlice.ts          # FEN, move tree, navigation, makeMove, nodeMap
      engineSlice.ts        # Engine output, status, depth, multiPV
      explorerSlice.ts      # Explorer data, LRU cache, loading/error
      uiSlice.ts            # Panel visibility, board flip, boardTheme, showCoordinates,
                            #   saveGameModalVisible, activeLibraryEntryId, activeGameId,
                            #   hasUnsavedChanges

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
    navigationUtils.ts      # serializeNavigationPath / deserializeNavigationPath (JSON)

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

`VariationBlock` at `depth >= 2` is collapsible (starts collapsed). It auto-expands via a `useEffect` on `activeNodeId` — `containsNodeId()` recursively checks whether the active node lives inside the block, and sets `collapsed = false` if so. This ensures navigation via the ▶ variation picker always makes the destination visible.

### Notation Auto-Scroll
`NotationPanel` uses `measureLayout` relative to an inner `scrollViewContentRef` View (first child of the ScrollView), not the ScrollView itself. On RN Web the ScrollView's outer div shifts with scrolling, so measuring against it gives wrong coordinates. A `userIsScrolling` ref suppresses auto-scroll while the user is manually dragging.

### Variation Picker (▶ button)
`NavigationControls.handleForward` checks `buildContinuations()` before calling `navigateForward()`. If the next node has variations, a `VariationPickerModal` is shown instead. Path construction in `buildContinuations` uses the explicit `PathSegment` formula (not a helper that traverses the tree) so the resulting paths exactly match what `resolveNode` in the store expects. `handlePickerSelect` calls `navigateToNode(path)` **before** `setPickerVisible(false)` — closing the modal first can drop the navigation call on iOS Safari PWA.

### Panel Swipe
`PanelTabs` uses a single `PanResponder` created once inside `useRef`. Because the closure would otherwise capture stale `activeTab` and `onTabChange` from the first render, both values are stored in mutable refs (`activeTabRef`, `onTabChangeRef`) that are updated every render and read inside `onPanResponderRelease`.

### Game Library (Persistent Storage)
`src/storage/gameStorage.ts` manages three localStorage key namespaces:
- `chess_library_index` — JSON array of `{ id, title, source, dateAdded, dateModified, gameCount }`
- `chess_library_entry_{id}` — full `LibraryEntry` with all `StoredGameRecord` objects
- `chess_session` — `SessionState` (pgn, navigationPath, activeLibraryEntryId, activeGameId)

Session is restored on mount in `app/_layout.tsx` via `useSessionPersistence`. PGN import auto-saves to the library before routing. `SaveGameModal` handles both creating new entries and updating existing ones.

### NavigationPath Serialisation
`NavigationPath` (a `PathSegment[]`) is serialised to/from JSON strings for `localStorage` using `serializeNavigationPath` / `deserializeNavigationPath` in `src/utils/navigationUtils.ts`.

### New Game Flow (FIX-1)
`SidebarContent.handleNewGame` uses a custom `NewGameConfirmModal` instead of `Alert.alert`:
- If `hasUnsavedChanges && hasMoves` → close sidebar, show modal with Save / Discard / Cancel.
- "Save Game" sets `pendingNewGameRef.current = true` and opens `SaveGameModal`. A `useEffect` watching `saveGameModalVisible` detects the modal closing; if `hasUnsavedChanges` is now false (save succeeded), calls `newGame()`.
- If no unsaved changes (or empty board) → `newGame()` immediately, no modal.

### Move Conflict Detection (FEATURE-2)
When `makeMove` encounters an `existingNext` node that doesn't match the new move (and it's not already a variation), it sets `pendingMove: PendingMoveConflict | null` in uiSlice and returns without committing. `MoveConflictModal` (in `board.tsx`) reads `pendingMove` and presents three options:
- **Add as Variation** → `commitPendingMoveAsVariation()`: appends new node to `existingNext.variations`.
- **Replace Main Line** → `commitPendingMoveReplaceLine()`: truncates the line at `nextIndex` and replaces.
- **Cancel** → `setPendingMove(null)`.

`ChessBoardWrapper` subscribes to `pendingMove`; when it becomes non-null, `isUserMoveRef` is cleared and `resetBoard(currentFen)` snaps the board back. When a commit action fires and changes `currentFen`, the board advances normally via the existing `useEffect`.

### Promote Variation (FEATURE-3)
Long-pressing (2s) the first token of any variation line in the notation calls `setPendingPromotion({ path, ... })` in uiSlice. `PromoteVariationModal` (in `board.tsx`) shows and on "Promote" calls `promoteVariation(path)` in gameSlice:
1. Derives `forkPath` (path to the parent fork node) from the variation path.
2. Swaps: `promotedVariation` replaces `parentLine.slice(forkIndex + 1)` in the tree; the old continuation becomes `forkNode.variations[0]` (skipped if empty).
3. Navigates to the first promoted node at `[...forkPath.slice(0, -1), { ...forkLastSeg, index: forkIndex + 1 }]`.

The `onPromote` callback is threaded through `renderLine` and `VariationBlock` via an optional `(path, node) => void` parameter. Only tokens with `isVariationStart={true}` have the long-press handler wired.

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
