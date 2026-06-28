import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useCryptoPrice } from "../../contexts/crypto-price-context";

import { cryptoAssetsService } from "../../services/crypto-assets";
import { holdingsService } from "../../services/holdings";
import { ordersService } from "../../services/orders";
import { usersService } from "../../services/users";

import Button from "../../components/button";
import LoadingSpinner from "../../components/loading-spinner";
import { DetailsCryptoCard } from "../../components/details-crypto-card";
import { OrdersContainer } from "../../components/orders-container";
import { TradeForm, type TradeMode } from "../../components/trade-form";

import type { CryptoAsset } from "../../lib/crypto-assets";
import type { Order } from "../../lib/orders";

import styles from "./styles.module.css";

export function TradingTickerDetailsPage() {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const { prices, subscribeToPair, unsubscribeFromPair } = useCryptoPrice();

  const [orders, setOrders] = useState<Order[]>([]);
  const [holding, setHolding] = useState(0);
  const [cashBalance, setCashBalance] = useState(0);
  const [asset, setAsset] = useState<CryptoAsset | undefined>();
  const [loadError, setLoadError] = useState<string | null>(null);

  const refreshAccountState = useCallback(async () => {
    if (!symbol) return;
    try {
      const [loadedOrders, loadedHolding, profile] = await Promise.all([
        ordersService.getOrders(symbol),
        holdingsService.getHoldingForSymbol(symbol),
        usersService.getProfileInfo(),
      ]);
      setOrders(loadedOrders);
      setHolding(loadedHolding);
      setCashBalance(Number(profile.balance) || 0);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load account state",
      );
    }
  }, [symbol]);
  useEffect(() => {
    void refreshAccountState();
  }, [refreshAccountState]);
  useEffect(() => {
    if (!symbol) return;
    void cryptoAssetsService
      .list()
      .then((list) => setAsset(list.find((a) => a.symbol === symbol)))
      .catch(() => {
      });
  }, [symbol]);
  useEffect(() => {
    if (!symbol) return;
    subscribeToPair(symbol);
    return () => unsubscribeFromPair(symbol);
  }, [symbol, subscribeToPair, unsubscribeFromPair]);

  const onTrade = useCallback(
    async (mode: TradeMode, amount: number) => {
      if (!symbol) throw new Error("Symbol is required");
      const newOrder =
        mode === "BUY"
          ? await ordersService.buy(amount, symbol)
          : await ordersService.sell(amount, symbol);
      setOrders((prev) => [newOrder, ...prev]);
      await refreshAccountState();
    },
    [symbol, refreshAccountState],
  );

  if (!symbol) {
    return (
      <div className={styles.pageContainer}>
        <p className={styles.error}>No symbol provided.</p>
        <Button onClick={() => navigate("/trading")}>← Back</Button>
      </div>
    );
  }

  const priceData = prices[symbol];
  if (!priceData) return <LoadingSpinner />;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <Button onClick={() => navigate("/trading")}>← Back</Button>
        <h1 className={styles.title}>
          {asset?.name ?? symbol}
          {asset?.name && <span className={styles.titleSymbol}>{symbol}</span>}
        </h1>
      </div>

      {loadError && <p className={styles.error}>{loadError}</p>}

      <div className={styles.layout}>
        <div className={styles.leftColumn}>
          <DetailsCryptoCard data={priceData} asset={asset} />
          <OrdersContainer
            orders={orders}
            title={`Your ${symbol} orders`}
            showSymbol={false}
          />
        </div>

        <div className={styles.rightColumn}>
          <TradeForm
            symbol={symbol}
            currentPrice={priceData.price}
            cashBalance={cashBalance}
            holding={holding}
            onTrade={onTrade}
          />
        </div>
      </div>
    </div>
  );
}
