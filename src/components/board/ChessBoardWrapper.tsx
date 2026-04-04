/**
 * Thin controlled wrapper around react-native-chessboard.
 *
 * Ownership model:
 * - The board library owns rendering and gesture handling.
 * - Our Zustand store owns game state (FEN, move tree, etc.).
 * - This component is the bridge between the two.
 *
 * Key invariant: when `currentFen` changes due to external causes (navigation,
 * PGN load, back/forward buttons), we call `boardRef.resetBoard(fen)` to sync
 * the visual state. When the user makes a move ON the board, `onMove` fires
 * first and we set `isUserMoveRef = true` so the effect skips `resetBoard`.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Chessboard from 'react-native-chessboard';
import type { ChessboardRef } from 'react-native-chessboard';
import type { Move } from 'chess.js';
import { useChessStore } from '../../store';

interface ChessBoardWrapperProps {
  size: number;
}

export default function ChessBoardWrapper({ size }: ChessBoardWrapperProps) {
  const boardRef = useRef<ChessboardRef>(null);
  const isUserMoveRef = useRef(false);

  const currentFen = useChessStore((s) => s.currentFen);
  const makeMove = useChessStore((s) => s.makeMove);
  const setLastMove = useChessStore((s) => s.setLastMove);

  // Sync board to external FEN changes (navigation, PGN load, etc.)
  useEffect(() => {
    if (isUserMoveRef.current) {
      // This FEN change was triggered by our own onMove — board already shows it
      isUserMoveRef.current = false;
      return;
    }
    boardRef.current?.resetBoard(currentFen);
  }, [currentFen]);

  const handleMove = useCallback(
    ({ move }: { move: Move; state: unknown }) => {
      // Mark that this FEN change is user-initiated so the effect above skips resetBoard
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
        colors={{
          black: '#769656',
          white: '#eeeed2',
          lastMoveHighlight: 'rgba(255, 255, 0, 0.4)',
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
