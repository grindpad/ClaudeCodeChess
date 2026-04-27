import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
  /** Registers this token's View ref for auto-scroll measurements. */
  onRegisterRef: (nodeId: string, ref: View | null) => void;
  /** True only for the first move in a variation line — enables double-tap to promote. */
  isVariationStart?: boolean;
  /** Called on double-tap; triggers promote variation flow. */
  onPromote?: () => void;
}

export default function MoveToken({
  node,
  path,
  isActive,
  showMoveNumberPrefix,
  onRegisterRef,
  isVariationStart,
  onPromote,
}: MoveTokenProps) {
  const navigateToNode = useChessStore((s) => s.navigateToNode);
  const nags = nagsToString(node.nags);
  const viewRef = useRef<View>(null);
  const lastTapRef = useRef<number>(0);

  const showWhiteNumber = node.color === 'w';
  const showBlackEllipsis = node.color === 'b' && showMoveNumberPrefix;

  const canPromote = !!isVariationStart && !!onPromote;

  // Register this token's native view ref on mount so NotationPanel can
  // call measureLayout on it relative to the ScrollView.
  useEffect(() => {
    onRegisterRef(node.id, viewRef.current);
    return () => {
      onRegisterRef(node.id, null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.id]);

  const handlePress = () => {
    if (canPromote) {
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        lastTapRef.current = 0;
        onPromote!();
        return;
      }
      lastTapRef.current = now;
    }
    navigateToNode(path);
  };

  return (
    <View ref={viewRef} collapsable={false}>
      <Pressable
        style={({ pressed }) => [
          styles.token,
          isActive && styles.tokenActive,
          pressed && styles.tokenPressed,
        ]}
        onPress={handlePress}
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
    </View>
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
    backgroundColor: '#555555',
  },
  tokenPressed: {
    backgroundColor: '#3A3A3A',
  },
  moveNumber: {
    color: '#888',
    fontSize: 13,
  },
  moveNumberActive: {
    color: '#c5cae9',
  },
  san: {
    color: '#F0F0F0',
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
