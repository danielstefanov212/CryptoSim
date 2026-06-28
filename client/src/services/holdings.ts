import { Holding } from "../lib/holding";
import httpService from "./http-service";

class HoldingsService {
  async getHoldingForSymbol(symbol: string): Promise<number> {
    const result = await httpService.get<Holding | null>("/holdings", {
      symbol,
    });

    return result ? Number(result.amount) : 0;
  }

  async getHoldings(): Promise<Holding[]> {
    return await httpService.get<Holding[]>("/holdings");
  }
}

export const holdingsService = new HoldingsService();
