import { SafeAreaView, StyleSheet } from 'react-native';
import BoardContainer from '../../src/components/board/BoardContainer';
import Sidebar from '../../src/components/board/Sidebar';
import PgnImportModal from '../../src/components/pgn/PgnImportModal';

export default function BoardScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Sidebar>
        <BoardContainer />
      </Sidebar>
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
