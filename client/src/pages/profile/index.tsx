import { useEffect, useState } from "react";

import { holdingsService } from "../../services/holdings";
import { ordersService } from "../../services/orders";
import { usersService } from "../../services/users";

import { OrdersContainer } from "../../components/orders-container";
import Button from "../../components/button";
import LoadingSpinner from "../../components/loading-spinner";

import { User } from "../../lib/users";
import { Holding } from "../../lib/holding";
import { Order } from "../../lib/orders";
import { formatCurrency } from "../../lib/formatters";

import styles from "./styles.module.css";

const INITIAL_BALANCE = 10_000;

export function Profile() {
  const [user, setUser] = useState<User>();
  const [holdings, setHoldings] = useState<Holding[]>();
  const [orders, setOrders] = useState<Order[]>();
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  useEffect(() => {
    const fetchData = async () => {
      setUser(await usersService.getProfileInfo());
      setHoldings(await holdingsService.getHoldings());
      setOrders(await ordersService.getOrders());
    };

    void fetchData();
  }, [isResetting]);

  const handleReset = async () => {
    if (
      !window.confirm(
        "Reset your account? This deletes all orders/holdings and restores your $10,000 balance.",
      )
    ) {
      return;
    }
    setResetError(null);
    try {
      await usersService.resetUser();
      setIsResetting((prev) => !prev);
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Reset failed");
    }
  };

  if (!user || !holdings || !orders) return <LoadingSpinner />;

  const cashBalance = Number(user.balance);
  const portfolioValue = holdings.reduce(
    (acc, h) => acc + (h.currentValue !== null ? Number(h.currentValue) : 0),
    0,
  );
  const totalEquity = cashBalance + portfolioValue;
  const pnl = totalEquity - INITIAL_BALANCE;
  const pnlPct = (pnl / INITIAL_BALANCE) * 100;
  const positive = pnl >= 0;

  return (
    <div className={styles.profileContainer}>
      <section className={styles.heroCard}>
        <div className={styles.heroLeft}>
          <span className={styles.heroEyebrow}>Total equity</span>
          <h1 className={styles.heroAmount}>
            {formatCurrency(totalEquity, 2)}
          </h1>
          <div
            className={`${styles.pnlBadge} ${
              positive ? styles.pnlPositive : styles.pnlNegative
            }`}
          >
            {positive ? "▲" : "▼"} {positive ? "+" : "−"}
            {formatCurrency(Math.abs(pnl), 2)} ({pnl >= 0 ? "+" : "−"}
            {Math.abs(pnlPct).toFixed(2)}%) vs. starting balance
          </div>
          <p className={styles.heroIdentity}>
            <strong>{user.name}</strong>
            <span className={styles.heroEmail}>· {user.email}</span>
          </p>
        </div>

        <div className={styles.heroActions}>
          <Button
            onClick={handleReset}
            variant="secondary"
            className={styles.resetButton}
          >
            Reset account
          </Button>
          {resetError && (
            <div className={styles.resetError} role="alert">
              {resetError}
            </div>
          )}
        </div>
      </section>

      <section className={styles.statsRow}>
        <StatCard label="Cash balance" value={formatCurrency(cashBalance, 2)} />
        <StatCard label="Crypto value" value={formatCurrency(portfolioValue, 2)} />
        <StatCard label="Holdings" value={String(holdings.length)} />
        <StatCard label="Orders placed" value={String(orders.length)} />
      </section>

      <section className={styles.holdingsCard}>
        <header className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Holdings</h2>
          <span className={styles.cardCount}>
            {holdings.length} {holdings.length === 1 ? "asset" : "assets"}
          </span>
        </header>

        {holdings.length === 0 ? (
          <p className={styles.empty}>
            You don't hold any crypto yet — head over to the Trading page to
            place your first order.
          </p>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.holdingsTable}>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Amount</th>
                  <th>Avg buy</th>
                  <th>Current price</th>
                  <th>Current value</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((holding) => (
                  <tr key={holding.symbol}>
                    <td>
                      <span className={styles.symbolPill}>
                        {holding.symbol}
                      </span>
                    </td>
                    <td>{holding.amount}</td>
                    <td>
                      {formatCurrency(Number(holding.averageBuyPrice), 2)}
                    </td>
                    <td>
                      {holding.currentPrice !== null
                        ? formatCurrency(Number(holding.currentPrice), 2)
                        : "—"}
                    </td>
                    <td>
                      {holding.currentValue !== null
                        ? formatCurrency(Number(holding.currentValue), 2)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <OrdersContainer orders={orders} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.statCard}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
    </div>
  );
}
