/**
 * useExplorer — subscribes to currentFen and triggers a debounced Lichess
 * Explorer fetch whenever the position changes.
 *
 * Mount this alongside useEngine in the root layout.
 * Uses subscribeWithSelector so FEN changes don't re-render the layout.
 */

import { useEffect, useRef } from 'react';
import { useChessStore } from '../store';

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

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      unsubscribe();
      unsubscribeEnabled();
    };
  }, []);
}
