/**
 * Three-segment bar showing White wins / Draws / Black wins as proportional
 * color blocks. Segments narrower than ~4% are hidden to avoid slivers.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface WinRateBarProps {
  white: number;
  draws: number;
  black: number;
  height?: number;
  showLabels?: boolean;
}

const MIN_SHOW = 0.04; // hide segments below 4%

export default function WinRateBar({
  white,
  draws,
  black,
  height = 10,
  showLabels = false,
}: WinRateBarProps) {
  const total = white + draws + black;
  if (total === 0) return null;

  const wPct = white / total;
  const dPct = draws / total;
  const bPct = black / total;

  return (
    <View style={[styles.bar, { height }]}>
      {wPct >= MIN_SHOW && (
        <View style={[styles.white, { flex: wPct }]}>
          {showLabels && (
            <Text style={styles.labelDark}>{Math.round(wPct * 100)}%</Text>
          )}
        </View>
      )}
      {dPct >= MIN_SHOW && (
        <View style={[styles.draw, { flex: dPct }]}>
          {showLabels && (
            <Text style={styles.labelMid}>{Math.round(dPct * 100)}%</Text>
          )}
        </View>
      )}
      {bPct >= MIN_SHOW && (
        <View style={[styles.black, { flex: bPct }]}>
          {showLabels && (
            <Text style={styles.labelLight}>{Math.round(bPct * 100)}%</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderRadius: 3,
    overflow: 'hidden',
    flex: 1,
  },
  white: {
    backgroundColor: '#eeeed2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  draw: {
    backgroundColor: '#8a9ba8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  black: {
    backgroundColor: '#2d3a2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelDark: { color: '#333', fontSize: 8, fontWeight: '700' },
  labelMid: { color: '#fff', fontSize: 8, fontWeight: '700' },
  labelLight: { color: '#aaa', fontSize: 8, fontWeight: '700' },
});
