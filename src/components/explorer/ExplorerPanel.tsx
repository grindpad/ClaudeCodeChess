import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useChessStore } from '../../store';
import ExplorerMoveRow from './ExplorerMoveRow';
import ExplorerEmpty from './ExplorerEmpty';

export default function ExplorerPanel() {
  const explorerData = useChessStore((s) => s.explorerData);
  const explorerLoading = useChessStore((s) => s.explorerLoading);
  const explorerError = useChessStore((s) => s.explorerError);

  const hasData = explorerData !== null && explorerData.moves.length > 0;

  // Show empty/loading state when we have no moves to display
  if (!hasData) {
    return (
      <View style={styles.container}>
        <ExplorerEmpty loading={explorerLoading} error={explorerError} />
      </View>
    );
  }

  const data = explorerData!;
  const totalGames = data.white + data.draws + data.black;

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator
    >
      {/* Header: opening name + total games */}
      <View style={styles.header}>
        {data.opening && (
          <Text style={styles.openingName} numberOfLines={1}>
            {data.opening.eco} · {data.opening.name}
          </Text>
        )}
        <Text style={styles.totalGames}>
          {totalGames.toLocaleString()} games
          {explorerLoading && '  ·  updating…'}
        </Text>
      </View>

      {/* Column headers */}
      <View style={styles.colHeaders}>
        <Text style={[styles.colLabel, { width: 42 }]}>Move</Text>
        <Text style={[styles.colLabel, { width: 50 }]}>Freq</Text>
        <Text style={[styles.colLabel, { flex: 1 }]}>Win rate</Text>
        <Text style={[styles.colLabel, { width: 60, textAlign: 'right' }]}>W/D/B %</Text>
        <Text style={[styles.colLabel, { width: 28, textAlign: 'right' }]}>N</Text>
        <Text style={[styles.colLabel, { width: 32, textAlign: 'right' }]}>Elo</Text>
      </View>

      {/* Move rows */}
      {data.moves.map((move) => (
        <ExplorerMoveRow key={move.uci} move={move} totalGames={totalGames} />
      ))}

      {/* No moves in DB for this position */}
      {data.moves.length === 0 && (
        <ExplorerEmpty loading={false} error={null} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#12122a',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#12122a',
  },
  content: {
    paddingBottom: 24,
  },
  header: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d4e',
  },
  openingName: {
    color: '#a8b4ff',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  totalGames: {
    color: '#666',
    fontSize: 11,
  },
  colHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2d2d4e',
  },
  colLabel: {
    color: '#444',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
