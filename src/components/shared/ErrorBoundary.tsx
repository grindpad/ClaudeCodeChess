import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface Props {
  children: React.ReactNode;
  /** Optional label shown in the error fallback (e.g. "Engine", "Explorer") */
  label?: string;
}

interface State {
  hasError: boolean;
  message: string;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message =
      error instanceof Error ? error.message : 'Unknown error';
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.label ?? 'unknown'}]`, error, info);
  }

  reset = () => this.setState({ hasError: false, message: '' });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.title}>
          {this.props.label ? `${this.props.label} crashed` : 'Something went wrong'}
        </Text>
        <Text style={styles.message} numberOfLines={3}>
          {this.state.message}
        </Text>
        <Pressable style={styles.resetBtn} onPress={this.reset}>
          <Text style={styles.resetText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 10,
    backgroundColor: '#12122a',
  },
  icon: { fontSize: 28 },
  title: { color: '#e84855', fontSize: 14, fontWeight: '700' },
  message: { color: '#666', fontSize: 12, textAlign: 'center' },
  resetBtn: {
    backgroundColor: '#2d2d4e',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginTop: 4,
  },
  resetText: { color: '#a8b4ff', fontSize: 13, fontWeight: '600' },
});
