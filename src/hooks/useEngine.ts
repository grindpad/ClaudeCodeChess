/**
 * useEngine — mounts the EngineController once and bridges it to the Zustand store.
 *
 * Mount this hook exactly once, in the root layout (_layout.tsx).
 *
 * It subscribes to currentFen via subscribeWithSelector so that FEN changes do NOT
 * trigger a component re-render — only the engine reacts to them.
 */

import { useEffect, useRef } from 'react';
import { EngineController } from '../engine/EngineController';
import { useChessStore } from '../store';

export function useEngine(): void {
  const controllerRef = useRef<EngineController | null>(null);

  const receiveOutput = useChessStore((s) => s._receiveEngineOutput);
  const setStatus = useChessStore((s) => s._setEngineStatus);

  // Initialize the controller once on mount
  useEffect(() => {
    const ctrl = new EngineController(receiveOutput, setStatus);
    ctrl.initialize();
    controllerRef.current = ctrl;

    return () => {
      ctrl.destroy();
      controllerRef.current = null;
    };
    // receiveOutput and setStatus are stable store references — no need to re-initialize
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscribe to FEN changes WITHOUT triggering a re-render of this component.
  // We also read isAnalysing / targetDepth / multiPvCount at call time via getState().
  useEffect(() => {
    const unsubscribeFen = useChessStore.subscribe(
      (state) => state.currentFen,
      (fen) => {
        const { isAnalysing, targetDepth, multiPvCount, clearEngineOutput } = useChessStore.getState();
        clearEngineOutput(); // clear stale lines when position changes
        if (isAnalysing && controllerRef.current) {
          controllerRef.current.analyzePosition(fen, targetDepth, multiPvCount);
        }
      }
    );

    // Also subscribe to isAnalysing so toggling analysis starts/stops immediately
    const unsubscribeAnalysing = useChessStore.subscribe(
      (state) => state.isAnalysing,
      (isAnalysing) => {
        const { currentFen, targetDepth, multiPvCount } = useChessStore.getState();
        if (isAnalysing && controllerRef.current) {
          controllerRef.current.analyzePosition(currentFen, targetDepth, multiPvCount);
        } else {
          controllerRef.current?.stopAnalysis();
        }
      }
    );

    // Restart analysis when multiPvCount changes so Stockfish uses the new multipv value
    const unsubscribeMultiPv = useChessStore.subscribe(
      (state) => state.multiPvCount,
      (multiPvCount) => {
        const { isAnalysing, currentFen, targetDepth, clearEngineOutput } = useChessStore.getState();
        if (isAnalysing && controllerRef.current) {
          clearEngineOutput();
          controllerRef.current.analyzePosition(currentFen, targetDepth, multiPvCount);
        }
      }
    );

    // Resume analysis after auto-restart (worker crashed and re-initialized).
    // Only react to loading→ready (post-reinit), NOT analyzing→ready (normal completion).
    const unsubscribeStatus = useChessStore.subscribe(
      (state) => state.engineStatus,
      (status, prevStatus) => {
        if (status === 'ready' && prevStatus === 'loading') {
          const { isAnalysing, currentFen, targetDepth, multiPvCount } = useChessStore.getState();
          if (isAnalysing && controllerRef.current) {
            controllerRef.current.analyzePosition(currentFen, targetDepth, multiPvCount);
          }
        }
      }
    );

    return () => {
      unsubscribeFen();
      unsubscribeAnalysing();
      unsubscribeMultiPv();
      unsubscribeStatus();
    };
  }, []);
}
