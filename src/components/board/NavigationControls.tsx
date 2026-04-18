/**
 * NavigationControls — four nav buttons + tappable panel selector.
 *
 * B5:     ⏮  ◀  ▶  ⇅
 * STYLE-C: Visual button height 36pt, hitSlop 8pt each side for 44pt touch target.
 * FEATURE-A: Panel label is tappable — shows a popup menu to jump directly to
 *   any panel (Notation / Explorer / Engine).
 */

import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useChessStore } from '../../store';
import { selectCanGoForward, selectCanGoBack } from '../../store/selectors';
import type { PanelTab } from '../shared/PanelTabs';
import { PANEL_TABS, PANEL_LABELS } from '../shared/PanelTabs';

interface NavigationControlsProps {
  activePanel?: PanelTab;
  onPanelChange?: (tab: PanelTab) => void;
}

export default function NavigationControls({ activePanel, onPanelChange }: NavigationControlsProps) {
  const navigateBack = useChessStore((s) => s.navigateBack);
  const navigateForward = useChessStore((s) => s.navigateForward);
  const resetToStartPosition = useChessStore((s) => s.resetToStartPosition);
  const flipBoard = useChessStore((s) => s.flipBoard);

  const canGoForward = useChessStore(selectCanGoForward);
  const canGoBack = useChessStore(selectCanGoBack);

  const [menuVisible, setMenuVisible] = useState(false);

  const handlePanelSelect = (tab: PanelTab) => {
    setMenuVisible(false);
    onPanelChange?.(tab);
  };

  return (
    <View style={styles.row}>
      <NavButton label="⏮" onPress={resetToStartPosition} disabled={!canGoBack} />
      <NavButton label="◀" onPress={navigateBack} disabled={!canGoBack} />
      <NavButton label="▶" onPress={navigateForward} disabled={!canGoForward} />
      <NavButton label="⇅" onPress={flipBoard} />

      {activePanel && (
        <>
          <Pressable
            style={({ pressed }) => [
              styles.panelLabelBtn,
              pressed && styles.panelLabelBtnPressed,
            ]}
            onPress={() => setMenuVisible(true)}
            hitSlop={8}
            accessibilityLabel="Select panel"
            accessibilityRole="button"
          >
            <Text style={styles.panelLabel}>
              {PANEL_LABELS[activePanel].toUpperCase()} ▾
            </Text>
          </Pressable>

          {/* Panel selector popup */}
          <Modal
            visible={menuVisible}
            transparent
            animationType="none"
            onRequestClose={() => setMenuVisible(false)}
          >
            <Pressable style={styles.modalBackdrop} onPress={() => setMenuVisible(false)}>
              <View style={styles.menuPopup}>
                {PANEL_TABS.map((tab) => (
                  <Pressable
                    key={tab}
                    style={({ pressed }) => [
                      styles.menuItem,
                      tab === activePanel && styles.menuItemActive,
                      pressed && styles.menuItemPressed,
                    ]}
                    onPress={() => handlePanelSelect(tab)}
                  >
                    <Text
                      style={[
                        styles.menuItemText,
                        tab === activePanel && styles.menuItemTextActive,
                      ]}
                    >
                      {PANEL_LABELS[tab]}
                    </Text>
                    {tab === activePanel && <Text style={styles.menuCheckmark}>✓</Text>}
                  </Pressable>
                ))}
              </View>
            </Pressable>
          </Modal>
        </>
      )}
    </View>
  );
}

function NavButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
    >
      <Text style={[styles.buttonText, disabled && styles.buttonTextDisabled]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
    paddingHorizontal: 16,
  },
  // STYLE-C: visual height 36pt
  button: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    width: 60,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.3,
  },
  buttonPressed: {
    backgroundColor: '#3A3A3A',
  },
  buttonText: {
    color: '#F0F0F0',
    fontSize: 17,
    fontWeight: '500',
  },
  buttonTextDisabled: {
    color: '#555',
  },
  // FEATURE-A: tappable panel label button
  panelLabelBtn: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    minHeight: 44,
    justifyContent: 'center',
  },
  panelLabelBtnPressed: {
    backgroundColor: '#2A2A2A',
  },
  panelLabel: {
    color: '#666',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  // Panel selector popup (modal)
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  menuPopup: {
    backgroundColor: '#1C1C1C',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2E2E2E',
    minWidth: 180,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2E2E2E',
  },
  menuItemActive: {
    backgroundColor: '#2A2A2A',
  },
  menuItemPressed: {
    backgroundColor: '#333333',
  },
  menuItemText: {
    color: '#C8C8C8',
    fontSize: 15,
    fontWeight: '500',
  },
  menuItemTextActive: {
    color: '#F0F0F0',
    fontWeight: '700',
  },
  menuCheckmark: {
    color: '#F0F0F0',
    fontSize: 14,
    fontWeight: '700',
  },
});
