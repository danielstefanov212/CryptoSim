import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { CryptoPriceData } from "../lib/crypto";
import {
  acquirePrivateSocket,
  getPublicSocket,
  releasePrivateSocket,
} from "../services/socket-service";
import { UserStorage } from "../services/user-storage";
import { useOptionalUser } from "./user-context";

interface CryptoPriceContextType {
  prices: Record<string, CryptoPriceData>;
  loading: boolean;
  error: string | null;
  subscribeToPair: (symbol: string) => void;
  unsubscribeFromPair: (symbol: string) => void;
}

const CryptoPriceContext = createContext<CryptoPriceContextType | undefined>(
  undefined,
);

interface CryptoPriceProviderProps {
  children: ReactNode;
}

const userStorage = new UserStorage();

export function CryptoPriceProvider({ children }: CryptoPriceProviderProps) {
  const user = useOptionalUser();
  const [prices, setPrices] = useState<Record<string, CryptoPriceData>>({});
  const [error, setError] = useState<string | null>(null);
  const refCountsRef = useRef<Map<string, number>>(new Map());
  const privateSocketRef = useRef<ReturnType<typeof acquirePrivateSocket> | null>(null);

  const recordPrice = useCallback((priceData: CryptoPriceData) => {
    setPrices((prev) => ({ ...prev, [priceData.symbol]: priceData }));
  }, []);
  useEffect(() => {
    const publicSocket = getPublicSocket();
    const onPrice = (p: CryptoPriceData) => recordPrice(p);
    const onConnectError = (err: Error) =>
      setError(`Public stream error: ${err.message}`);
    publicSocket.on("price", onPrice);
    publicSocket.on("connect_error", onConnectError);

    return () => {
      publicSocket.off("price", onPrice);
      publicSocket.off("connect_error", onConnectError);
    };
  }, [recordPrice]);
  useEffect(() => {
    if (!user) {
      privateSocketRef.current = null;
      return;
    }
    const token = userStorage.token;
    if (!token) return;

    const sock = acquirePrivateSocket(token);
    privateSocketRef.current = sock;

    const onPrice = (p: CryptoPriceData) => recordPrice(p);
    const onConnect = () => {
      setError(null);
      const symbols = Array.from(refCountsRef.current.keys());
      if (symbols.length > 0) sock.emit("subscribe", symbols);
    };
    const onConnectError = (err: Error) =>
      setError(`Private stream error: ${err.message}`);
    sock.on("price", onPrice);
    sock.on("connect", onConnect);
    sock.on("connect_error", onConnectError);

    return () => {
      sock.off("price", onPrice);
      sock.off("connect", onConnect);
      sock.off("connect_error", onConnectError);
      privateSocketRef.current = null;
      releasePrivateSocket();
    };
  }, [user, recordPrice]);

  const subscribeToPair = useCallback(
    (symbol: string) => {
      const prev = refCountsRef.current.get(symbol) ?? 0;
      refCountsRef.current.set(symbol, prev + 1);
      if (prev === 0 && privateSocketRef.current) {
        privateSocketRef.current.emit("subscribe", [symbol]);
      }
    },
    [],
  );

  const unsubscribeFromPair = useCallback(
    (symbol: string) => {
      const prev = refCountsRef.current.get(symbol) ?? 0;
      if (prev <= 0) return;
      const next = prev - 1;
      if (next === 0) {
        refCountsRef.current.delete(symbol);
        if (privateSocketRef.current) {
          privateSocketRef.current.emit("unsubscribe", [symbol]);
        }
      } else {
        refCountsRef.current.set(symbol, next);
      }
    },
    [],
  );

  const value = useMemo<CryptoPriceContextType>(
    () => ({
      prices,
      loading: false,
      error,
      subscribeToPair,
      unsubscribeFromPair,
    }),
    [prices, error, subscribeToPair, unsubscribeFromPair],
  );

  return (
    <CryptoPriceContext.Provider value={value}>
      {children}
    </CryptoPriceContext.Provider>
  );
}

export function useCryptoPrice() {
  const context = useContext(CryptoPriceContext);
  if (context === undefined) {
    throw new Error("useCryptoPrice must be used within a CryptoPriceProvider");
  }
  return context;
}
