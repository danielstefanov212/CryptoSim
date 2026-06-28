import { useEffect, useState } from "react";

import { cryptoAssetsService } from "../services/crypto-assets";
import { TOP_20_CRYPTO_PAIRS } from "../lib/constants/crypto-pairs";

export function useActiveCryptoSymbols(): string[] {
  const [symbols, setSymbols] = useState<string[]>(TOP_20_CRYPTO_PAIRS);
  useEffect(() => {
    cryptoAssetsService
      .list()
      .then((assets) => {
        const list = assets
          .filter((a) => a.isActive)
          .map((a) => a.symbol)
          .sort();
        if (list.length > 0) setSymbols(list);
      })
      .catch(() => {
      });
  }, []);

  return symbols;
}
