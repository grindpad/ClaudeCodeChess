/**
 * useEngine — mounts the EngineController once and bridges it to the Zustand store.
 *
 * Mount this hook exactly once, in the root layout (_layout.tsx).
 *
 * Subscribes to:
 *   - currentFen: re-analyzes on position change
 *   - isAnalysing: start/stop on toggle
 *   - multiPvCount: restart analysis with new line count
 *   - engineStatus: resume after auto-restart (loading → ready)
 *   - engineRestartCount: manual restart requested from UI
 */

import { useEffect, useRef } from 'react';
import { EngineController } from '../engine/EngineController';
import { useChessStore } from '../store';

export function useEngine(): void {
  const controllerRef = useRef<EngineController | null>(null);

  const receiveOutput = useChessStore((s) => s._receiveEngineOutput);
  const setStatus = useChessStore((s) => s._setEngineStatus);

  useEffect(() => {
    const ctrl = new EngineController(receiveOutput, setStatus);
    ctrl.initialize();
    controllerRef.current = ctrl;

    return () => {
      ctrl.destroy();
      controllerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const unsubscribeFen = useChessStore.subscribe(
      (state) => state.currentFen,
      (fen) => {
        const { isAnalysing, targetDepth, multiPvCount, clearEngineOutput } = useChessStore.getState();
        clearEngineOutput();
        if (isAnalysing && controllerRef.current) {
          controllerRef.current.analyzePosition(fen, targetDepth, multiPvCount);
        }
      }
    );

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

    // BUG-F FIX: 300ms debounce for MultiPV changes so rapid +/- taps collapse to one
    let multiPvDebounce: ReturnType<typeof setTimeout> | null = null;
    const unsubscribeMultiPv = useChessStore.subscribe(
      (state) => state.multiPvCount,
      (multiPvCount) => {
        if (multiPvDebounce) clearTimeout(multiPvDebounce);
        multiPvDebounce = setTimeout(() => {
          multiPvDebounce = null;
          const { isAnalysing, currentFen, targetDepth, clearEngineOutput } = useChessStore.getState();
          if (isAnalysing && controllerRef.current) {
            clearEngineOutput();
            controllerRef.current.analyzePosition(currentFen, targetDepth, multiPvCount);
          }
        }, 300);
      }
    );

    // Resume analysis after watchdog-triggered restart (loading → ready transition)
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

    // Manual restart requested from UI (engineRestartCount incremented)
    const unsubscribeRestart = useChessStore.subscribe(
      (state) => state.engineRestartCount,
      () => {
        if (!controllerRef.current) return;
        controllerRef.current.destroy();
        const ctrl = new EngineController(receiveOutput, setStatus);
        ctrl.initialize();
        controllerRef.current = ctrl;
        // Re-analyze if analysis was active
        const { isAnalysing, currentFen, targetDepth, multiPvCount } = useChessStore.getState();
        if (isAnalysing) {
          setTimeout(() => {
            controllerRef.current?.analyzePosition(currentFen, targetDepth, multiPvCount);
          }, 500);
        }
      }
    );

    return () => {
      unsubscribeFen();
      unsubscribeAnalysing();
      unsubscribeMultiPv();
      unsubscribeStatus();
      unsubscribeRestart();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
