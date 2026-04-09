/**
 * gameStorage — persists chess games to localStorage.
 *
 * Keys:
 *   chess_game_index          → JSON array of IDs (newest first)
 *   chess_game_<id>           → JSON StoredGame object
 */

import type { PgnMetadata } from '../types/pgn';

export interface StoredGame {
  id: string;
  pgn: string;
  metadata: Partial<PgnMetadata>;
  dateSaved: string;
  source: 'played' | 'imported';
}

const PREFIX = 'chess_game_';
const INDEX_KEY = 'chess_game_index';

function getIndex(): string[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function setIndex(ids: string[]): void {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(ids));
  } catch {
    // Ignore storage quota errors
  }
}

export function saveGame(
  pgn: string,
  metadata: Partial<PgnMetadata> | null,
  source: 'played' | 'imported' = 'played'
): string {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const game: StoredGame = {
    id,
    pgn,
    metadata: metadata ?? {},
    dateSaved: new Date().toISOString(),
    source,
  };
  try {
    localStorage.setItem(PREFIX + id, JSON.stringify(game));
    const index = getIndex();
    index.unshift(id); // newest first
    setIndex(index);
  } catch {
    // Ignore storage quota errors
  }
  return id;
}

export function loadGame(id: string): StoredGame | null {
  try {
    const raw = localStorage.getItem(PREFIX + id);
    return raw ? (JSON.parse(raw) as StoredGame) : null;
  } catch {
    return null;
  }
}

export function getAllGames(): StoredGame[] {
  return getIndex()
    .map((id) => loadGame(id))
    .filter((g): g is StoredGame => g !== null);
}

export function deleteGame(id: string): void {
  try {
    localStorage.removeItem(PREFIX + id);
    setIndex(getIndex().filter((existingId) => existingId !== id));
  } catch {
    // Ignore
  }
}
