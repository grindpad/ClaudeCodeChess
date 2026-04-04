/**
 * Orchestrates the board + evaluation bar + navigation controls + notation panel.
 *
 * Portrait layout:
 *   [EvalBar (horizontal, above board)]
 *   [ChessBoard]
 *   [NavigationControls]
 *   [NotationPanel (fills remaining space)]
 *
 * Landscape layout:
 *   Left column: [EvalBar (vertical)] [ChessBoard] [NavigationControls]
 *   Right column: [NotationPanel]
 */

import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import ChessBoardWrapper from './ChessBoardWrapper';
import EvaluationBar from './EvaluationBar';
import NavigationControls from './NavigationControls';
import PanelTabs from '../shared/PanelTabs';

const EVAL_BAR_THICKNESS = 16;

export default function BoardContainer() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  // Reserve space for the eval bar beside/above the board
  const boardSize = isLandscape
    ? Math.min(height - 80, (width - EVAL_BAR_THICKNESS - 8) * 0.5)
    : Math.min(width - EVAL_BAR_THICKNESS - 8, height * 0.52);

  const snappedSize = Math.floor(boardSize / 8) * 8;

  if (isLandscape) {
    return (
      <View style={styles.landscapeRow}>
        {/* Left column: eval bar + board + nav */}
        <View style={styles.boardColumn}>
          <View style={styles.boardWithBar}>
            <EvaluationBar
              orientation="vertical"
              size={snappedSize}
              thickness={EVAL_BAR_THICKNESS}
            />
            <ChessBoardWrapper size={snappedSize} />
          </View>
          <NavigationControls />
        </View>

        {/* Right column: notation panel */}
        <View style={styles.notationColumn}>
          <PanelTabs />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.portraitColumn}>
      <View style={styles.boardWithBarHorizontal}>
        <EvaluationBar
          orientation="horizontal"
          size={snappedSize}
          thickness={EVAL_BAR_THICKNESS}
        />
        <ChessBoardWrapper size={snappedSize} />
      </View>
      <NavigationControls />
      <View style={styles.notationArea}>
        <PanelTabs />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  portraitColumn: {
    flex: 1,
    alignItems: 'center',
  },
  boardWithBarHorizontal: {
    alignItems: 'center',
    gap: 4,
  },
  notationArea: {
    flex: 1,
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#2d2d4e',
  },
  landscapeRow: {
    flex: 1,
    flexDirection: 'row',
  },
  boardColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  boardWithBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  notationColumn: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: '#2d2d4e',
  },
});
