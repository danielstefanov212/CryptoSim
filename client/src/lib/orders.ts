export type Order = {
  id: string;
  symbol: string;
  amount: string;
  priceAtExecution: string;
  totalCost: string;
  orderType: OrderType;
  createdAt: string;
};

export type OrderType = "BUY" | "SELL";
