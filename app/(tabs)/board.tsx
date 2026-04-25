import { SafeAreaView, StyleSheet } from 'react-native';
import BoardContainer from '../../src/components/board/BoardContainer';
import Sidebar from '../../src/components/board/Sidebar';
import PgnImportModal from '../../src/components/pgn/PgnImportModal';
import SaveGameModal from '../../src/components/pgn/SaveGameModal';
import MoveConflictModal from '../../src/components/board/MoveConflictModal';
import PromoteVariationModal from '../../src/components/notation/PromoteVariationModal';

export default function BoardScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Sidebar>
        <BoardContainer />
      </Sidebar>
      <PgnImportModal />
      <SaveGameModal />
      <MoveConflictModal />
      <PromoteVariationModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111111',
  },
});
