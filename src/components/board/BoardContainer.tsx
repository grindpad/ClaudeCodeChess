/**
 * Orchestrates the board + navigation controls.
 * EvaluationBar is included here as a stub for Phase 5.
 */

import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import ChessBoardWrapper from './ChessBoardWrapper';
import NavigationControls from './NavigationControls';

export default function BoardContainer() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  // Board size: fill the width in portrait, fill the height in landscape
  // Leave room for navigation controls below/beside the board
  const boardSize = isLandscape
    ? Math.min(height - 80, width * 0.55)
    : Math.min(width, height * 0.55);

  const snappedSize = Math.floor(boardSize / 8) * 8; // must be divisible by 8

  if (isLandscape) {
    return (
      <View style={styles.landscapeRow}>
        <View style={styles.boardColumn}>
          <ChessBoardWrapper size={snappedSize} />
          <NavigationControls />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.portraitColumn}>
      <ChessBoardWrapper size={snappedSize} />
      <NavigationControls />
    </View>
  );
}

const styles = StyleSheet.create({
  portraitColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 8,
  },
  landscapeRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  boardColumn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
