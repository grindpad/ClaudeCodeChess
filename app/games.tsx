/**
 * All Games screen (C4) — scrollable list of saved games.
 *
 * Each row: White vs Black | date | source badge (played/imported)
 * Tap → load game and go back to board
 * Swipe left → delete with confirmation
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getAllGames, deleteGame, type StoredGame } from '../src/storage/gameStorage';
import { useChessStore } from '../src/store';
import { exportPgn } from '../src/components/board/Sidebar';

export default function GamesScreen() {
  const router = useRouter();
  const loadPgn = useChessStore((s) => s.loadPgn);
  const [games, setGames] = useState<StoredGame[]>(() => getAllGames());

  const handleLoad = useCallback(
    (game: StoredGame) => {
      try {
        loadPgn(game.pgn);
        router.back();
      } catch {
        Alert.alert('Error', 'Could not load this game.');
      }
    },
    [loadPgn, router]
  );

  const handleExport = useCallback(async (game: StoredGame) => {
    try {
      const meta = game.metadata ?? {};
      // Build a minimal PgnMetadata-compatible object for the filename helper
      await exportPgn(game.pgn, {
        white: meta.white ?? null,
        black: meta.black ?? null,
        date: meta.date ?? null,
        event: null, site: null, round: null, result: null,
        whiteElo: null, blackElo: null, eco: null, opening: null,
        timeControl: null, annotator: null, rawTags: {},
      });
    } catch {
      Alert.alert('Export failed', 'Could not share this game.');
    }
  }, []);

  const handleDelete = useCallback((id: string) => {
    Alert.alert('Delete game', 'Remove this game from storage?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteGame(id);
          setGames((prev) => prev.filter((g) => g.id !== id));
        },
      },
    ]);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          onPress={() => router.back()}
          accessibilityLabel="Back"
        >
          <Text style={styles.backBtnText}>{'‹ Back'}</Text>
        </Pressable>
        <Text style={styles.title}>All Games</Text>
        <View style={styles.headerRight} />
      </View>

      {/* List */}
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {games.length === 0 && (
          <Text style={styles.emptyText}>No saved games yet.{'\n'}Save a game from the board menu.</Text>
        )}
        {games.map((game) => (
          <GameRow
            key={game.id}
            game={game}
            onPress={() => handleLoad(game)}
            onDelete={() => handleDelete(game.id)}
            onExport={() => handleExport(game)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Game row with swipe-to-delete ─────────────────────────────────────────────

const DELETE_THRESHOLD = 80;

function GameRow({
  game,
  onPress,
  onDelete,
  onExport,
}: {
  game: StoredGame;
  onPress: () => void;
  onDelete: () => void;
  onExport: () => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const touchStartX = useRef(0);
  const swiping = useRef(false);

  const white = game.metadata?.white ?? '?';
  const black = game.metadata?.black ?? '?';
  const event = game.metadata?.event;
  const date = game.dateSaved
    ? new Date(game.dateSaved).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : '';

  const handleTouchStart = (e: any) => {
    touchStartX.current = e.nativeEvent.pageX;
    swiping.current = false;
  };

  const handleTouchMove = (e: any) => {
    const dx = e.nativeEvent.pageX - touchStartX.current;
    if (!swiping.current && dx < -8) swiping.current = true;
    if (swiping.current) {
      translateX.setValue(Math.min(0, dx));
    }
  };

  const handleTouchEnd = () => {
    if (!swiping.current) return;
    // @ts-ignore — _value is the current Animated value
    const currentX = (translateX as any)._value;
    if (currentX < -DELETE_THRESHOLD) {
      // Snap to reveal delete zone, then confirm
      Animated.timing(translateX, {
        toValue: -DELETE_THRESHOLD,
        duration: 100,
        useNativeDriver: true,
      }).start(() => onDelete());
    } else {
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 6,
      }).start();
    }
  };

  return (
    <View style={styles.rowWrapper}>
      {/* Delete hint behind the row */}
      <View style={styles.deleteHint}>
        <Text style={styles.deleteHintText}>Delete</Text>
      </View>

      <Animated.View
        style={[styles.rowAnimated, { transform: [{ translateX }] }]}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <Pressable
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          onPress={onPress}
        >
          <View style={styles.rowMain}>
            <Text style={styles.players} numberOfLines={1}>
              {white} <Text style={styles.vsText}>vs</Text> {black}
            </Text>
            {event ? (
              <Text style={styles.eventText} numberOfLines={1}>{event}</Text>
            ) : null}
            <Text style={styles.dateText}>{date}</Text>
          </View>
          <View style={styles.rowActions}>
            <Pressable
              style={({ pressed }) => [styles.exportBtn, pressed && styles.exportBtnPressed]}
              onPress={onExport}
              accessibilityLabel="Export PGN"
              hitSlop={8}
            >
              <Text style={styles.exportBtnText}>↑</Text>
            </Pressable>
            <View style={[styles.badge, game.source === 'imported' && styles.badgeImported]}>
              <Text style={styles.badgeText}>
                {game.source === 'imported' ? 'PGN' : 'Played'}
              </Text>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

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
    minWidth: 60,
  },
  backBtnPressed: {
    opacity: 0.6,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
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
    minWidth: 60,
  },

  list: {
    flex: 1,
  },
  listContent: {
    padding: 12,
    gap: 8,
  },

  emptyText: {
    color: '#444',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 48,
    lineHeight: 22,
  },

  // Row
  rowWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#e57373', // delete zone color
  },
  deleteHint: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DELETE_THRESHOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteHintText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  rowAnimated: {
    backgroundColor: '#1C1C1C',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowPressed: {
    backgroundColor: '#2A2A2A',
  },
  rowMain: {
    flex: 1,
    gap: 2,
  },
  players: {
    color: '#F0F0F0',
    fontSize: 15,
    fontWeight: '600',
  },
  vsText: {
    color: '#555',
    fontWeight: '400',
  },
  eventText: {
    color: '#888',
    fontSize: 12,
  },
  dateText: {
    color: '#555',
    fontSize: 12,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exportBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#2E2E2E',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
  },
  exportBtnPressed: {
    backgroundColor: '#3A3A3A',
  },
  exportBtnText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: '#2E2E2E',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeImported: {
    backgroundColor: '#2A2A2A',
  },
  badgeText: {
    color: '#888',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
