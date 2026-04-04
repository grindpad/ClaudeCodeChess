import { View, Text, StyleSheet } from 'react-native';

/**
 * Main board screen. Will be filled in Phase 2–3 once the board component
 * and navigation logic are implemented.
 */
export default function BoardScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Board — coming in Phase 2</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    color: '#a8dadc',
    fontSize: 18,
  },
});
