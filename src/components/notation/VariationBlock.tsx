import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MoveNode, NavigationPath } from '../../types/moveTree';
import MoveToken from './MoveToken';
import CommentBlock from './CommentBlock';

interface VariationBlockProps {
  nodes: MoveNode[];
  /** NavigationPath to the fork node (the node whose .variations[variationIndex] this is) */
  forkPath: NavigationPath;
  variationIndex: number;
  depth: number;
  activeNodeId: string | null;
  onMeasure: (nodeId: string, y: number) => void;
}

export default function VariationBlock({
  nodes,
  forkPath,
  variationIndex,
  depth,
  activeNodeId,
  onMeasure,
}: VariationBlockProps) {
  // Variations at depth ≥ 2 are collapsible; shallower ones are always visible
  const collapsible = depth >= 2;
  const [collapsed, setCollapsed] = useState(collapsible);

  if (nodes.length === 0) return null;

  const firstNode = nodes[0];
  const summary = firstNode
    ? `${firstNode.moveNumber}${firstNode.color === 'w' ? '.' : '...'} ${firstNode.san}`
    : '';

  if (collapsible && collapsed) {
    return (
      <View style={[styles.wrapper, styles.wrapperIndented]}>
        <Pressable
          style={styles.collapseToggle}
          onPress={() => setCollapsed(false)}
          accessibilityRole="button"
          accessibilityLabel={`Expand variation: ${summary}`}
        >
          <Text style={styles.toggleText}>▸ ({summary}…)</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, depth > 0 && styles.wrapperIndented]}>
      {collapsible && (
        <Pressable
          style={styles.collapseToggle}
          onPress={() => setCollapsed(true)}
          accessibilityRole="button"
          accessibilityLabel="Collapse variation"
        >
          <Text style={styles.toggleText}>▾ </Text>
        </Pressable>
      )}

      <Text style={styles.paren}>(</Text>
      <View style={styles.line}>
        {renderLine(nodes, forkPath, variationIndex, depth, activeNodeId, onMeasure)}
      </View>
      <Text style={styles.paren}>)</Text>
    </View>
  );
}

/**
 * Renders an array of MoveNodes into a flat sequence of tokens, comments, and sub-variations.
 * Exported so that NotationPanel can use it for the main line too.
 *
 * @param nodes          The moves to render
 * @param forkPath       NavigationPath to the node BEFORE this line
 *                       ([] for main line, [{ index: i }] for a variation of mainLine[i], etc.)
 * @param variationIndex undefined = main line; number = which variation of the fork node
 * @param depth          0 = main line, 1 = first variation, 2+ = nested (collapsible)
 * @param activeNodeId   Currently selected node's ID (for highlighting)
 * @param onMeasure      Callback to record each token's y-position for auto-scroll
 */
export function renderLine(
  nodes: MoveNode[],
  forkPath: NavigationPath,
  variationIndex: number | undefined,
  depth: number,
  activeNodeId: string | null,
  onMeasure: (nodeId: string, y: number) => void
): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  // Track whether the previous sibling had a variation block (which breaks the flow).
  // If so, the next Black token needs "N..." prefix.
  let needsEllipsisAfterBreak = false;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    // Path to this node in the full tree
    const nodePath: NavigationPath =
      variationIndex !== undefined
        ? [...forkPath, { variationIndex, index: i }]
        : [{ index: i }];

    // Show move number prefix:
    // - White: always show "N."
    // - Black at start of a variation line: show "N..."
    // - Black immediately after a variation block broke the flow: show "N..."
    // - Black otherwise: no prefix (White's number precedes it)
    const isFirstInLine = i === 0;
    const showMoveNumberPrefix =
      node.color === 'w' ||
      (node.color === 'b' && (isFirstInLine || needsEllipsisAfterBreak));

    if (node.preComment) {
      elements.push(
        <CommentBlock key={`pre-${node.id}`} text={node.preComment} />
      );
    }

    elements.push(
      <MoveToken
        key={node.id}
        node={node}
        path={nodePath}
        isActive={activeNodeId === node.id}
        showMoveNumberPrefix={showMoveNumberPrefix}
        onMeasure={onMeasure}
      />
    );

    if (node.comment) {
      elements.push(
        <CommentBlock key={`post-${node.id}`} text={node.comment} />
      );
      // Comment takes full width → next Black token needs ellipsis
      needsEllipsisAfterBreak = true;
    } else {
      needsEllipsisAfterBreak = false;
    }

    // Sub-variations — each takes full width, breaking the inline flow
    if (node.variations.length > 0) {
      // Force a line break before the first variation block
      elements.push(<View key={`brk-pre-${node.id}`} style={styles.lineBreak} />);

      for (let vi = 0; vi < node.variations.length; vi++) {
        elements.push(
          <VariationBlock
            key={`var-${node.id}-${vi}`}
            nodes={node.variations[vi]}
            forkPath={nodePath}
            variationIndex={vi}
            depth={depth + 1}
            activeNodeId={activeNodeId}
            onMeasure={onMeasure}
          />
        );
      }

      // After variations, the next move in the main flow needs "N..." if it's Black
      elements.push(<View key={`brk-post-${node.id}`} style={styles.lineBreak} />);
      needsEllipsisAfterBreak = true;
    }
  }

  return elements;
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    marginVertical: 2,
    // Full-width forces a line break in the parent's wrapping flex container
    flexBasis: '100%',
  },
  wrapperIndented: {
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#2d2d4e',
    marginLeft: 4,
  },
  line: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    flex: 1,
  },
  paren: {
    color: '#666',
    fontSize: 14,
    paddingHorizontal: 2,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  collapseToggle: {
    paddingHorizontal: 4,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  toggleText: {
    color: '#7986cb',
    fontSize: 13,
  },
  // Zero-height full-width trick to force a line break in a wrapping flex container
  lineBreak: {
    flexBasis: '100%',
    height: 0,
  },
});
