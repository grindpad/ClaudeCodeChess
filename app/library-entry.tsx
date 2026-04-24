/**
 * LibraryEntry — drill-down for a multi-game library entry.
 *
 * Shows all StoredGameRecords in the entry. Tap to load.
 * Swipe left to delete an individual game.
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getEntry, updateEntry } from '../src/storage/gameStorage';
import type { LibraryEntry, StoredGameRecord } from '../src/storage/storageTypes';
import { useChessStore } from '../src/store';

export default function LibraryEntryScreen() {
  const router = useRouter();
  const { entryId } = useLocalSearchParams<{ entryId?: string }>();
  const loadPgn = useChessStore((s) => s.loadPgn);
  const setActiveLibraryGame = useChessStore((s) => s.setActiveLibraryGame);
  const hasUnsavedChanges = useChessStore((s) => s.hasUnsavedChanges);

  const [entry, setEntry] = useState<LibraryEntry | null>(() =>
    entryId ? getEntry(entryId) : null
  );

  const games = entry?.games ?? [];

  const handleLoad = useCallback(
    (game: StoredGameRecord) => {
      const doLoad = () => {
        try {
          loadPgn(game.pgn);
          if (entryId) setActiveLibraryGame(entryId, game.id);
          router.back();
          router.back(); // back through games screen to board
        } catch {
          Alert.alert('Error', 'Could not load this game.');
        }
      };

      if (hasUnsavedChanges) {
        Alert.alert(
          'Unsaved Changes',
          'You have unsaved moves. Load this game anyway?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Load Game', style: 'destructive', onPress: doLoad },
          ]
        );
      } else {
        doLoad();
      }
    },
    [loadPgn, setActiveLibraryGame, entryId, hasUnsavedChanges, router]
  );

  const handleDelete = useCallback(
    (game: StoredGameRecord) => {
      Alert.alert('Delete', 'Remove this game from the entry?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (!entryId || !entry) return;
            const remaining = entry.games.filter((g) => g.id !== game.id);
            updateEntry(entryId, { games: remaining });
            setEntry({ ...entry, games: remaining });
          },
        },
      ]);
    },
    [entry, entryId]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          onPress={() => router.back()}
          accessibilityLabel="Back"
        >
          <Text style={styles.backBtnText}>{'‹ Back'}</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>{entry?.title ?? 'Games'}</Text>
        <View style={styles.headerRight} />
      </View>

      <Text style={styles.subtitle}>
        {games.length} game{games.length !== 1 ? 's' : ''}
      </Text>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {games.length === 0 ? (
          <Text style={styles.emptyText}>No games remaining in this entry.</Text>
        ) : null}
        {games.map((game) => (
          <GameRow
            key={game.id}
            game={game}
            onPress={() => handleLoad(game)}
            onDelete={() => handleDelete(game)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const DELETE_THRESHOLD = 80;

function GameRow({
  game,
  onPress,
  onDelete,
}: {
  game: StoredGameRecord;
  onPress: () => void;
  onDelete: () => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const touchStartX = useRef(0);
  const swiping = useRef(false);

  const white = game.white ?? '?';
  const black = game.black ?? '?';
  const result = game.result;
  const moveLabel = game.plyCount != null ? `${Math.ceil(game.plyCount / 2)} moves` : null;

  const resultColor =
    result === '1-0'      ? '#a0c880' :
    result === '0-1'      ? '#e08080' :
    result === '1/2-1/2' ? '#8888aa' :
                           '#666';

  const handleTouchStart = (e: any) => {
    touchStartX.current = e.nativeEvent.pageX;
    swiping.current = false;
  };

  const handleTouchMove = (e: any) => {
    const dx = e.nativeEvent.pageX - touchStartX.current;
    if (!swiping.current && dx < -8) swiping.current = true;
    if (swiping.current) translateX.setValue(Math.min(0, dx));
  };

  const handleTouchEnd = () => {
    if (!swiping.current) return;
    const currentX = (translateX as any)._value;
    if (currentX < -DELETE_THRESHOLD) {
      Animated.timing(translateX, {
        toValue: -DELETE_THRESHOLD,
        duration: 100,
        useNativeDriver: true,
      }).start(() => onDelete());
    } else {
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
    }
  };

  return (
    <View style={styles.rowWrapper}>
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
          <View style={styles.rowNum}>
            <Text style={styles.numText}>{game.indexInEntry + 1}</Text>
          </View>

          <View style={styles.rowMain}>
            <View style={styles.playersRow}>
              <Text style={styles.players} numberOfLines={1}>
                {white} <Text style={styles.vsText}>vs</Text> {black}
              </Text>
              {game.hasAnnotations ? (
                <View style={styles.annotBadge}>
                  <Text style={styles.annotText}>ann</Text>
                </View>
              ) : null}
            </View>
            {game.event && game.event !== '?' ? (
              <Text style={styles.metaText} numberOfLines={1}>{game.event}</Text>
            ) : null}
            {moveLabel ? (
              <Text style={styles.moveCountText}>{moveLabel}</Text>
            ) : null}
          </View>

          {result ? (
            <View style={styles.resultBadge}>
              <Text style={[styles.resultText, { color: resultColor }]}>{result}</Text>
            </View>
          ) : null}
        </Pressable>
      </Animated.View>
    </View>
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
    minWidth: 60,
    minHeight: 44,
    justifyContent: 'center',
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
  emptyText: {
    color: '#444',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 48,
  },
  rowWrapper: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#e57373',
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
  playersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  players: {
    flex: 1,
    color: '#F0F0F0',
    fontSize: 14,
    fontWeight: '600',
  },
  vsText: {
    color: '#444',
    fontWeight: '400',
  },
  annotBadge: {
    backgroundColor: '#2A2A3A',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  annotText: {
    color: '#6688CC',
    fontSize: 10,
    fontWeight: '600',
  },
  metaText: {
    color: '#666',
    fontSize: 11,
  },
  moveCountText: {
    color: '#444',
    fontSize: 10,
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
