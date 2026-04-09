import type { StateCreator } from 'zustand';
import type { ChessStore } from '../chessStore';
import type { EngineOutput, EngineStatus } from '../../types/engine';

export interface EngineSlice {
  // ── State ──────────────────────────────────────────────────────────────────
  engineStatus: EngineStatus;
  isAnalysing: boolean;
  engineOutput: EngineOutput | null;
  targetDepth: number;
  multiPvCount: number;
  engineError: string | null;
  /** Incrementing counter — useEngine subscribes to it and restarts the controller */
  engineRestartCount: number;

  // ── Public actions ─────────────────────────────────────────────────────────
  startAnalysis: () => void;
  stopAnalysis: () => void;
  setTargetDepth: (depth: number) => void;
  setMultiPv: (n: number) => void;
  clearEngineOutput: () => void;
  /** Trigger a full engine worker restart (used by the "stuck" UI button) */
  requestEngineRestart: () => void;

  // ── Internal actions (called by EngineController bridge only) ──────────────
  _receiveEngineOutput: (output: Partial<EngineOutput>) => void;
  _setEngineStatus: (status: EngineStatus) => void;
}

export const createEngineSlice: StateCreator<ChessStore, [['zustand/subscribeWithSelector', never]], [], EngineSlice> =
  (set, get) => ({
    engineStatus: 'idle',
    isAnalysing: false,
    engineOutput: null,
    targetDepth: 20,
    multiPvCount: 1,
    engineError: null,
    engineRestartCount: 0,

    startAnalysis() {
      set({ isAnalysing: true });
    },

    stopAnalysis() {
      set({ isAnalysing: false });
    },

    setTargetDepth(depth) {
      set({ targetDepth: depth });
    },

    setMultiPv(n) {
      set({ multiPvCount: Math.max(1, Math.min(4, n)) });
    },

    clearEngineOutput() {
      set({ engineOutput: null });
    },

    requestEngineRestart() {
      set((s) => ({ engineRestartCount: s.engineRestartCount + 1, engineOutput: null }));
    },

    _receiveEngineOutput(output) {
      const prev = get().engineOutput;
      const multipvLineNum = (output as Record<string, unknown>)._multipvLine as number | undefined;

      let newMultipv: import('../../types/engine').PvLine[];
      if (output.pv && multipvLineNum !== undefined && multipvLineNum >= 1) {
        const arr = [...(prev?.multipv ?? [])];
        arr[multipvLineNum - 1] = output.pv;
        newMultipv = (arr.slice(0, get().multiPvCount) as (import('../../types/engine').PvLine | undefined)[])
          .filter((line): line is import('../../types/engine').PvLine => line !== undefined);
      } else {
        newMultipv = prev?.multipv ?? [];
      }

      set({
        engineOutput: {
          depth: output.depth ?? prev?.depth ?? 0,
          seldepth: output.seldepth ?? prev?.seldepth ?? 0,
          nodes: output.nodes ?? prev?.nodes ?? 0,
          nps: output.nps ?? prev?.nps ?? 0,
          time: output.time ?? prev?.time ?? 0,
          score: output.score !== undefined ? output.score : (prev?.score ?? null),
          pv: output.pv !== undefined ? output.pv : (prev?.pv ?? null),
          multipv: newMultipv,
          bestMove: output.bestMove !== undefined ? output.bestMove : (prev?.bestMove ?? null),
        },
      });
    },

    _setEngineStatus(status) {
      set({
        engineStatus: status,
        engineError: status === 'error' ? 'Engine error — please reload.' : null,
      });
    },
  });
