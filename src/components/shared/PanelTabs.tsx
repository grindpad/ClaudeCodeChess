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
import EnginePanel from '../engine/EnginePanel';
import ErrorBoundary from './ErrorBoundary';
import { useChessStore } from '../../store';

type Tab = 'notation' | 'explorer' | 'engine';

export default function PanelTabs() {
  const [activeTab, setActiveTab] = useState<Tab>('notation');
  const explorerData = useChessStore((s) => s.explorerData);
  const explorerLoading = useChessStore((s) => s.explorerLoading);
  const isAnalysing = useChessStore((s) => s.isAnalysing);
  const engineOutput = useChessStore((s) => s.engineOutput);

  const explorerHasData = explorerData !== null && explorerData.moves.length > 0;
  const engineHasData = engineOutput !== null && (engineOutput.multipv.length > 0 || engineOutput.pv !== null);

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
        <TabButton
          label={isAnalysing ? 'Engine ·' : 'Engine'}
          active={activeTab === 'engine'}
          onPress={() => setActiveTab('engine')}
          badge={engineHasData && activeTab !== 'engine'}
        />
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
