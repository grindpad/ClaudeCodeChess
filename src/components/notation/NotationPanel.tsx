import React, { useCallback, useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useChessStore } from '../../store';
import { renderLine } from './VariationBlock';

export default function NotationPanel() {
  const moveTree = useChessStore((s) => s.moveTree);
  const currentNode = useChessStore((s) => s.currentNode);
  const metadata = useChessStore((s) => s.metadata);

  const scrollViewRef = useRef<ScrollView>(null);
  // Map of nodeId → native View ref for measureLayout-based auto-scroll.
  // Using a plain object rather than a Map so refs survive re-renders without
  // triggering unnecessary effects.
  const nodeViewRefs = useRef<Record<string, View | null>>({});

  const handleRegisterRef = useCallback((nodeId: string, ref: View | null) => {
    if (ref) {
      nodeViewRefs.current[nodeId] = ref;
    } else {
      delete nodeViewRefs.current[nodeId];
    }
  }, []);

  // BUG-C FIX: auto-scroll to active node using measureLayout relative to the
  // ScrollView so the position is correct for moves in nested variations.
  useEffect(() => {
    if (!currentNode) return;
    const viewRef = nodeViewRefs.current[currentNode.id];
    if (!viewRef || !scrollViewRef.current) return;

    // Small delay to let layout settle after navigation
    const timer = setTimeout(() => {
      try {
        (viewRef as any).measureLayout(
          scrollViewRef.current as any,
          (_x: number, y: number, _w: number, h: number) => {
            // Centre the active move vertically in the panel
            scrollViewRef.current?.scrollTo({
              y: Math.max(0, y - 80),
              animated: true,
            });
          },
          () => {
            // measureLayout failed (e.g., node unmounted) — no-op
          }
        );
      } catch {
        // ignore measurement errors
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [currentNode?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!moveTree || moveTree.mainLine.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No moves yet</Text>
        <Text style={styles.emptyHint}>
          {metadata ? 'Use ◀ ▶ to navigate' : 'Import a PGN or play moves on the board'}
        </Text>
      </View>
    );
  }

  const activeNodeId = currentNode?.id ?? null;
  const tokens = renderLine(moveTree.mainLine, [], undefined, 0, activeNodeId, handleRegisterRef);

  // Show result tag at the end if available
  const result = metadata?.result;

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.scrollView}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator
    >
      <View style={styles.movesContainer}>
        {tokens}
        {result && result !== '*' && (
          <Text style={styles.result}>{result}</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#1C1C1C',
  },
  content: {
    padding: 8,
    paddingBottom: 24,
  },
  movesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#1C1C1C',
  },
  emptyText: {
    color: '#555',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptyHint: {
    color: '#444',
    fontSize: 13,
    textAlign: 'center',
  },
  result: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 4,
    alignSelf: 'center',
  },
});
