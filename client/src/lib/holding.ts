export interface Holding {
  id: string;
  symbol: string;
  amount: string;
  averageBuyPrice: string;
  currentPrice: string | null;
  currentValue: string | null;
  createdAt: string;
  updatedAt: string;
}
