import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useChessStore } from '../../store';

export default function PromoteVariationModal() {
  const pendingPromotion = useChessStore((s) => s.pendingPromotion);
  const setPendingPromotion = useChessStore((s) => s.setPendingPromotion);
  const promoteVariation = useChessStore((s) => s.promoteVariation);

  const visible = pendingPromotion !== null;

  const handleCancel = () => setPendingPromotion(null);

  const handlePromote = () => {
    if (!pendingPromotion) return;
    promoteVariation(pendingPromotion.path);
  };

  const firstMoveLabel = pendingPromotion
    ? (pendingPromotion.firstMoveColor === 'w'
        ? `${pendingPromotion.firstMoveNumber}. ${pendingPromotion.firstMoveSan}`
        : `${pendingPromotion.firstMoveNumber}... ${pendingPromotion.firstMoveSan}`)
    : '';

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Promote Variation</Text>

          <Text style={styles.firstMove}>{firstMoveLabel}</Text>

          <Text style={styles.message}>
            Promote this variation to the main line? The current main line will become a variation.
          </Text>

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && styles.btnPressed]}
              onPress={handlePromote}
              accessibilityRole="button"
            >
              <Text style={styles.btnPrimaryText}>Promote</Text>
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
    marginBottom: 12,
  },
  firstMove: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  message: {
    color: '#888',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
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
  btnCancel: {
    backgroundColor: '#2A2A2A',
  },
  btnCancelText: {
    color: '#888',
    fontSize: 15,
    fontWeight: '500',
  },
});
