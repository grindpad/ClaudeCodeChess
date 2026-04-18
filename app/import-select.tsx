/**
 * ImportSelect — full-screen game selector for multi-game PGN imports.
 *
 * Shown when a PGN file containing multiple games is imported.
 * Each row shows: #, White vs Black, Event, Date, Result.
 * Tapping a row loads that game and returns to the board.
 */

import React, { useCallback } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useChessStore } from '../src/store';
import type { ImportableGame } from '../src/pgn/pgnParser';

export default function ImportSelectScreen() {
  const router = useRouter();
  const pendingImportGames = useChessStore((s) => s.pendingImportGames);
  const setPendingImportGames = useChessStore((s) => s.setPendingImportGames);
  const loadPgn = useChessStore((s) => s.loadPgn);

  const games = pendingImportGames ?? [];

  const handleSelect = useCallback(
    (game: ImportableGame) => {
      try {
        loadPgn(game.pgn);
        setPendingImportGames(null);
        router.back();
      } catch {
        Alert.alert('Error', 'Could not load this game.');
      }
    },
    [loadPgn, setPendingImportGames, router]
  );

  const handleCancel = useCallback(() => {
    setPendingImportGames(null);
    router.back();
  }, [setPendingImportGames, router]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          onPress={handleCancel}
          accessibilityLabel="Cancel"
        >
          <Text style={styles.backBtnText}>Cancel</Text>
        </Pressable>
        <Text style={styles.title}>Select Game</Text>
        <View style={styles.headerRight} />
      </View>

      <Text style={styles.subtitle}>
        {games.length} game{games.length !== 1 ? 's' : ''} found in file
      </Text>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {games.map((game) => (
          <GameRow key={game.index} game={game} onPress={() => handleSelect(game)} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function GameRow({ game, onPress }: { game: ImportableGame; onPress: () => void }) {
  const white = game.white ?? '?';
  const black = game.black ?? '?';
  const event = game.event;
  const date = game.date;
  const result = game.result;

  const resultColor =
    result === '1-0' ? '#a0c880' :
    result === '0-1' ? '#e08080' :
    result === '1/2-1/2' ? '#8888aa' :
    '#666';

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <View style={styles.rowNum}>
        <Text style={styles.numText}>{game.index + 1}</Text>
      </View>

      <View style={styles.rowMain}>
        <Text style={styles.players} numberOfLines={1}>
          {white} <Text style={styles.vsText}>vs</Text> {black}
        </Text>
        {event ? (
          <Text style={styles.metaText} numberOfLines={1}>{event}</Text>
        ) : null}
        {date ? (
          <Text style={styles.metaText} numberOfLines={1}>{date}</Text>
        ) : null}
      </View>

      {result ? (
        <View style={styles.resultBadge}>
          <Text style={[styles.resultText, { color: resultColor }]}>{result}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#111111',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2E2E2E',
  },
  backBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 70,
    minHeight: 44,
    justifyContent: 'center',
  },
  backBtnPressed: {
    opacity: 0.6,
  },
  backBtnText: {
    color: '#888',
    fontSize: 15,
    fontWeight: '500',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: '#F0F0F0',
    fontSize: 17,
    fontWeight: '700',
  },
  headerRight: {
    minWidth: 70,
  },
  subtitle: {
    color: '#555',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2E2E2E',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 12,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1C',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    minHeight: 56,
  },
  rowPressed: {
    backgroundColor: '#2A2A2A',
  },
  rowNum: {
    width: 28,
    alignItems: 'center',
  },
  numText: {
    color: '#444',
    fontSize: 13,
    fontWeight: '600',
  },
  rowMain: {
    flex: 1,
    gap: 2,
  },
  players: {
    color: '#F0F0F0',
    fontSize: 14,
    fontWeight: '600',
  },
  vsText: {
    color: '#444',
    fontWeight: '400',
  },
  metaText: {
    color: '#666',
    fontSize: 11,
  },
  resultBadge: {
    minWidth: 52,
    alignItems: 'flex-end',
  },
  resultText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
