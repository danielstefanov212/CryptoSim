import httpService from "./http-service";

import type { WatchlistEntry } from "../lib/watchlist";

class WatchlistService {
  list(): Promise<WatchlistEntry[]> {
    return httpService.get<WatchlistEntry[]>("/watchlist");
  }

  add(symbol: string, notes?: string): Promise<WatchlistEntry> {
    return httpService.post<WatchlistEntry>("/watchlist", { symbol, notes });
  }

  updateNotes(id: string, notes: string | null): Promise<WatchlistEntry> {
    return httpService.put<WatchlistEntry>(`/watchlist/${id}`, { notes });
  }

  remove(id: string): Promise<void> {
    return httpService.delete(`/watchlist/${id}`) as Promise<void>;
  }
}

export const watchlistService = new WatchlistService();
