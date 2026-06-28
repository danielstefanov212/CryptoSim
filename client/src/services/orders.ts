import httpService from "./http-service";

import { Order } from "../lib/orders";

class OrdersService {
  async buy(amount: number, symbol: string): Promise<Order> {
    return await httpService.post("/orders/buy", {
      amount,
      symbol,
    });
  }

  async sell(amount: number, symbol: string): Promise<Order> {
    return await httpService.post("/orders/sell", {
      amount,
      symbol,
    });
  }

  async getOrders(symbol?: string): Promise<Order[]> {
    let orders: Order[] = [];
    if (!symbol) {
      orders = await httpService.get("/orders");
    } else {
      orders = await httpService.get("/orders", {
        symbol,
      });
    }

    return orders;
  }
}

export const ordersService = new OrdersService();
