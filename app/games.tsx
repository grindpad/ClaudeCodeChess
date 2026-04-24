/**
 * All Games — library browser.
 *
 * Shows all LibraryEntry items sorted by dateModified (newest first).
 * Single-game entries: tap to load directly.
 * Multi-game entries: tap to open library-entry drill-down.
 * Swipe left to delete. Export action per entry.
 * Footer shows storage stats.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { getAllEntries, deleteEntry, getStorageStats } from '../src/storage/gameStorage';
import type { LibraryEntry } from '../src/storage/storageTypes';
import { useChessStore } from '../src/store';
import { exportPgn } from '../src/components/board/Sidebar';

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function GamesScreen() {
  const router = useRouter();
  const loadPgn = useChessStore((s) => s.loadPgn);
  const setActiveLibraryGame = useChessStore((s) => s.setActiveLibraryGame);
  const hasUnsavedChanges = useChessStore((s) => s.hasUnsavedChanges);

  const [entries, setEntries] = useState<LibraryEntry[]>(() => getAllEntries());
  const [stats, setStats] = useState(() => getStorageStats());

  const refresh = useCallback(() => {
    setEntries(getAllEntries());
    setStats(getStorageStats());
  }, []);

  useEffect(() => {
    refresh();
  }, []);

  const handleLoad = useCallback(
    (entry: LibraryEntry) => {
      if (entry.games.length === 0) return;

      const doLoad = () => {
        if (entry.games.length === 1) {
          try {
            loadPgn(entry.games[0].pgn);
            setActiveLibraryGame(entry.id, entry.games[0].id);
            router.back();
          } catch {
            Alert.alert('Error', 'Could not load this game.');
          }
        } else {
          router.push({ pathname: '/library-entry', params: { entryId: entry.id } });
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
    [loadPgn, setActiveLibraryGame, hasUnsavedChanges, router]
  );

  const handleExport = useCallback(async (entry: LibraryEntry) => {
    try {
      const pgn = entry.games.map((g) => g.pgn).join('\n\n');
      await exportPgn(pgn, null);
    } catch {
      Alert.alert('Export failed', 'Could not share this entry.');
    }
  }, []);

  const handleDelete = useCallback((entry: LibraryEntry) => {
    Alert.alert(
      'Delete',
      `Remove "${entry.title}" from library?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteEntry(entry.id);
            refresh();
          },
        },
      ]
    );
  }, [refresh]);

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
        <Text style={styles.title}>Library</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {entries.length === 0 ? (
          <Text style={styles.emptyText}>
            {'No saved games yet.\nSave a game from the board menu.'}
          </Text>
        ) : null}

        {entries.map((entry) => (
          <EntryRow
            key={entry.id}
            entry={entry}
            onPress={() => handleLoad(entry)}
            onDelete={() => handleDelete(entry)}
            onExport={() => handleExport(entry)}
          />
        ))}

        {entries.length > 0 ? (
          <Text style={styles.statsText}>
            {stats.entryCount} {stats.entryCount === 1 ? 'entry' : 'entries'} · {stats.gameCount} {stats.gameCount === 1 ? 'game' : 'games'} · {formatBytes(stats.estimatedBytes)}
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Entry row with swipe-to-delete ────────────────────────────────────────────

const DELETE_THRESHOLD = 80;

function EntryRow({
  entry,
  onPress,
  onDelete,
  onExport,
}: {
  entry: LibraryEntry;
  onPress: () => void;
  onDelete: () => void;
  onExport: () => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const touchStartX = useRef(0);
  const swiping = useRef(false);

  const isMulti = entry.games.length > 1;
  const topGame = entry.games[0];

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
          <View style={styles.rowMain}>
            <Text style={styles.entryTitle} numberOfLines={1}>{entry.title}</Text>
            {isMulti ? (
              <Text style={styles.gameCount}>{entry.games.length} games</Text>
            ) : topGame ? (
              <Text style={styles.gameCount} numberOfLines={1}>
                {topGame.white ?? '?'} vs {topGame.black ?? '?'}
              </Text>
            ) : null}
            <Text style={styles.dateText}>{relativeDate(entry.dateModified)}</Text>
          </View>

          <View style={styles.rowRight}>
            <Pressable
              style={({ pressed }) => [styles.exportBtn, pressed && styles.exportBtnPressed]}
              onPress={onExport}
              hitSlop={8}
            >
              <Text style={styles.exportBtnText}>↑</Text>
            </Pressable>
            <View style={[styles.badge, entry.source === 'imported' && styles.badgeImported]}>
              <Text style={styles.badgeText}>
                {entry.source === 'imported' ? 'PGN' : 'Played'}
              </Text>
            </View>
            {isMulti ? <Text style={styles.chevron}>›</Text> : null}
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

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
  list: {
    flex: 1,
  },
  listContent: {
    padding: 12,
    gap: 8,
    paddingBottom: 32,
  },
  emptyText: {
    color: '#444',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 48,
    lineHeight: 22,
  },
  statsText: {
    color: '#333',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 16,
  },
  rowWrapper: {
    borderRadius: 12,
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
  entryTitle: {
    color: '#F0F0F0',
    fontSize: 15,
    fontWeight: '600',
  },
  gameCount: {
    color: '#888',
    fontSize: 12,
  },
  dateText: {
    color: '#555',
    fontSize: 12,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exportBtn: {
    width: 36,
    height: 36,
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
  chevron: {
    color: '#555',
    fontSize: 18,
    fontWeight: '300',
    marginLeft: 2,
  },
});
