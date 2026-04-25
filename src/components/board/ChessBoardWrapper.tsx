/**
 * ChessBoardWrapper — controlled wrapper around react-native-chessboard.
 *
 * BUG-A FIX (upside-down pieces when flipped):
 *   The container is rotated 180° to flip the board squares. However, pieces are
 *   also rotated 180° by that transform, making them appear upside-down.
 *   Fix: use the `renderPiece` prop to render each piece with a counter-rotation
 *   of 180°, so they appear upright relative to the viewer.
 *   Piece PNGs are copied to assets/pieces/ (not loaded from node_modules internals)
 *   so webpack can bundle them correctly for Expo web.
 *
 * BUG-B NOTE (castling):
 *   Drag-to-castle works on an un-flipped board: the library reports e1→g1 (or
 *   e8→g8 etc.) and chess.js v1.4 accepts those UCI strings. Tap-to-castle is a
 *   known library limitation — chess.js 0.12 (inside the library) returns "O-O"
 *   in the non-verbose moves list, so no selectable dot appears on g1/c1.
 *   Explorer / engine castling routes through makeMove("e1g1") which works fine.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Chessboard from 'react-native-chessboard';
import type { ChessboardRef } from 'react-native-chessboard';
import type { Move } from 'chess.js';
import { useChessStore } from '../../store';
import { BOARD_THEMES } from '../../store/slices/uiSlice';
import type { PieceType } from 'react-native-chessboard/src/types';

// ── Piece images (local project copies — safe for webpack bundling) ───────────

const PIECE_IMAGES: Record<PieceType, ReturnType<typeof require>> = {
  bb: require('../../../assets/pieces/bb.png'),
  bk: require('../../../assets/pieces/bk.png'),
  bn: require('../../../assets/pieces/bn.png'),
  bp: require('../../../assets/pieces/bp.png'),
  bq: require('../../../assets/pieces/bq.png'),
  br: require('../../../assets/pieces/br.png'),
  wb: require('../../../assets/pieces/wb.png'),
  wk: require('../../../assets/pieces/wk.png'),
  wn: require('../../../assets/pieces/wn.png'),
  wp: require('../../../assets/pieces/wp.png'),
  wq: require('../../../assets/pieces/wq.png'),
  wr: require('../../../assets/pieces/wr.png'),
};

interface ChessBoardWrapperProps {
  size: number;
}

export default function ChessBoardWrapper({ size }: ChessBoardWrapperProps) {
  const boardRef = useRef<ChessboardRef>(null);
  const isUserMoveRef = useRef(false);
  const pieceSize = size / 8;

  const currentFen = useChessStore((s) => s.currentFen);
  const makeMove = useChessStore((s) => s.makeMove);
  const setLastMove = useChessStore((s) => s.setLastMove);
  const boardTheme = useChessStore((s) => s.boardTheme);
  const showCoordinates = useChessStore((s) => s.showCoordinates);
  const boardFlipped = useChessStore((s) => s.boardFlipped);
  const pendingMove = useChessStore((s) => s.pendingMove);

  const themeColors = BOARD_THEMES[boardTheme];

  // Sync board to external FEN changes (navigation, PGN load, etc.)
  useEffect(() => {
    if (isUserMoveRef.current) {
      isUserMoveRef.current = false;
      return;
    }
    boardRef.current?.resetBoard(currentFen);
  }, [currentFen]);

  // When a move conflict is detected, reset the board back to the pre-move position
  // and clear the stale isUserMoveRef so future FEN changes behave normally.
  useEffect(() => {
    if (pendingMove !== null) {
      isUserMoveRef.current = false;
      boardRef.current?.resetBoard(currentFen);
    }
  }, [pendingMove]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMove = useCallback(
    ({ move }: { move: Move; state: unknown }) => {
      isUserMoveRef.current = true;
      const uci = `${move.from}${move.to}${move.promotion ?? ''}`;
      makeMove(uci);
      setLastMove([move.from, move.to]);
    },
    [makeMove, setLastMove]
  );

  // BUG-A FIX: when the board container is rotated 180°, pieces are also rotated
  // 180° by the parent transform. We counter-rotate each piece to keep it upright.
  const renderPiece = useCallback(
    (piece: PieceType) => {
      if (!boardFlipped) return null; // use library default rendering when not flipped
      return (
        <View style={[styles.pieceWrapper, { width: pieceSize, height: pieceSize }]}>
          <Image
            source={PIECE_IMAGES[piece]}
            style={[
              { width: pieceSize, height: pieceSize },
              styles.pieceCounterRotated,
            ]}
          />
        </View>
      );
    },
    [boardFlipped, pieceSize]
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
        renderPiece={boardFlipped ? renderPiece : undefined}
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
  pieceWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Counter-rotate piece 180° to cancel out the container rotation
  pieceCounterRotated: {
    transform: [{ rotate: '180deg' }],
  },
});
