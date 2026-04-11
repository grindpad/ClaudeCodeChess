/**
 * EvaluationBar — a two-tone bar showing the engine's evaluation of the position.
 *
 * Orientation:
 *   'vertical'   — tall bar to the left of the board (White's share at top)
 *   'horizontal' — wide bar above the board (White's share on the left)
 *
 * Score mapping:
 *   Centipawns → sigmoid curve: f(cp) = 2 / (1 + e^(-cp/400)) - 1  → [-1, 1]
 *   ±10 pawns (±1000 cp) ≈ ±0.96, so effectively full bar at ±10.
 *   Mate scores pin to ±1 immediately.
 *
 * When status is 'unsupported', shows a subtle "Engine: web only" label instead.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useChessStore } from '../../store';
import { cpToBarValue, formatScore } from '../../engine/uciParser';
import { fenToTurn } from '../../utils/fenUtils';

interface EvaluationBarProps {
  orientation?: 'vertical' | 'horizontal';
  /** Height for vertical bar, or width for horizontal bar */
  size: number;
  /** Thickness in the cross-axis direction */
  thickness?: number;
}

export default function EvaluationBar({
  orientation = 'vertical',
  size,
  thickness = 18,
}: EvaluationBarProps) {
  const engineStatus = useChessStore((s) => s.engineStatus);
  const engineOutput = useChessStore((s) => s.engineOutput);
  const currentFen = useChessStore((s) => s.currentFen);
  const isAnalysing = useChessStore((s) => s.isAnalysing);
  const startAnalysis = useChessStore((s) => s.startAnalysis);
  const stopAnalysis = useChessStore((s) => s.stopAnalysis);

  const sideToMove = fenToTurn(currentFen);

  if (engineStatus === 'unsupported') {
    return (
      <View
        style={[
          styles.unsupported,
          orientation === 'vertical'
            ? { height: size, width: thickness }
            : { width: size, height: thickness },
        ]}
      />
    );
  }

  // Convert score to a [0, 1] White share for rendering
  let whiteShare = 0.5; // default: equal
  let scoreLabel = '0.00';

  if (engineOutput?.score) {
    const { score } = engineOutput;
    if (score.type === 'mate') {
      const mateFromWhite = sideToMove === 'w' ? score.value : -score.value;
      whiteShare = mateFromWhite > 0 ? 0.98 : 0.02;
    } else {
      // score.value is from side-to-move perspective; convert to White's perspective
      const cpForWhite = sideToMove === 'w' ? score.value : -score.value;
      // Map to [0, 1]: 0 = black winning, 1 = white winning
      whiteShare = (cpToBarValue(cpForWhite) + 1) / 2;
      // Clamp
      whiteShare = Math.max(0.02, Math.min(0.98, whiteShare));
    }
    scoreLabel = formatScore(engineOutput.score, sideToMove);
  }

  const blackShare = 1 - whiteShare;
  const isLoading = engineStatus === 'loading' || engineStatus === 'idle';

  if (orientation === 'vertical') {
    return (
      <View style={[styles.verticalBar, { height: size, width: thickness }]}>
        {/* Black portion (top) */}
        <View style={[styles.blackFill, { flex: blackShare }]} />
        {/* Divider */}
        <View style={styles.divider} />
        {/* White portion (bottom) */}
        <View style={[styles.whiteFill, { flex: whiteShare }]} />
        {/* Score label overlay */}
        <View style={styles.scoreLabelContainer} pointerEvents="none">
          <Text style={[styles.scoreLabel, isLoading && styles.scoreLabelDim]} numberOfLines={1}>
            {isLoading ? '…' : scoreLabel}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.horizontalBar, { width: size, height: thickness }]}>
      {/* White portion (left) */}
      <View style={[styles.whiteFill, { flex: whiteShare }]} />
      {/* Divider */}
      <View style={styles.dividerH} />
      {/* Black portion (right) */}
      <View style={[styles.blackFill, { flex: blackShare }]} />
      {/* Score label overlay */}
      <View style={styles.scoreLabelContainer} pointerEvents="none">
        <Text style={[styles.scoreLabel, isLoading && styles.scoreLabelDim]} numberOfLines={1}>
          {isLoading ? '…' : scoreLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  verticalBar: {
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: '#333',
    position: 'relative',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#444',
  },
  horizontalBar: {
    flexDirection: 'row',
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: '#333',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#444',
  },
  // STYLE-A: pure black and white fills
  whiteFill: {
    backgroundColor: '#FFFFFF',
  },
  blackFill: {
    backgroundColor: '#000000',
  },
  // Thin grey divider between the two fills
  divider: {
    width: '100%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#555',
  },
  dividerH: {
    height: '100%',
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#555',
  },
  scoreLabelContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  scoreLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#111',
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 2,
    paddingVertical: 1,
    borderRadius: 2,
    overflow: 'hidden',
  },
  scoreLabelDim: {
    opacity: 0.4,
  },
  unsupported: {
    backgroundColor: '#1C1C1C',
    borderRadius: 3,
  },
});
