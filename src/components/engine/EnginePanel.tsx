import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useChessStore } from '../../store';
import { formatScore } from '../../engine/uciParser';
import { fenToTurn, fenToFullMove } from '../../utils/fenUtils';
import type { PvLine } from '../../types/engine';

export default function EnginePanel() {
  const engineStatus = useChessStore((s) => s.engineStatus);
  const isAnalysing = useChessStore((s) => s.isAnalysing);
  const engineOutput = useChessStore((s) => s.engineOutput);
  const multiPvCount = useChessStore((s) => s.multiPvCount);
  const targetDepth = useChessStore((s) => s.targetDepth);
  const setMultiPv = useChessStore((s) => s.setMultiPv);
  const startAnalysis = useChessStore((s) => s.startAnalysis);
  const stopAnalysis = useChessStore((s) => s.stopAnalysis);
  const makeMove = useChessStore((s) => s.makeMove);
  const currentFen = useChessStore((s) => s.currentFen);
  const requestEngineRestart = useChessStore((s) => s.requestEngineRestart);

  const isUnsupported = engineStatus === 'unsupported';
  const isLoading = engineStatus === 'loading' || engineStatus === 'idle';
  const isStuck = isAnalysing && engineStatus === 'analyzing' &&
    (!engineOutput || engineOutput.depth === 0);
  const sideToMove = fenToTurn(currentFen);
  const fullMove = fenToFullMove(currentFen);
  const depth = engineOutput?.depth ?? 0;

  const lines: PvLine[] = engineOutput?.multipv?.length
    ? engineOutput.multipv.slice(0, multiPvCount)
    : engineOutput?.pv
    ? [{ ...engineOutput.pv, score: engineOutput.score ?? null }]
    : [];

  if (isUnsupported) {
    return (
      <View style={styles.centered}>
        <Text style={styles.hint}>Engine analysis requires Expo Web (browser).</Text>
      </View>
    );
  }

  const statusText =
    engineStatus === 'analyzing' || (isAnalysing && engineStatus === 'ready')
      ? 'Analyzing…'
      : engineStatus === 'ready'
      ? 'Ready'
      : engineStatus === 'loading' || engineStatus === 'idle'
      ? 'Loading engine…'
      : 'Engine error — reload page';

  return (
    <View style={styles.container}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [
            styles.toggleBtn,
            isAnalysing && styles.toggleBtnActive,
            pressed && !isLoading && styles.toggleBtnPressed,
          ]}
          onPress={isAnalysing ? stopAnalysis : startAnalysis}
          disabled={isLoading}
        >
          <Text style={[styles.toggleText, isLoading && styles.dimText]}>
            {isAnalysing ? '⚡ Stop' : '⚙ Analyse'}
          </Text>
        </Pressable>

        <View style={styles.depthBadge}>
          <Text style={styles.depthText}>d{depth > 0 ? depth : targetDepth}</Text>
        </View>

        <View style={styles.multiPvControl}>
          <Pressable
            style={[styles.stepBtn, multiPvCount <= 1 && styles.stepBtnDisabled]}
            onPress={() => setMultiPv(multiPvCount - 1)}
            disabled={multiPvCount <= 1}
          >
            <Text style={styles.stepBtnText}>−</Text>
          </Pressable>
          <Text style={styles.multiPvLabel}>
            {multiPvCount} line{multiPvCount > 1 ? 's' : ''}
          </Text>
          <Pressable
            style={[styles.stepBtn, multiPvCount >= 4 && styles.stepBtnDisabled]}
            onPress={() => setMultiPv(multiPvCount + 1)}
            disabled={multiPvCount >= 4}
          >
            <Text style={styles.stepBtnText}>+</Text>
          </Pressable>
        </View>
      </View>

      {/* ── PV lines ───────────────────────────────────────────────────────── */}
      <ScrollView style={styles.linesArea} showsVerticalScrollIndicator={false}>
        {lines.length === 0 && (
          // A2 FIX: Tapping "Calculating…" restarts the engine when stuck
          <Pressable
            onPress={isStuck ? requestEngineRestart : undefined}
            style={isStuck ? styles.stuckHint : undefined}
          >
            <Text style={[styles.hint, isStuck && styles.stuckHintText]}>
              {isAnalysing ? (isStuck ? 'Calculating… (tap to restart)' : 'Calculating…') : 'Press Analyse to start engine evaluation.'}
            </Text>
          </Pressable>
        )}
        {lines.map((line, idx) => (
          <PvLineRow
            key={idx}
            line={line}
            sideToMove={sideToMove}
            fullMove={fullMove}
            isTop={idx === 0}
            onPress={() => {
              if (line.moves[0]) makeMove(line.moves[0]);
            }}
          />
        ))}
      </ScrollView>

      {/* ── Status bar ─────────────────────────────────────────────────────── */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>{statusText}</Text>
        {engineOutput && engineOutput.nps > 0 && (
          <Text style={styles.statusText}>
            {(engineOutput.nps / 1000).toFixed(0)}k nps
          </Text>
        )}
      </View>
    </View>
  );
}

// ── PV line row ───────────────────────────────────────────────────────────────

/** A4 FIX: Format SAN moves with proper move numbers */
function formatMovesWithNumbers(
  sans: string[],
  sideToMove: 'w' | 'b',
  startFullMove: number,
  maxMoves = 8
): string {
  const parts: string[] = [];
  let moveNum = startFullMove;
  let isBlackTurn = sideToMove === 'b';

  for (let i = 0; i < sans.length && i < maxMoves; i++) {
    if (!isBlackTurn) {
      // White's move — always show number
      parts.push(`${moveNum}.`);
    } else if (i === 0) {
      // First move is black — show number with ellipsis
      parts.push(`${moveNum}…`);
    }
    parts.push(sans[i]);

    if (isBlackTurn) {
      moveNum++;
      isBlackTurn = false;
    } else {
      isBlackTurn = true;
    }
  }

  const hasMore = sans.length > maxMoves;
  return parts.join(' ') + (hasMore ? '…' : '');
}

function PvLineRow({
  line,
  sideToMove,
  fullMove,
  isTop,
  onPress,
}: {
  line: PvLine;
  sideToMove: 'w' | 'b';
  fullMove: number;
  isTop: boolean;
  onPress: () => void;
}) {
  const score = line.score ?? null;
  const scoreText = formatScore(score, sideToMove);
  const isPositive = scoreText.startsWith('+') || /^M\d/.test(scoreText);
  const isNegative = scoreText.startsWith('-');

  const movesText = formatMovesWithNumbers(line.san, sideToMove, fullMove);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.pvRow,
        isTop && styles.pvRowTop,
        pressed && styles.pvRowPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Play ${line.san[0] ?? ''}: ${movesText}`}
    >
      <Text
        style={[
          styles.score,
          isPositive && styles.scorePositive,
          isNegative && styles.scoreNegative,
        ]}
      >
        {scoreText}
      </Text>
      <Text style={styles.moves} numberOfLines={1} ellipsizeMode="tail">
        {movesText}
      </Text>
    </Pressable>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0e0e1e',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2d2d4e',
    gap: 8,
  },
  toggleBtn: {
    backgroundColor: '#2d2d4e',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#3949ab',
  },
  toggleBtnPressed: {
    backgroundColor: '#3d3d6e',
  },
  toggleText: {
    color: '#e0e0ff',
    fontSize: 13,
    fontWeight: '600',
  },
  dimText: {
    color: '#555',
  },
  depthBadge: {
    backgroundColor: '#12122a',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  depthText: {
    color: '#7986cb',
    fontSize: 12,
    fontWeight: '700',
  },
  multiPvControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 'auto',
  },
  stepBtn: {
    backgroundColor: '#2d2d4e',
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: {
    opacity: 0.3,
  },
  stepBtnText: {
    color: '#e0e0ff',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
  },
  multiPvLabel: {
    color: '#c0c0e0',
    fontSize: 12,
    fontWeight: '600',
    minWidth: 42,
    textAlign: 'center',
  },

  linesArea: {
    flex: 1,
  },
  pvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1e1e3a',
    gap: 10,
  },
  pvRowTop: {
    backgroundColor: '#12122a',
  },
  pvRowPressed: {
    backgroundColor: '#1e1e40',
  },
  score: {
    color: '#888',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'monospace',
    minWidth: 52,
  },
  scorePositive: {
    color: '#81c784',
  },
  scoreNegative: {
    color: '#e57373',
  },
  moves: {
    flex: 1,
    color: '#c0c0e0',
    fontSize: 13,
    fontFamily: 'monospace',
  },

  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2d2d4e',
    backgroundColor: '#0a0a1a',
  },
  statusText: {
    color: '#444',
    fontSize: 11,
  },
  hint: {
    color: '#444',
    fontSize: 13,
    padding: 16,
    textAlign: 'center',
  },
  stuckHint: {
    // Tappable area for restart
  },
  stuckHintText: {
    color: '#7986cb',
  },
});
