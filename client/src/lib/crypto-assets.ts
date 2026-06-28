export interface CryptoAsset {
  id: string;
  symbol: string;
  name: string;
  krakenPair: string;
  krakenRestPair: string;
  description: string | null;
  imageUrl: string | null;
  displayOrder: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCryptoAssetInput {
  symbol: string;
  name: string;
  krakenPair: string;
  krakenRestPair: string;
  description?: string;
  imageUrl?: string;
  displayOrder?: number;
}

export interface UpdateCryptoAssetInput {
  name?: string;
  krakenPair?: string;
  krakenRestPair?: string;
  description?: string | null;
  imageUrl?: string | null;
  displayOrder?: number | null;
  isActive?: boolean;
}
