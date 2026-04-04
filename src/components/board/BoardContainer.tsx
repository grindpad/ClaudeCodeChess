/**
 * Orchestrates the board + navigation controls + notation panel.
 * Portrait: board on top, notation panel below.
 * Landscape: board+controls on the left column, notation panel on the right.
 */

import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import ChessBoardWrapper from './ChessBoardWrapper';
import NavigationControls from './NavigationControls';
import NotationPanel from '../notation/NotationPanel';

export default function BoardContainer() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  // Board sizing: always a square, snapped to multiple of 8
  const boardSize = isLandscape
    ? Math.min(height - 80, width * 0.5)
    : Math.min(width, height * 0.52);

  const snappedSize = Math.floor(boardSize / 8) * 8;

  if (isLandscape) {
    return (
      <View style={styles.landscapeRow}>
        {/* Left column: board + nav controls */}
        <View style={styles.boardColumn}>
          <ChessBoardWrapper size={snappedSize} />
          <NavigationControls />
        </View>

        {/* Right column: notation panel */}
        <View style={styles.notationColumn}>
          <NotationPanel />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.portraitColumn}>
      <ChessBoardWrapper size={snappedSize} />
      <NavigationControls />
      <View style={styles.notationArea}>
        <NotationPanel />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  portraitColumn: {
    flex: 1,
    alignItems: 'center',
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
  notationColumn: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: '#2d2d4e',
  },
});
