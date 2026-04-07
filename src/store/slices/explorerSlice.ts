import type { StateCreator } from 'zustand';
import type { ChessStore } from '../chessStore';
import { fetchExplorerData, type LichessExplorerResponse } from '../../api/lichessExplorer';

export interface ExplorerSlice {
  // ── State ──────────────────────────────────────────────────────────────────
  explorerData: LichessExplorerResponse | null;
  explorerLoading: boolean;
  explorerError: string | null;
  explorerEnabled: boolean;

  // ── Actions ────────────────────────────────────────────────────────────────
  fetchExplorer: (fen: string) => Promise<void>;
  toggleExplorer: () => void;
  clearExplorer: () => void;
}

let activeController: AbortController | null = null;

export const createExplorerSlice: StateCreator<ChessStore, [['zustand/subscribeWithSelector', never]], [], ExplorerSlice> =
  (set, get) => ({
    explorerData: null,
    explorerLoading: false,
    explorerError: null,
    explorerEnabled: true,

    async fetchExplorer(fen) {
      // Cancel any in-flight request
      activeController?.abort();
      activeController = new AbortController();

      const token = get().lichessToken || undefined;
      set({ explorerLoading: true, explorerError: null });
      try {
        const data = await fetchExplorerData(fen, activeController.signal, token);
        set({ explorerData: data, explorerLoading: false });
      } catch (err: unknown) {
        // BUG-004 FIX: Reset loading state before discarding aborted request
        if (err instanceof Error && err.name === 'AbortError') {
          set({ explorerLoading: false });
          return;
        }
        const isOffline =
          err instanceof TypeError && err.message.toLowerCase().includes('network');
        set({
          explorerLoading: false,
          explorerError: isOffline ? 'offline' : 'Failed to load opening data.',
        });
      }
    },

    toggleExplorer() {
      set((state) => ({ explorerEnabled: !state.explorerEnabled }));
    },

    clearExplorer() {
      set({ explorerData: null, explorerError: null });
    },
  });
