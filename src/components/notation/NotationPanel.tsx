import React, { useCallback, useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useChessStore } from '../../store';
import { renderLine } from './VariationBlock';

export default function NotationPanel() {
  const moveTree = useChessStore((s) => s.moveTree);
  const currentNode = useChessStore((s) => s.currentNode);
  const metadata = useChessStore((s) => s.metadata);

  const scrollViewRef = useRef<ScrollView>(null);
  // Map of nodeId → y-position relative to the ScrollView content
  const yPositions = useRef<Map<string, number>>(new Map());

  const handleMeasure = useCallback((nodeId: string, y: number) => {
    yPositions.current.set(nodeId, y);
  }, []);

  // Auto-scroll to the active node whenever it changes
  useEffect(() => {
    if (!currentNode) return;
    const y = yPositions.current.get(currentNode.id);
    if (y !== undefined) {
      scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 48), animated: true });
    }
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
  const tokens = renderLine(moveTree.mainLine, [], undefined, 0, activeNodeId, handleMeasure);

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
    backgroundColor: '#12122a',
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
    backgroundColor: '#12122a',
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
