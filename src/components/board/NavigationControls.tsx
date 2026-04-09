/**
 * NavigationControls — B5: exactly four buttons.
 *   ⏮  Go to start
 *   ◀  Back one move
 *   ▶  Forward one move
 *   ⇅  Flip board
 *
 * Engine toggle and PGN import moved to the sidebar.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useChessStore } from '../../store';
import { selectCanGoForward, selectCanGoBack } from '../../store/selectors';

export default function NavigationControls() {
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
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  button: {
    backgroundColor: '#2d2d4e',
    borderRadius: 10,
    width: 64,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.35,
  },
  buttonPressed: {
    backgroundColor: '#3d3d6e',
  },
  buttonText: {
    color: '#e0e0ff',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonTextDisabled: {
    color: '#888',
  },
});
