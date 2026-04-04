/**
 * One row in the opening explorer:
 *
 *   [SAN]  [freq bar]  [W% / D% / B%]  [N games]  [avg ♟]
 *
 * Tapping the row plays the move on the board.
 */

import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { LichessExplorerMove } from '../../api/lichessExplorer';
import WinRateBar from '../shared/WinRateBar';
import { useChessStore } from '../../store';

interface ExplorerMoveRowProps {
  move: LichessExplorerMove;
  totalGames: number;
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

export default function ExplorerMoveRow({ move, totalGames }: ExplorerMoveRowProps) {
  const makeMove = useChessStore((s) => s.makeMove);

  const handlePress = useCallback(() => {
    makeMove(move.uci);
  }, [makeMove, move.uci]);

  const moveTotalGames = move.white + move.draws + move.black;
  const freqPct = totalGames > 0 ? moveTotalGames / totalGames : 0;

  const wPct = moveTotalGames > 0 ? Math.round((move.white / moveTotalGames) * 100) : 0;
  const dPct = moveTotalGames > 0 ? Math.round((move.draws / moveTotalGames) * 100) : 0;
  const bPct = moveTotalGames > 0 ? Math.round((move.black / moveTotalGames) * 100) : 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Play ${move.san}, ${moveTotalGames} games`}
    >
      {/* Move SAN */}
      <Text style={styles.san}>{move.san}</Text>

      {/* Frequency bar */}
      <View style={styles.freqBarWrapper}>
        <View style={[styles.freqBar, { flex: freqPct }]} />
        <View style={{ flex: 1 - freqPct }} />
      </View>

      {/* Win rate bar */}
      <View style={styles.winRateWrapper}>
        <WinRateBar white={move.white} draws={move.draws} black={move.black} height={10} />
      </View>

      {/* W / D / B percentages */}
      <Text style={styles.pcts}>
        <Text style={styles.wPct}>{wPct}</Text>
        <Text style={styles.sep}> / </Text>
        <Text style={styles.dPct}>{dPct}</Text>
        <Text style={styles.sep}> / </Text>
        <Text style={styles.bPct}>{bPct}</Text>
      </Text>

      {/* Game count */}
      <Text style={styles.count}>{formatCount(moveTotalGames)}</Text>

      {/* Avg rating */}
      {move.averageRating > 0 && (
        <Text style={styles.rating}>{move.averageRating}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 10,
    gap: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2d2d4e',
  },
  rowPressed: {
    backgroundColor: '#1e1e3a',
  },
  san: {
    color: '#e0e0ff',
    fontSize: 14,
    fontWeight: '600',
    width: 42,
  },
  freqBarWrapper: {
    flexDirection: 'row',
    height: 10,
    width: 50,
    backgroundColor: '#1a1a2e',
    borderRadius: 3,
    overflow: 'hidden',
  },
  freqBar: {
    backgroundColor: '#5c6bc0',
    borderRadius: 3,
  },
  winRateWrapper: {
    flex: 1,
    minWidth: 60,
  },
  pcts: {
    fontSize: 11,
    width: 60,
    textAlign: 'right',
  },
  wPct: { color: '#c8c8b0' },
  dPct: { color: '#7a8a96' },
  bPct: { color: '#90a090' },
  sep: { color: '#444' },
  count: {
    color: '#666',
    fontSize: 11,
    width: 28,
    textAlign: 'right',
  },
  rating: {
    color: '#555',
    fontSize: 10,
    width: 32,
    textAlign: 'right',
  },
});
