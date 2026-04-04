import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { createGameSlice, type GameSlice } from './slices/gameSlice';
import { createEngineSlice, type EngineSlice } from './slices/engineSlice';
import { createExplorerSlice, type ExplorerSlice } from './slices/explorerSlice';
import { createUiSlice, type UiSlice } from './slices/uiSlice';

export type ChessStore = GameSlice & EngineSlice & ExplorerSlice & UiSlice;

export const useChessStore = create<ChessStore>()(
  subscribeWithSelector((set, get, store) => ({
    ...createGameSlice(set, get, store),
    ...createEngineSlice(set, get, store),
    ...createExplorerSlice(set, get, store),
    ...createUiSlice(set, get, store),
  }))
);
