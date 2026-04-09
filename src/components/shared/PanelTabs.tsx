/**
 * PanelTabs — B6: horizontally swipeable tab panels.
 *
 * Swipe left  → next tab (Notation → Explorer → Engine)
 * Swipe right → prev tab
 *
 * Uses PanResponder so the gesture only fires when horizontal movement is
 * dominant, avoiding conflicts with vertical scrolling inside each panel.
 */

import React, { useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import NotationPanel from '../notation/NotationPanel';
import ExplorerPanel from '../explorer/ExplorerPanel';
import EnginePanel from '../engine/EnginePanel';
import ErrorBoundary from './ErrorBoundary';
import { useChessStore } from '../../store';

type Tab = 'notation' | 'explorer' | 'engine';
const TABS: Tab[] = ['notation', 'explorer', 'engine'];
const TAB_LABELS: Record<Tab, string> = {
  notation: 'Notation',
  explorer: 'Explorer',
  engine: 'Engine',
};

export default function PanelTabs() {
  const [activeTab, setActiveTab] = useState<Tab>('notation');
  const explorerData = useChessStore((s) => s.explorerData);
  const explorerLoading = useChessStore((s) => s.explorerLoading);
  const isAnalysing = useChessStore((s) => s.isAnalysing);
  const engineOutput = useChessStore((s) => s.engineOutput);

  const explorerHasData = explorerData !== null && explorerData.moves.length > 0;
  const engineHasData = engineOutput !== null && (engineOutput.multipv.length > 0 || engineOutput.pv !== null);

  const panRef = useRef(
    PanResponder.create({
      // Don't claim the gesture on start — let ScrollView children respond to vertical swipes
      onStartShouldSetPanResponder: () => false,
      // Claim if clearly horizontal (dx > dy by a clear margin)
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dx) > 12,
      onPanResponderRelease: (_, { dx }) => {
        setActiveTab((current) => {
          const idx = TABS.indexOf(current);
          if (dx < -40 && idx < TABS.length - 1) return TABS[idx + 1];
          if (dx > 40 && idx > 0) return TABS[idx - 1];
          return current;
        });
      },
    })
  ).current;

  const getTabLabel = (tab: Tab): string => {
    if (tab === 'explorer' && explorerLoading) return 'Explorer ·';
    if (tab === 'engine' && isAnalysing) return 'Engine ·';
    return TAB_LABELS[tab];
  };

  return (
    <View style={styles.wrapper} {...panRef.panHandlers}>
      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TabButton
            key={tab}
            label={getTabLabel(tab)}
            active={activeTab === tab}
            onPress={() => setActiveTab(tab)}
            badge={
              (tab === 'explorer' && explorerHasData && activeTab !== tab) ||
              (tab === 'engine' && engineHasData && activeTab !== tab)
            }
          />
        ))}
      </View>

      {/* Panel content */}
      <View style={styles.panelContent}>
        {activeTab === 'notation' ? (
          <ErrorBoundary label="Notation">
            <NotationPanel />
          </ErrorBoundary>
        ) : activeTab === 'explorer' ? (
          <ErrorBoundary label="Explorer">
            <ExplorerPanel />
          </ErrorBoundary>
        ) : (
          <ErrorBoundary label="Engine">
            <EnginePanel />
          </ErrorBoundary>
        )}
      </View>
    </View>
  );
}

function TabButton({
  label,
  active,
  onPress,
  badge = false,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  badge?: boolean;
}) {
  return (
    <Pressable
      style={[styles.tab, active && styles.tabActive]}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>
        {label}
      </Text>
      {badge && <View style={styles.badge} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0d0d1e',
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d4e',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    minHeight: 44,
  },
  tabActive: {
    borderBottomColor: '#7986cb',
  },
  tabText: {
    color: '#555',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  tabTextActive: {
    color: '#a8b4ff',
  },
  badge: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#7986cb',
  },
  panelContent: {
    flex: 1,
  },
});
