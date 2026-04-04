import { SafeAreaView, StyleSheet } from 'react-native';
import BoardContainer from '../../src/components/board/BoardContainer';
import GameHeader from '../../src/components/board/GameHeader';
import PgnImportModal from '../../src/components/pgn/PgnImportModal';

export default function BoardScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <GameHeader />
      <BoardContainer />
      <PgnImportModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
});
