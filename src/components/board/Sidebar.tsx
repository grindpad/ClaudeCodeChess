/**
 * Sidebar — C1 + C2: slide-in navigation menu.
 *
 * C1: Open with swipe from left edge (first 20px → drag right ≥60px).
 *     Close by tapping the overlay or any menu item.
 * C2: Contents — New Game, Save Game, Import Game, All Games, Engine, Settings, Flip Board.
 */

import React, { useEffect, useRef } from 'react';
import {
  Alert,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useChessStore } from '../../store';
import type { PgnMetadata } from '../../types/pgn';

/** Exports a PGN string using Web Share API (with .pgn File) or a download link fallback. */
export async function exportPgn(pgn: string, metadata: PgnMetadata | null): Promise<void> {
  const white = (metadata?.white ?? 'game').replace(/[^\w._-]/g, '_');
  const black = (metadata?.black ?? 'opponent').replace(/[^\w._-]/g, '_');
  const date = (metadata?.date ?? '').replace(/[^\w._-]/g, '_') || 'unknown';
  const filename = `${white}-vs-${black}-${date}.pgn`;

  if (Platform.OS === 'web') {
    const file = new File([pgn], filename, { type: 'application/x-chess-pgn' });
    if ((navigator as any).canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: filename });
      return;
    }
    // Fallback: blob download
    const url = URL.createObjectURL(new Blob([pgn], { type: 'application/x-chess-pgn' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } else {
    const { Share } = await import('react-native');
    await Share.share({ message: pgn, title: filename });
  }
}

const SIDEBAR_WIDTH = 260;

export default function Sidebar({ children }: { children: React.ReactNode }) {
  const sidebarOpen = useChessStore((s) => s.sidebarOpen);
  const openSidebar = useChessStore((s) => s.openSidebar);
  const closeSidebar = useChessStore((s) => s.closeSidebar);

  const slideX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Touch tracking for edge swipe detection
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const swipeTriggered = useRef(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideX, {
        toValue: sidebarOpen ? 0 : -SIDEBAR_WIDTH,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: sidebarOpen ? 0.55 : 0,
        duration: 240,
        useNativeDriver: true,
      }),
    ]).start();
  }, [sidebarOpen]);

  const handleTouchStart = (e: any) => {
    touchStartX.current = e.nativeEvent.pageX;
    touchStartY.current = e.nativeEvent.pageY;
    swipeTriggered.current = false;
  };

  const handleTouchMove = (e: any) => {
    if (swipeTriggered.current || sidebarOpen) return;
    const dx = e.nativeEvent.pageX - touchStartX.current;
    const dy = Math.abs(e.nativeEvent.pageY - touchStartY.current);
    // Only open if started in left 20px, moved right ≥60px, and mostly horizontal
    if (touchStartX.current <= 20 && dx >= 60 && dy < dx * 0.8) {
      swipeTriggered.current = true;
      openSidebar();
    }
  };

  return (
    <View
      style={styles.container}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      {children}

      {/* Overlay — tap to close */}
      {sidebarOpen && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={closeSidebar}
        >
          <Animated.View
            style={[StyleSheet.absoluteFill, styles.overlay, { opacity: overlayOpacity }]}
          />
        </Pressable>
      )}

      {/* Sidebar panel */}
      <Animated.View
        style={[styles.sidebar, { transform: [{ translateX: slideX }] }]}
        // Prevent touches on the sidebar from closing it via the overlay handler
        onStartShouldSetResponder={() => true}
      >
        <SidebarContent onClose={closeSidebar} />
      </Animated.View>
    </View>
  );
}

// ── Sidebar content ───────────────────────────────────────────────────────────

function SidebarContent({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const moveTree = useChessStore((s) => s.moveTree);
  const newGame = useChessStore((s) => s.newGame);
  const openPgnImport = useChessStore((s) => s.openPgnImport);
  const openSaveGameModal = useChessStore((s) => s.openSaveGameModal);
  const hasUnsavedChanges = useChessStore((s) => s.hasUnsavedChanges);
  const isAnalysing = useChessStore((s) => s.isAnalysing);
  const startAnalysis = useChessStore((s) => s.startAnalysis);
  const stopAnalysis = useChessStore((s) => s.stopAnalysis);
  const flipBoard = useChessStore((s) => s.flipBoard);
  const engineStatus = useChessStore((s) => s.engineStatus);

  const engineUnavailable = engineStatus === 'unsupported';

  const handleNewGame = () => {
    onClose();
    if (hasUnsavedChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved moves. Start a new game anyway?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Discard & New Game', style: 'destructive', onPress: () => newGame() },
        ]
      );
    } else if (moveTree) {
      Alert.alert(
        'New Game',
        'Start a new game?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'New Game', style: 'destructive', onPress: () => newGame() },
        ]
      );
    } else {
      newGame();
    }
  };

  const handleSaveGame = () => {
    if (!moveTree) {
      Alert.alert('Nothing to save', 'No game is loaded.');
      return;
    }
    onClose();
    openSaveGameModal();
  };

  const handleImport = () => {
    onClose();
    openPgnImport();
  };

  const handleAllGames = () => {
    onClose();
    router.push('/games');
  };

  const handleEngine = () => {
    if (isAnalysing) stopAnalysis(); else startAnalysis();
    onClose();
  };

  const handleSettings = () => {
    onClose();
    router.push('/(tabs)/settings');
  };

  const handleFlip = () => {
    flipBoard();
    onClose();
  };

  return (
    <View style={styles.sidebarContent}>
      {/* Header */}
      <View style={styles.sidebarHeader}>
        <Text style={styles.sidebarTitle}>Menu</Text>
      </View>

      <SidebarItem icon="♟" label="New Game" onPress={handleNewGame} />
      <SidebarItem icon="💾" label="Save Game" onPress={handleSaveGame} disabled={!moveTree} />
      <SidebarItem icon="📥" label="Import PGN" onPress={handleImport} />
      <SidebarItem icon="📋" label="All Games" onPress={handleAllGames} />

      <View style={styles.divider} />

      <SidebarItem
        icon={isAnalysing ? '⚡' : '⚙'}
        label={isAnalysing ? 'Stop Analysis' : 'Engine Analysis'}
        onPress={handleEngine}
        disabled={engineUnavailable}
        active={isAnalysing}
      />
      <SidebarItem icon="⚙" label="Settings" onPress={handleSettings} />
      <SidebarItem icon="⇅" label="Flip Board" onPress={handleFlip} />
    </View>
  );
}

function SidebarItem({
  icon,
  label,
  onPress,
  disabled = false,
  active = false,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.sidebarItem,
        active && styles.sidebarItemActive,
        disabled && styles.sidebarItemDisabled,
        pressed && !disabled && styles.sidebarItemPressed,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.sidebarItemIcon}>{icon}</Text>
      <Text style={[styles.sidebarItemLabel, disabled && styles.sidebarItemLabelDisabled]}>
        {label}
      </Text>
    </Pressable>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  overlay: {
    backgroundColor: '#000',
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: '#1C1C1C',
    zIndex: 100,
    // Shadow on web/iOS
    ...Platform.select({
      web: {
        boxShadow: '4px 0 24px rgba(0,0,0,0.5)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 4, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 20,
      },
    }),
  },
  sidebarContent: {
    flex: 1,
    paddingTop: 48,
  },
  sidebarHeader: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2E2E2E',
    marginBottom: 8,
  },
  sidebarTitle: {
    color: '#888888',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#2E2E2E',
    marginHorizontal: 16,
    marginVertical: 8,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
    minHeight: 52,
  },
  sidebarItemActive: {
    backgroundColor: '#2A2A2A',
  },
  sidebarItemDisabled: {
    opacity: 0.35,
  },
  sidebarItemPressed: {
    backgroundColor: '#2E2E2E',
  },
  sidebarItemIcon: {
    fontSize: 18,
    width: 24,
    textAlign: 'center',
  },
  sidebarItemLabel: {
    color: '#F0F0F0',
    fontSize: 15,
    fontWeight: '500',
  },
  sidebarItemLabelDisabled: {
    color: '#555',
  },
});
