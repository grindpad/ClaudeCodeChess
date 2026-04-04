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

  // ── Public actions ─────────────────────────────────────────────────────────
  startAnalysis: () => void;
  stopAnalysis: () => void;
  setTargetDepth: (depth: number) => void;
  setMultiPv: (n: number) => void;

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
      set({ multiPvCount: n });
    },

    _receiveEngineOutput(output) {
      const prev = get().engineOutput;
      set({
        engineOutput: {
          depth: output.depth ?? prev?.depth ?? 0,
          seldepth: output.seldepth ?? prev?.seldepth ?? 0,
          nodes: output.nodes ?? prev?.nodes ?? 0,
          nps: output.nps ?? prev?.nps ?? 0,
          time: output.time ?? prev?.time ?? 0,
          score: output.score !== undefined ? output.score : (prev?.score ?? null),
          pv: output.pv !== undefined ? output.pv : (prev?.pv ?? null),
          multipv: output.multipv ?? prev?.multipv ?? [],
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
