import clsx from "clsx";

import { CryptoPriceData } from "../../lib/crypto";
import { CryptoAsset } from "../../lib/crypto-assets";
import { formatCurrency } from "../../lib/formatters";

import styles from "./styles.module.css";

interface DetailsCryptoCardProps {
  data: CryptoPriceData;
  asset?: CryptoAsset;
}

export function DetailsCryptoCard({ data, asset }: DetailsCryptoCardProps) {
  const positive = data.changePct >= 0;

  const span = data.high - data.low;
  const rawPosition = span > 0 ? ((data.price - data.low) / span) * 100 : 50;
  const position = Math.max(0, Math.min(100, rawPosition));

  return (
    <section className={styles.priceCard}>
      <header className={styles.assetHeader}>
        {asset?.imageUrl && (
          <img
            src={asset.imageUrl}
            alt={`${asset.name} logo`}
            className={styles.icon}
          />
        )}
        <div className={styles.assetIdentity}>
          <h2 className={styles.assetName}>{asset?.name ?? data.symbol}</h2>
          <span className={styles.assetSymbol}>{data.symbol}</span>
        </div>
      </header>

      {asset?.description && (
        <p className={styles.description}>{asset.description}</p>
      )}

      <div className={styles.priceBlock}>
        <span className={styles.priceLabel}>Current Price</span>
        <div className={styles.price}>{formatCurrency(data.price)}</div>
        <div
          className={clsx(
            styles.changeBadge,
            positive ? styles.positive : styles.negative,
          )}
        >
          <span className={styles.arrow}>{positive ? "▲" : "▼"}</span>
          <span>{Math.abs(data.changePct).toFixed(2)}%</span>
          <span className={styles.changeAmount}>
            ({positive ? "+" : "−"}
            {formatCurrency(Math.abs(data.change))})
          </span>
        </div>
      </div>

      <div className={styles.rangeBlock}>
        <div className={styles.rangeHeader}>
          <span>24h range</span>
          <span className={styles.rangeBoundsInline}>
            {formatCurrency(data.low)} – {formatCurrency(data.high)}
          </span>
        </div>
        <div
          className={styles.rangeBar}
          role="img"
          aria-label={`Current price ${formatCurrency(data.price)} sits ${position.toFixed(0)}% of the way between today's low and high`}
        >
          <div className={styles.rangeFill} style={{ width: `${position}%` }} />
          <div
            className={styles.rangeMarker}
            style={{ left: `${position}%` }}
          />
        </div>
        <div className={styles.rangeBounds}>
          <span>Low {formatCurrency(data.low)}</span>
          <span>High {formatCurrency(data.high)}</span>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>24h High</span>
          <span className={styles.statValue}>{formatCurrency(data.high)}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>24h Low</span>
          <span className={styles.statValue}>{formatCurrency(data.low)}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>24h Δ</span>
          <span
            className={clsx(
              styles.statValue,
              positive ? styles.statPositive : styles.statNegative,
            )}
          >
            {positive ? "+" : "−"}
            {formatCurrency(Math.abs(data.change))}
          </span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>24h Δ%</span>
          <span
            className={clsx(
              styles.statValue,
              positive ? styles.statPositive : styles.statNegative,
            )}
          >
            {positive ? "+" : "−"}
            {Math.abs(data.changePct).toFixed(2)}%
          </span>
        </div>
      </div>
    </section>
  );
}
