/**
 * gameStorage — persists chess library entries and session to localStorage.
 *
 * Keys:
 *   chess_library_index          → JSON array of entry IDs (newest first)
 *   chess_library_entry_{id}     → JSON LibraryEntry object
 *   chess_session                → JSON SessionState object
 */

import type { LibraryEntry, StoredGameRecord, SessionState } from './storageTypes';

export type { LibraryEntry, StoredGameRecord, SessionState };

const INDEX_KEY = 'chess_library_index';
const ENTRY_PREFIX = 'chess_library_entry_';
const SESSION_KEY = 'chess_session';

function ls(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

function getIndex(): string[] {
  try {
    const raw = ls()?.getItem(INDEX_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function setIndex(ids: string[]): void {
  try {
    ls()?.setItem(INDEX_KEY, JSON.stringify(ids));
  } catch {}
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── Entry CRUD ────────────────────────────────────────────────────────────────

export function saveEntry(
  entry: Omit<LibraryEntry, 'id' | 'dateAdded' | 'dateModified'>
): string {
  const now = new Date().toISOString();
  const entryId = genId();
  const games: StoredGameRecord[] = entry.games.map((g) => ({ ...g, entryId }));
  const full: LibraryEntry = {
    ...entry,
    games,
    id: entryId,
    dateAdded: now,
    dateModified: now,
  };
  try {
    ls()?.setItem(ENTRY_PREFIX + entryId, JSON.stringify(full));
    const index = getIndex();
    index.unshift(entryId);
    setIndex(index);
  } catch {}
  return entryId;
}

export function getEntry(id: string): LibraryEntry | null {
  try {
    const raw = ls()?.getItem(ENTRY_PREFIX + id);
    return raw ? (JSON.parse(raw) as LibraryEntry) : null;
  } catch {
    return null;
  }
}

export function getAllEntries(): LibraryEntry[] {
  return getIndex()
    .map((id) => getEntry(id))
    .filter((e): e is LibraryEntry => e !== null)
    .sort((a, b) => b.dateModified.localeCompare(a.dateModified));
}

export function deleteEntry(id: string): void {
  try {
    ls()?.removeItem(ENTRY_PREFIX + id);
    setIndex(getIndex().filter((eid) => eid !== id));
  } catch {}
}

export function updateEntry(
  id: string,
  patch: Partial<Pick<LibraryEntry, 'title' | 'games'>>
): void {
  const entry = getEntry(id);
  if (!entry) return;
  const updated: LibraryEntry = {
    ...entry,
    ...patch,
    dateModified: new Date().toISOString(),
  };
  try {
    ls()?.setItem(ENTRY_PREFIX + id, JSON.stringify(updated));
  } catch {}
}

/** Replace the PGN of a specific game within an entry (e.g. after user makes moves). */
export function updateGame(entryId: string, gameId: string, pgn: string): void {
  const entry = getEntry(entryId);
  if (!entry) return;
  const games = entry.games.map((g) =>
    g.id === gameId ? { ...g, pgn } : g
  );
  const updated: LibraryEntry = {
    ...entry,
    games,
    dateModified: new Date().toISOString(),
  };
  try {
    ls()?.setItem(ENTRY_PREFIX + entryId, JSON.stringify(updated));
  } catch {}
}

// ── Session ───────────────────────────────────────────────────────────────────

export function saveSession(session: SessionState): void {
  try {
    ls()?.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {}
}

export function loadSession(): SessionState | null {
  try {
    const raw = ls()?.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as SessionState) : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    ls()?.removeItem(SESSION_KEY);
  } catch {}
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export function getStorageStats(): {
  entryCount: number;
  gameCount: number;
  estimatedBytes: number;
} {
  const entries = getAllEntries();
  const gameCount = entries.reduce((sum, e) => sum + e.games.length, 0);
  let estimatedBytes = 0;
  try {
    const storage = ls();
    if (storage) {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && (key.startsWith(ENTRY_PREFIX) || key === INDEX_KEY || key === SESSION_KEY)) {
          estimatedBytes += (storage.getItem(key)?.length ?? 0) * 2;
        }
      }
    }
  } catch {}
  return { entryCount: entries.length, gameCount, estimatedBytes };
}

// ── Legacy compat shim (used by nothing after this pass, kept for safety) ─────

/** @deprecated Use saveEntry instead */
export interface StoredGame {
  id: string;
  pgn: string;
  metadata: Record<string, unknown>;
  dateSaved: string;
  source: 'played' | 'imported';
}
