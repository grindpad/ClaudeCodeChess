import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useChessStore } from '../../store';

function formatMove(san: string, moveNumber: number, color: 'w' | 'b'): string {
  return color === 'w' ? `${moveNumber}. ${san}` : `${moveNumber}... ${san}`;
}

export default function MoveConflictModal() {
  const pendingMove = useChessStore((s) => s.pendingMove);
  const setPendingMove = useChessStore((s) => s.setPendingMove);
  const commitPendingMoveAsVariation = useChessStore((s) => s.commitPendingMoveAsVariation);
  const commitPendingMoveReplaceLine = useChessStore((s) => s.commitPendingMoveReplaceLine);

  const visible = pendingMove !== null;

  const handleCancel = () => setPendingMove(null);
  const handleAddVariation = () => commitPendingMoveAsVariation();
  const handleReplace = () => commitPendingMoveReplaceLine();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Move already exists</Text>
          <Text style={styles.message}>
            This position already has a continuation. What would you like to do?
          </Text>

          {pendingMove && (
            <View style={styles.moveInfo}>
              <Text style={styles.existingMove}>
                Existing: {formatMove(
                  pendingMove.existingSan,
                  pendingMove.existingMoveNumber,
                  pendingMove.existingColor
                )}
              </Text>
              <Text style={styles.newMove}>
                New: {formatMove(
                  pendingMove.newSan,
                  pendingMove.newMoveNumber,
                  pendingMove.newColor
                )}
              </Text>
            </View>
          )}

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && styles.btnPressed]}
              onPress={handleAddVariation}
              accessibilityRole="button"
            >
              <Text style={styles.btnPrimaryText}>Add as Variation</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.btn, styles.btnDestructive, pressed && styles.btnPressed]}
              onPress={handleReplace}
              accessibilityRole="button"
            >
              <Text style={styles.btnDestructiveText}>Replace Main Line</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.btn, styles.btnCancel, pressed && styles.btnPressed]}
              onPress={handleCancel}
              accessibilityRole="button"
            >
              <Text style={styles.btnCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  sheet: {
    backgroundColor: '#1C1C1C',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: '#2E2E2E',
  },
  title: {
    color: '#F0F0F0',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
  },
  message: {
    color: '#888',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  moveInfo: {
    backgroundColor: '#111111',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#2E2E2E',
  },
  existingMove: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },
  newMove: {
    color: '#F0F0F0',
    fontSize: 14,
    fontWeight: '600',
  },
  actions: {
    gap: 10,
  },
  btn: {
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  btnPressed: {
    opacity: 0.75,
  },
  btnPrimary: {
    backgroundColor: '#3A3A3A',
  },
  btnPrimaryText: {
    color: '#F0F0F0',
    fontSize: 15,
    fontWeight: '700',
  },
  btnDestructive: {
    backgroundColor: '#2E1A1A',
    borderWidth: 1,
    borderColor: '#5C2020',
  },
  btnDestructiveText: {
    color: '#E57373',
    fontSize: 15,
    fontWeight: '600',
  },
  btnCancel: {
    backgroundColor: '#2A2A2A',
  },
  btnCancelText: {
    color: '#888',
    fontSize: 15,
    fontWeight: '500',
  },
});
