import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { useEngine } from '../src/hooks/useEngine';

function RootLayoutInner() {
  // Mount the engine once at the root. It subscribes to the Zustand store
  // via subscribeWithSelector and does not trigger renders here.
  useEngine();

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <RootLayoutInner />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
