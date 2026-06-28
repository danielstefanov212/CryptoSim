import type { Server as SocketIOServer } from 'socket.io';
import { krakenLive, type PriceData } from '../kraken/live-client.js';
import { prisma } from '../db.js';

export async function initPublicNamespace(io: SocketIOServer): Promise<void> {
  const topThree = await prisma.cryptoAsset.findMany({
    where: { isActive: true, displayOrder: { not: null } },
    orderBy: { displayOrder: 'asc' },
    take: 3,
    select: { symbol: true },
  });
  const symbols = topThree.map((a) => a.symbol);
  krakenLive.subscribe(symbols);

  const top3Set = new Set(symbols);

  const ns = io.of('/public');
  ns.on('connection', (socket) => {
    socket.emit('top3', symbols);
  });
  krakenLive.events.on('tick', (symbol: string, priceData: PriceData) => {
    if (top3Set.has(symbol)) ns.emit('price', priceData);
  });
  console.log(`[socket] public namespace listening (top-3: ${symbols.join(', ')})`);
}
