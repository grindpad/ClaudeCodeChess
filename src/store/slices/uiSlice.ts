import type { StateCreator } from 'zustand';
import type { ChessStore } from '../chessStore';
import type { ImportableGame } from '../../pgn/pgnParser';

export type BoardTheme = 'classic' | 'blue' | 'walnut';

export interface BoardThemeColors {
  white: string;
  black: string;
  lastMoveHighlight: string;
}

export const BOARD_THEMES: Record<BoardTheme, BoardThemeColors> = {
  classic: {
    white: '#eeeed2',
    black: '#769656',
    lastMoveHighlight: 'rgba(255, 255, 0, 0.4)',
  },
  blue: {
    white: '#dee3e6',
    black: '#8ca2ad',
    lastMoveHighlight: 'rgba(100, 180, 255, 0.5)',
  },
  walnut: {
    white: '#f0d9b5',
    black: '#b58863',
    lastMoveHighlight: 'rgba(255, 200, 80, 0.5)',
  },
};

export interface UiSlice {
  // ── State ──────────────────────────────────────────────────────────────────
  notationPanelVisible: boolean;
  explorerPanelVisible: boolean;
  pgnImportModalVisible: boolean;
  settingsModalVisible: boolean;
  saveGameModalVisible: boolean;
  boardFlipped: boolean;
  lastMoveSquares: [string, string] | null;
  selectedSquare: string | null;
  boardTheme: BoardTheme;
  showCoordinates: boolean;
  lichessToken: string;
  sidebarOpen: boolean;
  /** Non-null when a multi-game PGN was imported and the user must pick one */
  pendingImportGames: ImportableGame[] | null;
  /** ID of the LibraryEntry currently loaded on the board */
  activeLibraryEntryId: string | null;
  /** ID of the StoredGameRecord currently loaded on the board */
  activeGameId: string | null;
  /** True when moves have been made since the last library save */
  hasUnsavedChanges: boolean;

  // ── Actions ────────────────────────────────────────────────────────────────
  toggleNotationPanel: () => void;
  toggleExplorerPanel: () => void;
  openPgnImport: () => void;
  closePgnImport: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  openSaveGameModal: () => void;
  closeSaveGameModal: () => void;
  flipBoard: () => void;
  setLastMove: (squares: [string, string] | null) => void;
  setSelectedSquare: (sq: string | null) => void;
  setBoardTheme: (theme: BoardTheme) => void;
  toggleCoordinates: () => void;
  setLichessToken: (token: string) => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  setPendingImportGames: (games: ImportableGame[] | null) => void;
  setActiveLibraryGame: (entryId: string | null, gameId: string | null) => void;
  setHasUnsavedChanges: (value: boolean) => void;
}

export const createUiSlice: StateCreator<ChessStore, [['zustand/subscribeWithSelector', never]], [], UiSlice> =
  (set) => ({
    notationPanelVisible: true,
    explorerPanelVisible: true,
    pgnImportModalVisible: false,
    settingsModalVisible: false,
    saveGameModalVisible: false,
    boardFlipped: false,
    lastMoveSquares: null,
    selectedSquare: null,
    boardTheme: 'classic',
    showCoordinates: true,
    lichessToken: (typeof window !== 'undefined' ? window.localStorage?.getItem('lichessToken') ?? '' : ''),
    sidebarOpen: false,
    pendingImportGames: null,
    activeLibraryEntryId: null,
    activeGameId: null,
    hasUnsavedChanges: false,

    toggleNotationPanel() { set((s) => ({ notationPanelVisible: !s.notationPanelVisible })); },
    toggleExplorerPanel() { set((s) => ({ explorerPanelVisible: !s.explorerPanelVisible })); },
    openPgnImport() { set({ pgnImportModalVisible: true }); },
    closePgnImport() { set({ pgnImportModalVisible: false }); },
    openSettings() { set({ settingsModalVisible: true }); },
    closeSettings() { set({ settingsModalVisible: false }); },
    openSaveGameModal() { set({ saveGameModalVisible: true }); },
    closeSaveGameModal() { set({ saveGameModalVisible: false }); },
    flipBoard() { set((s) => ({ boardFlipped: !s.boardFlipped })); },
    setLastMove(squares) { set({ lastMoveSquares: squares }); },
    setSelectedSquare(sq) { set({ selectedSquare: sq }); },
    setBoardTheme(theme) { set({ boardTheme: theme }); },
    toggleCoordinates() { set((s) => ({ showCoordinates: !s.showCoordinates })); },
    setLichessToken(token) {
      set({ lichessToken: token });
      if (typeof window !== 'undefined') window.localStorage?.setItem('lichessToken', token);
    },
    openSidebar() { set({ sidebarOpen: true }); },
    closeSidebar() { set({ sidebarOpen: false }); },
    setPendingImportGames(games) { set({ pendingImportGames: games }); },
    setActiveLibraryGame(entryId, gameId) {
      set({ activeLibraryEntryId: entryId, activeGameId: gameId, hasUnsavedChanges: false });
    },
    setHasUnsavedChanges(value) { set({ hasUnsavedChanges: value }); },
  });
