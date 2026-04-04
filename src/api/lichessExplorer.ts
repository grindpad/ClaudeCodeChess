import { explorerCache } from './explorerCache';

const BASE_URL = 'https://explorer.lichess.ovh/masters';

export interface LichessExplorerMove {
  uci: string;
  san: string;
  averageRating: number;
  white: number;
  draws: number;
  black: number;
  game: null | {
    id: string;
    winner: 'white' | 'black' | null;
    speed: string;
    mode: string;
    year: number;
    month: string;
  };
}

export interface LichessExplorerTopGame {
  id: string;
  winner: 'white' | 'black' | null;
  speed: string;
  mode: string;
  black: { name: string; rating: number };
  white: { name: string; rating: number };
  year: number;
  month: string;
}

export interface LichessExplorerResponse {
  white: number;
  draws: number;
  black: number;
  moves: LichessExplorerMove[];
  topGames: LichessExplorerTopGame[];
  opening: { eco: string; name: string } | null;
}

export async function fetchExplorerData(
  fen: string,
  signal?: AbortSignal
): Promise<LichessExplorerResponse> {
  const cached = explorerCache.get<LichessExplorerResponse>(fen);
  if (cached) return cached;

  const url = `${BASE_URL}?fen=${encodeURIComponent(fen)}&moves=20&topGames=5`;
  const res = await fetch(url, { signal });

  if (!res.ok) {
    throw new Error(`Lichess Explorer HTTP ${res.status}`);
  }

  const data = (await res.json()) as LichessExplorerResponse;
  explorerCache.set(fen, data);
  return data;
}
