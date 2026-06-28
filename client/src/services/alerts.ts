import httpService from "./http-service";

import type { AlertDirection, PriceAlert } from "../lib/alerts";

export interface CreateAlertInput {
  symbol: string;
  targetPrice: string | number;
  direction: AlertDirection;
}

export interface UpdateAlertInput {
  targetPrice?: string | number;
  direction?: AlertDirection;
  isActive?: boolean;
}

class AlertsService {
  list(): Promise<PriceAlert[]> {
    return httpService.get<PriceAlert[]>("/alerts");
  }

  create(input: CreateAlertInput): Promise<PriceAlert> {
    return httpService.post<PriceAlert>("/alerts", input);
  }

  update(id: string, patch: UpdateAlertInput): Promise<PriceAlert> {
    return httpService.put<PriceAlert>(`/alerts/${id}`, patch);
  }

  remove(id: string): Promise<void> {
    return httpService.delete(`/alerts/${id}`) as Promise<void>;
  }
}

export const alertsService = new AlertsService();
