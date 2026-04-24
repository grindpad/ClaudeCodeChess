import type { NavigationPath } from '../types/moveTree';

export interface StoredGameRecord {
  id: string;
  entryId: string;
  pgn: string;
  white: string | null;
  black: string | null;
  event: string | null;
  date: string | null;
  result: '1-0' | '0-1' | '1/2-1/2' | '*' | null;
  plyCount: number | null;
  hasAnnotations: boolean;
  indexInEntry: number;
}

export interface LibraryEntry {
  id: string;
  title: string;
  source: 'imported' | 'played';
  games: StoredGameRecord[];
  dateAdded: string;
  dateModified: string;
}

export interface SessionState {
  pgn: string | null;
  navigationPath: NavigationPath;
  activeLibraryEntryId: string | null;
  activeGameId: string | null;
  timestamp: string;
}
