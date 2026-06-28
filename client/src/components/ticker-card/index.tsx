import clsx from "clsx";

import { useNavigate } from "react-router-dom";

import { CryptoPriceData } from "../../lib/crypto";
import { formatCurrency } from "../../lib/formatters";

import styles from "./styles.module.css";

interface TickerCardProps {
  symbol: string;
  preview?: boolean;
  data: CryptoPriceData;
  position: number;
}

export function TickerCard({
  symbol,
  data,
  preview = false,
  position,
}: TickerCardProps) {
  const navigate = useNavigate();

  const handleOpen = () => {
    if (preview) return;
    navigate(`/trading/${symbol}`);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (preview) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleOpen();
    }
  };

  const positive = data?.changePct >= 0;

  return (
    <div
      className={clsx(styles.tickerCard, !preview && styles.clickable)}
      role={preview ? undefined : "button"}
      tabIndex={preview ? undefined : 0}
      onClick={handleOpen}
      onKeyDown={handleKey}
    >
      <div className={styles.cardHeader}>
        <div className={styles.symbolBlock}>
          <span className={styles.position}>#{position}</span>
          <span className={styles.symbol}>{symbol}</span>
        </div>
        {data && (
          <span
            className={clsx(
              styles.changeBadge,
              positive ? styles.positive : styles.negative,
            )}
          >
            {positive ? "▲" : "▼"} {Math.abs(data.changePct).toFixed(2)}%
          </span>
        )}
      </div>

      {data ? (
        <>
          <div className={styles.priceRow}>
            <span className={styles.price}>{formatCurrency(data.price)}</span>
            <span
              className={clsx(
                styles.changeAmount,
                positive ? styles.positiveText : styles.negativeText,
              )}
            >
              {positive ? "+" : "−"}
              {formatCurrency(Math.abs(data.change))}
            </span>
          </div>

          <div className={styles.statsRow}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>24h High</span>
              <span className={styles.statValue}>
                {formatCurrency(data.high)}
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>24h Low</span>
              <span className={styles.statValue}>
                {formatCurrency(data.low)}
              </span>
            </div>
          </div>

          {!preview && (
            <span className={styles.openHint}>Click to trade →</span>
          )}
        </>
      ) : (
        <div className={styles.waiting}>Waiting for live data…</div>
      )}
    </div>
  );
}
