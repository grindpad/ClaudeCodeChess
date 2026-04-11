/**
 * PanelTabs — swipeable panel container.
 *
 * STYLE-D: Tab bar removed. Navigation is swipe-only. Active tab name is
 * rendered inline by the parent (BoardContainer) next to the nav buttons.
 *
 * B6: Swipe left → next panel, right → prev panel.
 * PanResponder only claims gesture when horizontal movement is dominant.
 */

import React, { useRef } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import NotationPanel from '../notation/NotationPanel';
import ExplorerPanel from '../explorer/ExplorerPanel';
import EnginePanel from '../engine/EnginePanel';
import ErrorBoundary from './ErrorBoundary';

export type PanelTab = 'notation' | 'explorer' | 'engine';
export const PANEL_TABS: PanelTab[] = ['notation', 'explorer', 'engine'];
export const PANEL_LABELS: Record<PanelTab, string> = {
  notation: 'Notation',
  explorer: 'Explorer',
  engine: 'Engine',
};

interface PanelTabsProps {
  activeTab: PanelTab;
  onTabChange: (tab: PanelTab) => void;
}

export default function PanelTabs({ activeTab, onTabChange }: PanelTabsProps) {
  const panRef = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dx) > 12,
      onPanResponderRelease: (_, { dx }) => {
        onTabChange((() => {
          const idx = PANEL_TABS.indexOf(activeTab);
          if (dx < -40 && idx < PANEL_TABS.length - 1) return PANEL_TABS[idx + 1];
          if (dx > 40 && idx > 0) return PANEL_TABS[idx - 1];
          return activeTab;
        })());
      },
    })
  ).current;

  return (
    <View style={styles.wrapper} {...panRef.panHandlers}>
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
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
});
