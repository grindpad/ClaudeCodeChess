/**
 * ChessBoardWrapper — controlled wrapper around react-native-chessboard.
 *
 * BUG-B FIX: Board flip via rotate(180deg) transform on the container View.
 * react-native-chessboard has no native flip prop. We rotate the container 180°;
 * React Native remaps touch events through the transform matrix so interaction
 * still targets the correct squares.
 *
 * Pieces appear visually upside-down when flipped — this is a known limitation
 * of the library and cannot be fixed without modifying node_modules. The board
 * squares are correctly repositioned (h1 at top-left in black's view).
 */

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
  const boardFlipped = useChessStore((s) => s.boardFlipped);

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
      // makeMove now updates lastMoveSquares internally (BUG-A fix);
      // setLastMove here keeps the board-level highlight in sync too.
      setLastMove([move.from, move.to]);
    },
    [makeMove, setLastMove]
  );

  return (
    <View
      style={[
        styles.container,
        { width: size, height: size },
        boardFlipped ? styles.flipped : undefined,
      ]}
    >
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
  flipped: {
    transform: [{ rotate: '180deg' }],
  },
});
