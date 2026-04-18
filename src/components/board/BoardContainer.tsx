/**
 * BoardContainer — portrait-only layout (B4 + D1/D2/D3 + STYLE-D).
 *
 *   [12px eval bar] [344pt board + arrow overlay]   ← horizontal row
 *   [NavigationControls + panel label]
 *   [PanelTabs (swipe-only, no tab bar) — fills remaining space]
 *
 * D3: Downward swipe on the board row (dy ≥ 60, mostly vertical) → flip board.
 * STYLE-D: activePanel state lives here, passed to both NavigationControls and PanelTabs.
 */

import React, { useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import ChessBoardWrapper from './ChessBoardWrapper';
import EvaluationBar from './EvaluationBar';
import MoveArrows from './MoveArrows';
import NavigationControls from './NavigationControls';
import PanelTabs, { type PanelTab } from '../shared/PanelTabs';
import { useChessStore } from '../../store';

const EVAL_BAR_WIDTH = 12;
const BAR_BOARD_GAP = 4;
const H_PADDING = 8;

export default function BoardContainer() {
  const { width } = useWindowDimensions();
  const boardFlipped = useChessStore((s) => s.boardFlipped);
  const flipBoard = useChessStore((s) => s.flipBoard);
  const lastMoveSquares = useChessStore((s) => s.lastMoveSquares);
  const engineOutput = useChessStore((s) => s.engineOutput);

  // STYLE-D: active panel state lifted here
  const [activePanel, setActivePanel] = useState<PanelTab>('notation');

  const boardSize = Math.floor((width - EVAL_BAR_WIDTH - BAR_BOARD_GAP - H_PADDING) / 8) * 8;

  const bestMoveUci = engineOutput?.bestMove ?? null;
  const engineArrow: [string, string] | null =
    bestMoveUci && bestMoveUci.length >= 4
      ? [bestMoveUci.slice(0, 2), bestMoveUci.slice(2, 4)]
      : null;

  // D3: downward-swipe detection for board flip
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const swipeHandled = useRef(false);

  const handleBoardTouchStart = (e: any) => {
    touchStartX.current = e.nativeEvent.pageX;
    touchStartY.current = e.nativeEvent.pageY;
    swipeHandled.current = false;
  };

  const handleBoardTouchMove = (e: any) => {
    if (swipeHandled.current) return;
    const dy = e.nativeEvent.pageY - touchStartY.current;
    const dx = Math.abs(e.nativeEvent.pageX - touchStartX.current);
    if (dy >= 60 && dy > dx * 1.5) {
      swipeHandled.current = true;
      flipBoard();
    }
  };

  return (
    <View style={styles.container}>
      {/* Board row — eval bar + board with arrow overlay */}
      <View
        style={styles.boardRow}
        onTouchStart={handleBoardTouchStart}
        onTouchMove={handleBoardTouchMove}
      >
        <EvaluationBar orientation="vertical" size={boardSize} thickness={EVAL_BAR_WIDTH} />
        <View style={[styles.boardArea, { width: boardSize, height: boardSize }]}>
          <ChessBoardWrapper size={boardSize} />
          <MoveArrows
            boardSize={boardSize}
            lastMove={lastMoveSquares}
            engineMove={engineArrow}
            boardFlipped={boardFlipped}
          />
        </View>
      </View>

      {/* Navigation + active panel label */}
      <NavigationControls activePanel={activePanel} onPanelChange={setActivePanel} />

      {/* Swipeable panels (no tab bar) */}
      <View style={styles.panelArea}>
        <PanelTabs activeTab={activePanel} onTabChange={setActivePanel} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  boardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: H_PADDING / 2,
    gap: BAR_BOARD_GAP,
    paddingTop: 4,
  },
  boardArea: {
    position: 'relative',
  },
  panelArea: {
    flex: 1,
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#2E2E2E',
  },
});
