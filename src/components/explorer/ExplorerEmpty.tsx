import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useChessStore } from '../../store';

interface ExplorerEmptyProps {
  loading: boolean;
  error: string | null;
}

export default function ExplorerEmpty({ loading, error }: ExplorerEmptyProps) {
  const currentFen = useChessStore((s) => s.currentFen);
  const fetchExplorer = useChessStore((s) => s.fetchExplorer);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#7986cb" size="small" />
        <Text style={styles.text}>Loading opening data…</Text>
      </View>
    );
  }

  if (error === 'offline') {
    return (
      <View style={styles.container}>
        <Text style={styles.icon}>📡</Text>
        <Text style={styles.text}>No internet connection</Text>
        <Pressable style={styles.retryBtn} onPress={() => fetchExplorer(currentFen)}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.text}>{error}</Text>
        <Pressable style={styles.retryBtn} onPress={() => fetchExplorer(currentFen)}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  // No error, no loading — position simply not in the database
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🔍</Text>
      <Text style={styles.text}>Position not in Masters database</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10,
  },
  icon: {
    fontSize: 28,
  },
  text: {
    color: '#666',
    fontSize: 13,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: '#2d2d4e',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginTop: 4,
  },
  retryText: {
    color: '#a8b4ff',
    fontSize: 13,
    fontWeight: '600',
  },
});
