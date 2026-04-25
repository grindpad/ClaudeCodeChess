import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NavigationPath } from '../../types/moveTree';

export interface VariationOption {
  label: string;
  san: string;
  nag: string | null;
  commentPreview: string | null;
  navigationPath: NavigationPath;
}

interface VariationPickerModalProps {
  isVisible: boolean;
  continuations: VariationOption[];
  onSelect: (path: NavigationPath) => void;
  onDismiss: () => void;
}

export default function VariationPickerModal({
  isVisible,
  continuations,
  onSelect,
  onDismiss,
}: VariationPickerModalProps) {
  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        {/* Stop touch propagation on the card so tapping inside doesn't dismiss */}
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>Choose continuation</Text>

          <ScrollView bounces={false} style={styles.list}>
            {continuations.map((opt, i) => (
              <Pressable
                key={i}
                style={({ pressed }) => [
                  styles.row,
                  i < continuations.length - 1 && styles.rowBorder,
                  pressed && styles.rowPressed,
                ]}
                onPress={() => {
                  onSelect(opt.navigationPath);
                }}
                accessibilityRole="button"
              >
                <View style={styles.rowMain}>
                  <View style={styles.sanRow}>
                    <Text style={[styles.san, i === 0 && styles.sanMain]}>
                      {opt.san}
                      {opt.nag ? (
                        <Text style={styles.nag}>{opt.nag}</Text>
                      ) : null}
                    </Text>
                    <Text style={styles.varLabel}>{opt.label}</Text>
                  </View>
                  {opt.commentPreview ? (
                    <Text style={styles.comment} numberOfLines={1}>
                      {opt.commentPreview.length >= 40
                        ? opt.commentPreview.slice(0, 40) + '…'
                        : opt.commentPreview}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </ScrollView>

          <Pressable
            style={({ pressed }) => [styles.cancelBtn, pressed && styles.cancelBtnPressed]}
            onPress={onDismiss}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#1C1C1C',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2E2E2E',
    width: '100%',
    maxWidth: 340,
    overflow: 'hidden',
  },
  title: {
    color: '#666',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    textAlign: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2E2E2E',
  },
  list: {
    maxHeight: 320,
  },
  row: {
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2E2E2E',
  },
  rowPressed: {
    backgroundColor: '#2A2A2A',
  },
  rowMain: {
    gap: 3,
  },
  sanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  san: {
    color: '#C8C8C8',
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  sanMain: {
    color: '#F0F0F0',
    fontWeight: '700',
  },
  nag: {
    color: '#ffb74d',
    fontSize: 13,
  },
  varLabel: {
    color: '#555',
    fontSize: 12,
    flexShrink: 0,
  },
  comment: {
    color: '#555',
    fontSize: 12,
    fontStyle: 'italic',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#2E2E2E',
    minHeight: 52,
    justifyContent: 'center',
  },
  cancelBtnPressed: {
    backgroundColor: '#2A2A2A',
  },
  cancelText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '500',
  },
});
