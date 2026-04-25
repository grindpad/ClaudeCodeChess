import React, { useCallback, useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useChessStore } from '../../store';
import { renderLine } from './VariationBlock';

export default function NotationPanel() {
  const moveTree = useChessStore((s) => s.moveTree);
  const currentNode = useChessStore((s) => s.currentNode);
  const metadata = useChessStore((s) => s.metadata);

  const scrollViewRef = useRef<ScrollView>(null);
  // Ref on the first View INSIDE the ScrollView — measureLayout uses this as the
  // coordinate origin so `y` is the absolute offset within the scroll content.
  const scrollViewContentRef = useRef<View>(null);
  // Measured height of the visible ScrollView area — used to centre the active token.
  const scrollViewHeightRef = useRef(0);
  // True while the user is manually dragging the notation panel — suppresses auto-scroll.
  const userIsScrolling = useRef(false);

  // Map of nodeId → native View ref for measureLayout-based auto-scroll.
  // Using a plain object so refs survive re-renders without triggering effects.
  const nodeViewRefs = useRef<Record<string, View | null>>({});

  const handleRegisterRef = useCallback((nodeId: string, ref: View | null) => {
    if (ref) {
      nodeViewRefs.current[nodeId] = ref;
    } else {
      delete nodeViewRefs.current[nodeId];
    }
  }, []);

  // Auto-scroll to active node whenever currentNode changes.
  // measureLayout is called relative to scrollViewContentRef (the inner content View),
  // so `y` is the exact scroll offset needed to show that token.
  useEffect(() => {
    if (!currentNode) return;
    const viewRef = nodeViewRefs.current[currentNode.id];
    if (!viewRef || !scrollViewContentRef.current || !scrollViewRef.current) return;

    // 50 ms delay lets React commit the new render and lay out the newly active token
    // before we try to measure it. requestAnimationFrame alone is not reliable on iOS PWA.
    const timer = setTimeout(() => {
      if (userIsScrolling.current) return;
      try {
        (viewRef as any).measureLayout(
          scrollViewContentRef.current as any,
          (_x: number, y: number) => {
            if (userIsScrolling.current) return;
            scrollViewRef.current?.scrollTo({
              y: Math.max(0, y - scrollViewHeightRef.current / 2),
              animated: true,
            });
          },
          () => {
            // measureLayout failed (e.g. node unmounted) — silent no-op
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
  const result = metadata?.result;

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.scrollView}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator
      onLayout={(e) => {
        scrollViewHeightRef.current = e.nativeEvent.layout.height;
      }}
      onScrollBeginDrag={() => {
        userIsScrolling.current = true;
      }}
      onScrollEndDrag={() => {
        userIsScrolling.current = false;
      }}
      // On iOS momentum scrolling continues after drag ends; keep the flag set until idle.
      onMomentumScrollEnd={() => {
        userIsScrolling.current = false;
      }}
    >
      {/* scrollViewContentRef anchored here so measureLayout returns content-relative coords */}
      <View ref={scrollViewContentRef} collapsable={false}>
        <View style={styles.movesContainer}>
          {tokens}
          {result && result !== '*' && (
            <Text style={styles.result}>{result}</Text>
          )}
        </View>
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
