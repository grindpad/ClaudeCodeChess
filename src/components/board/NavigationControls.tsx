/**
 * NavigationControls — four nav buttons + tappable panel selector.
 *
 * B5:     ⏮  ◀  ▶  ⇅
 * STYLE-C: Visual button height 36pt, hitSlop 8pt each side for 44pt touch target.
 * FEATURE-A: Panel label is tappable — shows a popup menu to jump directly to
 *   any panel (Notation / Explorer / Engine).
 * FEATURE-A2: ▶ button shows a variation picker when the next position branches.
 */

import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useChessStore } from '../../store';
import { selectCanGoForward, selectCanGoBack } from '../../store/selectors';
import type { PanelTab } from '../shared/PanelTabs';
import { PANEL_TABS, PANEL_LABELS } from '../shared/PanelTabs';
import VariationPickerModal, { type VariationOption } from '../notation/VariationPickerModal';
import type { MoveNode, MoveTree, NavigationPath } from '../../types/moveTree';
import { nagsToString } from '../../utils/nag';

interface NavigationControlsProps {
  activePanel?: PanelTab;
  onPanelChange?: (tab: PanelTab) => void;
}

// ── Local tree helpers (mirrors private functions in gameSlice) ────────────────

function getLine(tree: MoveTree, path: NavigationPath): MoveNode[] {
  if (path.length === 0) return tree.mainLine;
  let line = tree.mainLine;
  for (let i = 0; i < path.length - 1; i++) {
    const seg = path[i];
    const nextSeg = path[i + 1];
    if (nextSeg.variationIndex !== undefined) {
      line = line[seg.index]?.variations[nextSeg.variationIndex] ?? [];
    }
  }
  return line;
}

function localAdvancePath(tree: MoveTree, path: NavigationPath): NavigationPath {
  if (path.length === 0) {
    return tree.mainLine.length > 0 ? [{ index: 0 }] : path;
  }
  const line = getLine(tree, path);
  const lastSeg = path[path.length - 1];
  if (lastSeg.index + 1 < line.length) {
    return [...path.slice(0, -1), { ...lastSeg, index: lastSeg.index + 1 }];
  }
  return path;
}

function formatMoveLabel(node: MoveNode): string {
  return node.color === 'w'
    ? `${node.moveNumber}. ${node.san}`
    : `${node.moveNumber}… ${node.san}`;
}

function buildContinuations(
  tree: MoveTree,
  navigationPath: NavigationPath
): { options: VariationOption[]; mainlinePath: NavigationPath } | null {
  const line = getLine(tree, navigationPath);
  const lastSeg = navigationPath.length > 0 ? navigationPath[navigationPath.length - 1] : null;
  const nextIndex = lastSeg ? lastSeg.index + 1 : 0;
  const nextNode = line[nextIndex];

  if (!nextNode || nextNode.variations.length === 0) return null;

  const advancedPath = localAdvancePath(tree, navigationPath);

  const options: VariationOption[] = [];

  // Mainline
  options.push({
    label: 'Main line',
    san: formatMoveLabel(nextNode),
    nag: nagsToString(nextNode.nags) || null,
    commentPreview: nextNode.comment ?? null,
    navigationPath: advancedPath,
  });

  // Each variation of the next node
  for (let vi = 0; vi < nextNode.variations.length; vi++) {
    const varLine = nextNode.variations[vi];
    const firstNode = varLine[0];
    if (!firstNode) continue;
    const varPath: NavigationPath = [...advancedPath, { variationIndex: vi, index: 0 }];
    options.push({
      label: `Variation ${vi + 1}`,
      san: formatMoveLabel(firstNode),
      nag: nagsToString(firstNode.nags) || null,
      commentPreview: firstNode.comment ?? null,
      navigationPath: varPath,
    });
  }

  return { options, mainlinePath: advancedPath };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function NavigationControls({ activePanel, onPanelChange }: NavigationControlsProps) {
  const navigateBack = useChessStore((s) => s.navigateBack);
  const navigateForward = useChessStore((s) => s.navigateForward);
  const navigateToNode = useChessStore((s) => s.navigateToNode);
  const resetToStartPosition = useChessStore((s) => s.resetToStartPosition);
  const flipBoard = useChessStore((s) => s.flipBoard);

  const canGoForward = useChessStore(selectCanGoForward);
  const canGoBack = useChessStore(selectCanGoBack);

  const [panelMenuVisible, setPanelMenuVisible] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerOptions, setPickerOptions] = useState<VariationOption[]>([]);

  const handlePanelSelect = (tab: PanelTab) => {
    setPanelMenuVisible(false);
    onPanelChange?.(tab);
  };

  const handleForward = () => {
    const { moveTree, navigationPath } = useChessStore.getState();
    if (!moveTree) return;

    const result = buildContinuations(moveTree, navigationPath);
    if (result) {
      setPickerOptions(result.options);
      setPickerVisible(true);
    } else {
      navigateForward();
    }
  };

  const handlePickerSelect = (path: NavigationPath) => {
    setPickerVisible(false);
    navigateToNode(path);
  };

  const handlePickerDismiss = () => {
    setPickerVisible(false);
  };

  return (
    <View style={styles.row}>
      <NavButton label="⏮" onPress={resetToStartPosition} disabled={!canGoBack} />
      <NavButton label="◀" onPress={navigateBack} disabled={!canGoBack} />
      <NavButton label="▶" onPress={handleForward} disabled={!canGoForward} />
      <NavButton label="⇅" onPress={flipBoard} />

      {activePanel && (
        <>
          <Pressable
            style={({ pressed }) => [
              styles.panelLabelBtn,
              pressed && styles.panelLabelBtnPressed,
            ]}
            onPress={() => setPanelMenuVisible(true)}
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
            visible={panelMenuVisible}
            transparent
            animationType="none"
            onRequestClose={() => setPanelMenuVisible(false)}
          >
            <Pressable style={styles.modalBackdrop} onPress={() => setPanelMenuVisible(false)}>
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

      {/* Variation picker — only shown when ▶ leads to a branch */}
      <VariationPickerModal
        isVisible={pickerVisible}
        continuations={pickerOptions}
        onSelect={handlePickerSelect}
        onDismiss={handlePickerDismiss}
      />
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
