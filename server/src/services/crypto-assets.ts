import { Prisma, type CryptoAsset } from '@prisma/client';

import { prisma } from '../db.js';
import { AppError } from '../lib/errors.js';
import { krakenLive } from '../kraken/live-client.js';
import { removePair, upsertPair } from '../kraken/pair-mapping.js';
import type { CreateAssetBody, UpdateAssetBody } from '../schemas/crypto-assets.js';

export type AssetVisibility = 'active' | 'all';

export async function list(visibility: AssetVisibility): Promise<CryptoAsset[]> {
  return prisma.cryptoAsset.findMany({
    where: visibility === 'active' ? { isActive: true } : undefined,
    orderBy: [{ displayOrder: { sort: 'asc', nulls: 'last' } }, { symbol: 'asc' }],
  });
}

export async function getById(id: string): Promise<CryptoAsset> {
  const asset = await prisma.cryptoAsset.findUnique({ where: { id } });
  if (!asset) throw new AppError('NOT_FOUND', 'Crypto asset not found', 404);
  return asset;
}

export async function getBySymbol(symbol: string): Promise<CryptoAsset> {
  const asset = await prisma.cryptoAsset.findUnique({ where: { symbol } });
  if (!asset) throw new AppError('NOT_FOUND', `Crypto asset ${symbol} not found`, 404);
  return asset;
}

export async function create(input: CreateAssetBody): Promise<CryptoAsset> {
  try {
    const created = await prisma.cryptoAsset.create({
      data: {
        symbol: input.symbol,
        name: input.name,
        krakenPair: input.krakenPair,
        krakenRestPair: input.krakenRestPair,
        description: input.description ?? null,
        imageUrl: input.imageUrl ?? null,
        displayOrder: input.displayOrder ?? null,
        isActive: true,
      },
    });
    upsertPair(created.symbol, created.krakenPair, created.krakenRestPair);
    return created;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new AppError('CONFLICT', 'An asset with this symbol or krakenPair already exists', 409);
    }
    throw err;
  }
}

export async function update(id: string, patch: UpdateAssetBody): Promise<CryptoAsset> {
  const existing = await getById(id);

  const data: Prisma.CryptoAssetUpdateInput = {};
  if (patch.name !== undefined) data.name = patch.name;
  if (patch.krakenPair !== undefined) data.krakenPair = patch.krakenPair;
  if (patch.krakenRestPair !== undefined) data.krakenRestPair = patch.krakenRestPair;
  if (patch.description !== undefined) data.description = patch.description;
  if (patch.imageUrl !== undefined) data.imageUrl = patch.imageUrl;
  if (patch.displayOrder !== undefined) data.displayOrder = patch.displayOrder;
  if (patch.isActive !== undefined) data.isActive = patch.isActive;

  try {
    const updated = await prisma.cryptoAsset.update({ where: { id }, data });

    if (updated.isActive) {
      upsertPair(updated.symbol, updated.krakenPair, updated.krakenRestPair);
    } else if (existing.isActive) {
      removePair(updated.symbol);
      krakenLive.unsubscribe([updated.symbol]);
    }
    return updated;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new AppError('CONFLICT', 'krakenPair already in use by another asset', 409);
    }
    throw err;
  }
}

export async function deactivate(id: string): Promise<CryptoAsset> {
  await getById(id);
  const updated = await prisma.cryptoAsset.update({
    where: { id },
    data: { isActive: false },
  });
  removePair(updated.symbol);
  krakenLive.unsubscribe([updated.symbol]);
  return updated;
}
