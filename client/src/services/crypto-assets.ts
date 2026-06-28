import httpService from "./http-service";

import type {
  CreateCryptoAssetInput,
  CryptoAsset,
  UpdateCryptoAssetInput,
} from "../lib/crypto-assets";

class CryptoAssetsService {
  list(): Promise<CryptoAsset[]> {
    return httpService.get<CryptoAsset[]>("/crypto-assets");
  }

  get(id: string): Promise<CryptoAsset> {
    return httpService.get<CryptoAsset>(`/crypto-assets/${id}`);
  }

  create(input: CreateCryptoAssetInput): Promise<CryptoAsset> {
    return httpService.post<CryptoAsset>("/crypto-assets", input);
  }

  update(id: string, patch: UpdateCryptoAssetInput): Promise<CryptoAsset> {
    return httpService.put<CryptoAsset>(`/crypto-assets/${id}`, patch);
  }

  deactivate(id: string): Promise<CryptoAsset> {
    return httpService.delete(`/crypto-assets/${id}`) as Promise<CryptoAsset>;
  }
}

export const cryptoAssetsService = new CryptoAssetsService();
