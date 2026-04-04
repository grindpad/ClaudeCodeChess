import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useChessStore } from '../../store';
import { fenToTurn } from '../../utils/fenUtils';

export default function GameHeader() {
  const metadata = useChessStore((s) => s.metadata);
  const currentFen = useChessStore((s) => s.currentFen);
  const navigationPath = useChessStore((s) => s.navigationPath);
  const currentNode = useChessStore((s) => s.currentNode);

  const turn = fenToTurn(currentFen);
  const moveCount = navigationPath.length > 0 && currentNode
    ? `Move ${currentNode.moveNumber}${currentNode.color === 'b' ? '...' : '.'}`
    : 'Start';

  if (!metadata) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>No game loaded</Text>
        <Text style={styles.turn}>{turn === 'w' ? '⬜ White to move' : '⬛ Black to move'}</Text>
      </View>
    );
  }

  const white = metadata.white ?? '?';
  const black = metadata.black ?? '?';
  const whiteElo = metadata.whiteElo ? ` (${metadata.whiteElo})` : '';
  const blackElo = metadata.blackElo ? ` (${metadata.blackElo})` : '';

  return (
    <View style={styles.container}>
      <View style={styles.players}>
        <Text style={styles.player} numberOfLines={1}>
          ⬜ {white}{whiteElo}
        </Text>
        <Text style={styles.vs}>vs</Text>
        <Text style={styles.player} numberOfLines={1}>
          ⬛ {black}{blackElo}
        </Text>
      </View>
      <Text style={styles.meta}>
        {metadata.event ? `${metadata.event} · ` : ''}
        {metadata.date ?? ''}
        {metadata.result ? ` · ${metadata.result}` : ''}
      </Text>
      <Text style={styles.moveCount}>{moveCount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#12122a',
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d4e',
  },
  empty: {
    color: '#666',
    fontSize: 13,
    fontStyle: 'italic',
  },
  turn: {
    color: '#a8dadc',
    fontSize: 13,
    marginTop: 2,
  },
  players: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  player: {
    color: '#e0e0ff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  vs: {
    color: '#666',
    fontSize: 12,
  },
  meta: {
    color: '#888',
    fontSize: 11,
    marginTop: 2,
  },
  moveCount: {
    color: '#a8dadc',
    fontSize: 12,
    marginTop: 3,
  },
});
