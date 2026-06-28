import { EventEmitter } from 'node:events';
import { Prisma, type PriceAlert } from '@prisma/client';

import { prisma } from '../db.js';
import { krakenLive, type PriceData } from '../kraken/live-client.js';

interface IndexedAlert {
  id: string;
  userId: string;
  symbol: string;
  targetPrice: Prisma.Decimal;
  direction: 'ABOVE' | 'BELOW';
}

export interface AlertTriggeredEvent {
  userId: string;
  alert: PriceAlert;
}

function toIndexed(a: PriceAlert): IndexedAlert {
  return {
    id: a.id,
    userId: a.userId,
    symbol: a.symbol,
    targetPrice: a.targetPrice,
    direction: a.direction,
  };
}

export class AlertEngine {
  readonly events = new EventEmitter();
  private index = new Map<string, IndexedAlert[]>();
  private started = false;

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    const rows = await prisma.priceAlert.findMany({
      where: { isActive: true, isTriggered: false },
    });
    for (const row of rows) {
      this.addToIndex(toIndexed(row));
    }

    const symbols = Array.from(this.index.keys());
    if (symbols.length > 0) krakenLive.subscribe(symbols);
    krakenLive.events.on('tick', this.onTick);
    console.log(`[alert-engine] started (${rows.length} active alerts across ${symbols.length} symbols)`);
  }

  stop(): void {
    krakenLive.events.off('tick', this.onTick);
    this.index.clear();
    this.started = false;
  }

  async refreshAlert(id: string): Promise<void> {
    const row = await prisma.priceAlert.findUnique({ where: { id } });
    const existing = this.findInIndex(id);

    if (!row || !row.isActive || row.isTriggered) {
      if (existing) {
        const removed = this.removeFromIndex(existing.symbol, id);
        if (removed && !this.hasOtherAlertsForSymbol(existing.symbol)) {
          krakenLive.unsubscribe([existing.symbol]);
        }
      }
      return;
    }

    const wasIndexed = existing !== null;
    if (existing && existing.symbol !== row.symbol) {
      const removed = this.removeFromIndex(existing.symbol, id);
      if (removed && !this.hasOtherAlertsForSymbol(existing.symbol)) {
        krakenLive.unsubscribe([existing.symbol]);
      }
    } else if (existing) {
      this.removeFromIndex(existing.symbol, id);
    }
    this.addToIndex(toIndexed(row));
    if (!wasIndexed || (existing && existing.symbol !== row.symbol)) {
      krakenLive.subscribe([row.symbol]);
    }
  }

  purgeUser(userId: string): void {
    const symbolsTouched = new Set<string>();
    for (const [symbol, list] of this.index) {
      const filtered = list.filter((a) => a.userId !== userId);
      if (filtered.length === list.length) continue;
      symbolsTouched.add(symbol);
      const removedCount = list.length - filtered.length;
      if (filtered.length === 0) {
        this.index.delete(symbol);
      } else {
        this.index.set(symbol, filtered);
      }
      for (let i = 0; i < removedCount; i++) {
        krakenLive.unsubscribe([symbol]);
      }
    }
    if (symbolsTouched.size > 0) {
      console.log(`[alert-engine] purged user ${userId} from ${symbolsTouched.size} symbols`);
    }
  }

  private addToIndex(a: IndexedAlert): void {
    const list = this.index.get(a.symbol) ?? [];
    list.push(a);
    this.index.set(a.symbol, list);
  }

  private removeFromIndex(symbol: string, id: string): boolean {
    const list = this.index.get(symbol);
    if (!list) return false;
    const filtered = list.filter((a) => a.id !== id);
    if (filtered.length === list.length) return false;
    if (filtered.length === 0) {
      this.index.delete(symbol);
    } else {
      this.index.set(symbol, filtered);
    }
    return true;
  }

  private findInIndex(id: string): IndexedAlert | null {
    for (const list of this.index.values()) {
      const found = list.find((a) => a.id === id);
      if (found) return found;
    }
    return null;
  }

  private hasOtherAlertsForSymbol(symbol: string): boolean {
    const list = this.index.get(symbol);
    return !!(list && list.length > 0);
  }

  private onTick = (symbol: string, priceData: PriceData): void => {
    const list = this.index.get(symbol);
    if (!list || list.length === 0) return;
    const price = new Prisma.Decimal(priceData.price.toString());

    for (const alert of [...list]) {
      const fires =
        (alert.direction === 'ABOVE' && price.gte(alert.targetPrice)) ||
        (alert.direction === 'BELOW' && price.lte(alert.targetPrice));
      if (!fires) continue;
      void this.fire(alert);
    }
  };
  private async fire(alert: IndexedAlert): Promise<void> {
    try {
      const updated = await prisma.priceAlert.updateMany({
        where: { id: alert.id, isTriggered: false, isActive: true },
        data: { isTriggered: true },
      });
      if (updated.count === 0) return;

      const removed = this.removeFromIndex(alert.symbol, alert.id);
      if (removed && !this.hasOtherAlertsForSymbol(alert.symbol)) {
        krakenLive.unsubscribe([alert.symbol]);
      }

      const fresh = await prisma.priceAlert.findUnique({ where: { id: alert.id } });
      if (fresh) {
        this.events.emit('triggered', {
          userId: alert.userId,
          alert: fresh,
        } satisfies AlertTriggeredEvent);
      }
    } catch (err) {
      console.warn('[alert-engine] failed to fire alert', alert.id, err);
    }
  }
}

export const alertEngine = new AlertEngine();
