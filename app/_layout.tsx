import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { useEngine } from '../src/hooks/useEngine';
import { useExplorer } from '../src/hooks/useExplorer';

function RootLayoutInner() {
  // Both hooks subscribe to currentFen via subscribeWithSelector — no re-renders here.
  useEngine();
  useExplorer();

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
