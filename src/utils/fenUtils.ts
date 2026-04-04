/**
 * Utilities for extracting information from FEN strings without instantiating chess.js.
 * FEN format: <pieces> <turn> <castling> <en-passant> <halfmove> <fullmove>
 */

export function fenToTurn(fen: string): 'w' | 'b' {
  return fen.split(' ')[1] === 'b' ? 'b' : 'w';
}

export function fenToFullMove(fen: string): number {
  return parseInt(fen.split(' ')[5] ?? '1', 10);
}

export function fenToHalfMove(fen: string): number {
  return parseInt(fen.split(' ')[4] ?? '0', 10);
}

export function fenToCastling(fen: string): string {
  return fen.split(' ')[2] ?? '-';
}

export function fenToEnPassant(fen: string): string {
  return fen.split(' ')[3] ?? '-';
}
