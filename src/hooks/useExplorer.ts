/**
 * useExplorer — subscribes to currentFen and triggers a debounced Lichess
 * Explorer fetch whenever the position changes.
 *
 * Mount this alongside useEngine in the root layout.
 * Uses subscribeWithSelector so FEN changes don't re-render the layout.
 */

import { useEffect, useRef } from 'react';
import { useChessStore } from '../store';
import { explorerCache } from '../api/explorerCache';

const DEBOUNCE_MS = 300;

export function useExplorer(): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = useChessStore.subscribe(
      (state) => state.currentFen,
      (fen) => {
        const { explorerEnabled, fetchExplorer } = useChessStore.getState();
        if (!explorerEnabled) return;

        // Cancel any pending fetch
        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
          fetchExplorer(fen);
        }, DEBOUNCE_MS);
      }
    );

    // Also subscribe to explorerEnabled toggle — fetch immediately when turned on
    const unsubscribeEnabled = useChessStore.subscribe(
      (state) => state.explorerEnabled,
      (enabled) => {
        if (!enabled) return;
        const { currentFen, fetchExplorer } = useChessStore.getState();
        fetchExplorer(currentFen);
      }
    );

    // Re-fetch when token changes (clear cache so old unauthed responses don't persist)
    const unsubscribeToken = useChessStore.subscribe(
      (state) => state.lichessToken,
      () => {
        explorerCache.clear();
        const { explorerEnabled, currentFen, fetchExplorer } = useChessStore.getState();
        if (!explorerEnabled) return;
        fetchExplorer(currentFen);
      }
    );

    // BUG-005 FIX: Trigger initial fetch for the current position on mount,
    // since subscriptions only fire on *changes* and the starting FEN never changes.
    const { explorerEnabled, currentFen, fetchExplorer } = useChessStore.getState();
    if (explorerEnabled) {
      fetchExplorer(currentFen);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      unsubscribe();
      unsubscribeEnabled();
      unsubscribeToken();
    };
  }, []);
}
