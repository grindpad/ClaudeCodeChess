import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import type { MoveNode, NavigationPath } from '../../types/moveTree';
import { nagsToString } from '../../utils/nag';
import { useChessStore } from '../../store';

interface MoveTokenProps {
  node: MoveNode;
  path: NavigationPath;
  isActive: boolean;
  /**
   * When true, prefix with "N..." before a Black move.
   * Set to true for: first move in a variation, and any move that follows
   * a variation block (where the flow was interrupted).
   */
  showMoveNumberPrefix: boolean;
  onMeasure: (nodeId: string, y: number) => void;
}

export default function MoveToken({
  node,
  path,
  isActive,
  showMoveNumberPrefix,
  onMeasure,
}: MoveTokenProps) {
  const navigateToNode = useChessStore((s) => s.navigateToNode);
  const nags = nagsToString(node.nags);

  const showWhiteNumber = node.color === 'w';
  const showBlackEllipsis = node.color === 'b' && showMoveNumberPrefix;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.token,
        isActive && styles.tokenActive,
        pressed && styles.tokenPressed,
      ]}
      onPress={() => navigateToNode(path)}
      onLayout={(e) => onMeasure(node.id, e.nativeEvent.layout.y)}
      accessibilityRole="button"
      accessibilityLabel={`${showWhiteNumber ? node.moveNumber + '.' : ''}${node.san}`}
    >
      {showWhiteNumber && (
        <Text style={[styles.moveNumber, isActive && styles.moveNumberActive]}>
          {node.moveNumber}.{' '}
        </Text>
      )}
      {showBlackEllipsis && (
        <Text style={[styles.moveNumber, isActive && styles.moveNumberActive]}>
          {node.moveNumber}...{' '}
        </Text>
      )}
      <Text style={[styles.san, isActive && styles.sanActive]}>
        {node.san}
        {nags ? (
          <Text style={[styles.nag, isActive && styles.nagActive]}>{nags}</Text>
        ) : null}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  token: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 3,
    marginHorizontal: 1,
    marginVertical: 2,
  },
  tokenActive: {
    backgroundColor: '#5c6bc0',
  },
  tokenPressed: {
    backgroundColor: '#3d3d6e',
  },
  moveNumber: {
    color: '#888',
    fontSize: 13,
  },
  moveNumberActive: {
    color: '#c5cae9',
  },
  san: {
    color: '#e0e0ff',
    fontSize: 14,
    fontWeight: '500',
  },
  sanActive: {
    color: '#fff',
    fontWeight: '700',
  },
  nag: {
    color: '#ffb74d',
    fontSize: 13,
  },
  nagActive: {
    color: '#ffcc80',
  },
});
