/**
 * ChessBoardWrapper — controlled wrapper around react-native-chessboard.
 *
 * BUG-B FIX: Board flip via rotate(180deg) transform + counter-rotated piece images.
 * react-native-chessboard has no native flip prop, so we:
 *   1. Rotate the board container 180° when boardFlipped=true
 *   2. Pass renderPiece to counter-rotate each piece image (so pieces appear upright)
 * Touch events are remapped through the transform by React Native's responder system.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Chessboard from 'react-native-chessboard';
import type { ChessboardRef } from 'react-native-chessboard';
import type { Move } from 'chess.js';
import { useChessStore } from '../../store';
import { BOARD_THEMES } from '../../store/slices/uiSlice';

// Piece asset map — mirrors react-native-chessboard/src/constants.ts
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PIECE_ASSETS: Record<string, unknown> = require('react-native-chessboard/lib/commonjs/constants').PIECES;

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
  const squareSize = size / 8;

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
      // Note: makeMove now updates lastMoveSquares internally (BUG-A fix),
      // but setLastMove here keeps the board-level highlight in sync.
      setLastMove([move.from, move.to]);
    },
    [makeMove, setLastMove]
  );

  // Counter-rotate piece images when the board container is rotated 180°
  // so that pieces always appear upright.
  const renderFlippedPiece = useCallback(
    (piece: string) => {
      const source = PIECE_ASSETS[piece];
      if (!source) return null;
      return (
        <Image
          source={source as any}
          style={{ width: squareSize, height: squareSize, transform: [{ rotate: '180deg' }] }}
        />
      );
    },
    [squareSize]
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
        renderPiece={boardFlipped ? renderFlippedPiece : undefined}
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
