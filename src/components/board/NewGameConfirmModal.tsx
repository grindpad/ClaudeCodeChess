import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

interface NewGameConfirmModalProps {
  visible: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export default function NewGameConfirmModal({
  visible,
  onSave,
  onDiscard,
  onCancel,
}: NewGameConfirmModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Unsaved Changes</Text>
          <Text style={styles.message}>
            You have unsaved changes. Would you like to save this game before starting a new one?
          </Text>

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && styles.btnPressed]}
              onPress={onSave}
              accessibilityRole="button"
            >
              <Text style={styles.btnPrimaryText}>Save Game</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.btn, styles.btnDestructive, pressed && styles.btnPressed]}
              onPress={onDiscard}
              accessibilityRole="button"
            >
              <Text style={styles.btnDestructiveText}>Discard</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.btn, styles.btnCancel, pressed && styles.btnPressed]}
              onPress={onCancel}
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
