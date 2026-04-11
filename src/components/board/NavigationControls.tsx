/**
 * NavigationControls — four nav buttons + active panel label.
 *
 * B5:     ⏮  ◀  ▶  ⇅
 * STYLE-C: Visual button height 36pt, hitSlop 8pt each side for 44pt touch target.
 * STYLE-D: Active panel name shown as small grey label to the right of flip button.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useChessStore } from '../../store';
import { selectCanGoForward, selectCanGoBack } from '../../store/selectors';
import type { PanelTab } from '../shared/PanelTabs';
import { PANEL_LABELS } from '../shared/PanelTabs';

interface NavigationControlsProps {
  activePanel?: PanelTab;
}

export default function NavigationControls({ activePanel }: NavigationControlsProps) {
  const navigateBack = useChessStore((s) => s.navigateBack);
  const navigateForward = useChessStore((s) => s.navigateForward);
  const resetToStartPosition = useChessStore((s) => s.resetToStartPosition);
  const flipBoard = useChessStore((s) => s.flipBoard);

  const canGoForward = useChessStore(selectCanGoForward);
  const canGoBack = useChessStore(selectCanGoBack);

  return (
    <View style={styles.row}>
      <NavButton label="⏮" onPress={resetToStartPosition} disabled={!canGoBack} />
      <NavButton label="◀" onPress={navigateBack} disabled={!canGoBack} />
      <NavButton label="▶" onPress={navigateForward} disabled={!canGoForward} />
      <NavButton label="⇅" onPress={flipBoard} />
      {activePanel && (
        <Text style={styles.panelLabel}>{PANEL_LABELS[activePanel].toUpperCase()}</Text>
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
  // STYLE-C: visual height 36pt (was 44pt)
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
  // STYLE-D: inline panel label
  panelLabel: {
    marginLeft: 8,
    color: '#555',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    alignSelf: 'center',
  },
});
