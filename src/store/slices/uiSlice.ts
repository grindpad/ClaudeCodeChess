import type { StateCreator } from 'zustand';
import type { ChessStore } from '../chessStore';

export interface UiSlice {
  // ── State ──────────────────────────────────────────────────────────────────
  notationPanelVisible: boolean;
  explorerPanelVisible: boolean;
  pgnImportModalVisible: boolean;
  settingsModalVisible: boolean;
  boardFlipped: boolean;
  lastMoveSquares: [string, string] | null;
  selectedSquare: string | null;

  // ── Actions ────────────────────────────────────────────────────────────────
  toggleNotationPanel: () => void;
  toggleExplorerPanel: () => void;
  openPgnImport: () => void;
  closePgnImport: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  flipBoard: () => void;
  setLastMove: (squares: [string, string] | null) => void;
  setSelectedSquare: (sq: string | null) => void;
}

export const createUiSlice: StateCreator<ChessStore, [['zustand/subscribeWithSelector', never]], [], UiSlice> =
  (set) => ({
    notationPanelVisible: true,
    explorerPanelVisible: true,
    pgnImportModalVisible: false,
    settingsModalVisible: false,
    boardFlipped: false,
    lastMoveSquares: null,
    selectedSquare: null,

    toggleNotationPanel() {
      set((s) => ({ notationPanelVisible: !s.notationPanelVisible }));
    },
    toggleExplorerPanel() {
      set((s) => ({ explorerPanelVisible: !s.explorerPanelVisible }));
    },
    openPgnImport() {
      set({ pgnImportModalVisible: true });
    },
    closePgnImport() {
      set({ pgnImportModalVisible: false });
    },
    openSettings() {
      set({ settingsModalVisible: true });
    },
    closeSettings() {
      set({ settingsModalVisible: false });
    },
    flipBoard() {
      set((s) => ({ boardFlipped: !s.boardFlipped }));
    },
    setLastMove(squares) {
      set({ lastMoveSquares: squares });
    },
    setSelectedSquare(sq) {
      set({ selectedSquare: sq });
    },
  });
