import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Chessboard from 'react-native-chessboard';
import type { ChessboardRef } from 'react-native-chessboard';
import type { Move } from 'chess.js';
import { useChessStore } from '../../store';
import { BOARD_THEMES } from '../../store/slices/uiSlice';

interface ChessBoardWrapperProps {
  size: number;
}

export default function ChessBoardWrapper({ size }: ChessBoardWrapperProps) {
  const boardRef = useRef<ChessboardRef>(null);
  const isUserMoveRef = useRef(false);

  const currentFen = useChessStore((s) => s.currentFen);
  const makeMove = useChessStore((s) => s.makeMove);
  const setLastMove = useChessStore((s) => s.setLastMove);
  const boardTheme = useChessStore((s) => s.boardTheme);
  const showCoordinates = useChessStore((s) => s.showCoordinates);

  const themeColors = BOARD_THEMES[boardTheme];

  // Sync board to external FEN changes (navigation, PGN load, etc.)
  useEffect(() => {
    if (isUserMoveRef.current) {
      isUserMoveRef.current = false;
      return;
    }
    boardRef.current?.resetBoard(currentFen);
  }, [currentFen]);

  const handleMove = useCallback(
    ({ move }: { move: Move; state: unknown }) => {
      isUserMoveRef.current = true;
      const uci = `${move.from}${move.to}${move.promotion ?? ''}`;
      makeMove(uci);
      setLastMove([move.from, move.to]);
    },
    [makeMove, setLastMove]
  );

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Chessboard
        ref={boardRef}
        fen={currentFen}
        boardSize={size}
        gestureEnabled
        onMove={handleMove}
        withLetters={showCoordinates}
        withNumbers={showCoordinates}
        colors={{
          black: themeColors.black,
          white: themeColors.white,
          lastMoveHighlight: themeColors.lastMoveHighlight,
          checkmateHighlight: '#E84855',
        }}
        durations={{ move: 120 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
  },
});
