import { View, Text, StyleSheet } from 'react-native';

/**
 * Settings screen — engine depth, board theme, piece set.
 * Will be implemented in Phase 7.
 */
export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Settings — coming in Phase 7</Text>
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
