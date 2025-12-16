import { Game } from '../types';
import { games as fallbackGames } from '../data/games';

export async function fetchGames(): Promise<Game[]> {
  try {
    const res = await fetch('/api/games');
    if (!res.ok) {
      return fallbackGames;
    }
    const data = await res.json();
    if (Array.isArray(data.games)) {
      return data.games as Game[];
    }
    return fallbackGames;
  } catch {
    return fallbackGames;
  }
}
