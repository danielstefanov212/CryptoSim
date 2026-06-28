import type { PrismaClient } from '@prisma/client';

export interface AssetSeed {
  symbol: string;
  krakenPair: string;
  krakenRestPair: string;
  name: string;
  displayOrder?: number;
  description?: string;
}

export const CATALOGUE: AssetSeed[] = [
  { symbol: 'BTC',   krakenPair: 'BTC/USD',  krakenRestPair: 'XBTUSD',   name: 'Bitcoin',   displayOrder: 1, description: 'The first and largest cryptocurrency by market cap.' },
  { symbol: 'ETH',   krakenPair: 'ETH/USD',  krakenRestPair: 'ETHUSD',   name: 'Ethereum',  displayOrder: 2, description: 'Smart-contract platform that introduced programmable on-chain applications.' },
  { symbol: 'SOL',   krakenPair: 'SOL/USD',  krakenRestPair: 'SOLUSD',   name: 'Solana',    displayOrder: 3, description: 'High-throughput proof-of-stake blockchain.' },
  { symbol: 'XRP',   krakenPair: 'XRP/USD',  krakenRestPair: 'XRPUSD',   name: 'XRP' },
  { symbol: 'ADA',   krakenPair: 'ADA/USD',  krakenRestPair: 'ADAUSD',   name: 'Cardano' },
  { symbol: 'DOGE',  krakenPair: 'XDG/USD',  krakenRestPair: 'XDGUSD',   name: 'Dogecoin' },
  { symbol: 'DOT',   krakenPair: 'DOT/USD',  krakenRestPair: 'DOTUSD',   name: 'Polkadot' },
  { symbol: 'AVAX',  krakenPair: 'AVAX/USD', krakenRestPair: 'AVAXUSD',  name: 'Avalanche' },
  { symbol: 'LINK',  krakenPair: 'LINK/USD', krakenRestPair: 'LINKUSD',  name: 'Chainlink' },
  { symbol: 'MATIC', krakenPair: 'MATIC/USD', krakenRestPair: 'MATICUSD', name: 'Polygon' },
  { symbol: 'LTC',   krakenPair: 'LTC/USD',  krakenRestPair: 'XLTCZUSD', name: 'Litecoin' },
  { symbol: 'BCH',   krakenPair: 'BCH/USD',  krakenRestPair: 'BCHUSD',   name: 'Bitcoin Cash' },
  { symbol: 'ATOM',  krakenPair: 'ATOM/USD', krakenRestPair: 'ATOMUSD',  name: 'Cosmos' },
  { symbol: 'UNI',   krakenPair: 'UNI/USD',  krakenRestPair: 'UNIUSD',   name: 'Uniswap' },
  { symbol: 'XLM',   krakenPair: 'XLM/USD',  krakenRestPair: 'XXLMZUSD', name: 'Stellar' },
  { symbol: 'ALGO',  krakenPair: 'ALGO/USD', krakenRestPair: 'ALGOUSD',  name: 'Algorand' },
  { symbol: 'FIL',   krakenPair: 'FIL/USD',  krakenRestPair: 'FILUSD',   name: 'Filecoin' },
  { symbol: 'NEAR',  krakenPair: 'NEAR/USD', krakenRestPair: 'NEARUSD',  name: 'NEAR Protocol' },
  { symbol: 'AAVE',  krakenPair: 'AAVE/USD', krakenRestPair: 'AAVEUSD',  name: 'Aave' },
  { symbol: 'SAND',  krakenPair: 'SAND/USD', krakenRestPair: 'SANDUSD',  name: 'The Sandbox' },
];

export async function seedCatalogue(client: PrismaClient): Promise<{
  inserted: number;
  updated: number;
  total: number;
}> {
  let inserted = 0;
  let updated = 0;

  for (const a of CATALOGUE) {
    const existing = await client.cryptoAsset.findUnique({ where: { symbol: a.symbol } });
    if (existing) {
      if (existing.krakenPair !== a.krakenPair || existing.krakenRestPair !== a.krakenRestPair) {
        await client.cryptoAsset.update({
          where: { symbol: a.symbol },
          data: { krakenPair: a.krakenPair, krakenRestPair: a.krakenRestPair },
        });
        updated += 1;
      }
      continue;
    }
    await client.cryptoAsset.create({
      data: {
        symbol: a.symbol,
        krakenPair: a.krakenPair,
        krakenRestPair: a.krakenRestPair,
        name: a.name,
        description: a.description ?? null,
        displayOrder: a.displayOrder ?? null,
        isActive: true,
      },
    });
    inserted += 1;
  }

  return { inserted, updated, total: CATALOGUE.length };
}
