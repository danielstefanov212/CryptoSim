export type AlertDirection = "ABOVE" | "BELOW";

export interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: string;
  direction: AlertDirection;
  isTriggered: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AlertTriggeredPayload {
  id: string;
  symbol: string;
  targetPrice: string;
  direction: AlertDirection;
  triggeredAt: string;
}
