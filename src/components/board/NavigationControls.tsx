import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useChessStore } from '../../store';

export default function NavigationControls() {
  const navigateBack = useChessStore((s) => s.navigateBack);
  const navigateForward = useChessStore((s) => s.navigateForward);
  const resetToStartPosition = useChessStore((s) => s.resetToStartPosition);
  const openPgnImport = useChessStore((s) => s.openPgnImport);
  const flipBoard = useChessStore((s) => s.flipBoard);
  const navigationPath = useChessStore((s) => s.navigationPath);
  const moveTree = useChessStore((s) => s.moveTree);
  const isAnalysing = useChessStore((s) => s.isAnalysing);
  const startAnalysis = useChessStore((s) => s.startAnalysis);
  const stopAnalysis = useChessStore((s) => s.stopAnalysis);
  const engineStatus = useChessStore((s) => s.engineStatus);

  const atStart = navigationPath.length === 0;
  const currentNode = useChessStore((s) => s.currentNode);
  const atEnd = !moveTree || (!currentNode
    ? moveTree.mainLine.length === 0
    : false);

  const engineUnavailable = engineStatus === 'unsupported' || engineStatus === 'error';
  const engineLabel = isAnalysing ? '⚡' : '⚙';

  return (
    <View style={styles.row}>
      <NavButton label="⟪" onPress={resetToStartPosition} disabled={atStart} />
      <NavButton label="◀" onPress={navigateBack} disabled={atStart} />
      <NavButton label="▶" onPress={navigateForward} disabled={atEnd} />
      <NavButton label="PGN" onPress={openPgnImport} />
      <NavButton
        label={engineLabel}
        onPress={isAnalysing ? stopAnalysis : startAnalysis}
        disabled={engineUnavailable || engineStatus === 'loading'}
        active={isAnalysing}
      />
      <NavButton label="⇌" onPress={flipBoard} />
    </View>
  );
}

function NavButton({
  label,
  onPress,
  disabled = false,
  active = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        active && styles.buttonActive,
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
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  buttonActive: {
    backgroundColor: '#3949ab',
  },
  button: {
    backgroundColor: '#2d2d4e',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 48,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.35,
  },
  buttonPressed: {
    backgroundColor: '#3d3d6e',
  },
  buttonText: {
    color: '#e0e0ff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextDisabled: {
    color: '#888',
  },
});
