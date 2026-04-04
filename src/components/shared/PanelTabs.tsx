/**
 * Two-tab panel area: "Notation" and "Explorer".
 * Tab state is stored in the Zustand UI slice (notationPanelVisible /
 * explorerPanelVisible) but here we manage local active tab for simplicity,
 * since only one can be active at a time.
 */

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import NotationPanel from '../notation/NotationPanel';
import ExplorerPanel from '../explorer/ExplorerPanel';
import ErrorBoundary from './ErrorBoundary';
import { useChessStore } from '../../store';

type Tab = 'notation' | 'explorer';

export default function PanelTabs() {
  const [activeTab, setActiveTab] = useState<Tab>('notation');
  const explorerData = useChessStore((s) => s.explorerData);
  const explorerLoading = useChessStore((s) => s.explorerLoading);

  // Show a subtle dot on the Explorer tab when data is available
  const explorerHasData = explorerData !== null && explorerData.moves.length > 0;

  return (
    <View style={styles.wrapper}>
      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TabButton
          label="Notation"
          active={activeTab === 'notation'}
          onPress={() => setActiveTab('notation')}
        />
        <TabButton
          label={explorerLoading ? 'Explorer ·' : 'Explorer'}
          active={activeTab === 'explorer'}
          onPress={() => setActiveTab('explorer')}
          badge={explorerHasData && activeTab !== 'explorer'}
        />
      </View>

      {/* Panel content */}
      <View style={styles.panelContent}>
        {activeTab === 'notation' ? (
          <ErrorBoundary label="Notation">
            <NotationPanel />
          </ErrorBoundary>
        ) : (
          <ErrorBoundary label="Explorer">
            <ExplorerPanel />
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
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
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
