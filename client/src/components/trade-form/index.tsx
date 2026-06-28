import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";

import Button from "../button";

import { formatCurrency, formatDecimal } from "../../lib/formatters";

import styles from "./styles.module.css";

export type TradeMode = "BUY" | "SELL";

interface TradeFormProps {
  symbol: string;
  currentPrice: number;
  cashBalance: number;
  holding: number;
  onTrade: (mode: TradeMode, amount: number) => Promise<void>;
}

function floorTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.floor(value * factor) / factor;
}

export function TradeForm({
  symbol,
  currentPrice,
  cashBalance,
  holding,
  onTrade,
}: TradeFormProps) {
  const [mode, setMode] = useState<TradeMode>("BUY");
  const [amountStr, setAmountStr] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const amount = useMemo(() => {
    const n = Number(amountStr);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [amountStr]);

  const maxBuy =
    currentPrice > 0 ? floorTo(cashBalance / currentPrice, 8) : 0;
  const maxAmount = mode === "BUY" ? maxBuy : holding;

  const totalValue = amount * currentPrice;

  const overLimit = amount > maxAmount + 1e-12;
  const isValid = amount > 0 && !overLimit;
  useEffect(() => {
    if (amountStr !== "" || mode) setSuccess(null);
  }, [amountStr, mode]);

  const setAmountFromPct = (pct: number) => {
    if (maxAmount <= 0) {
      setError(
        mode === "BUY"
          ? "Your cash balance is 0 — no buying power yet."
          : `You don't hold any ${symbol} to sell.`,
      );
      return;
    }
    const computed = floorTo(maxAmount * pct, 8);
    setAmountStr(computed > 0 ? computed.toString() : "");
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (amount <= 0) {
      setError("Enter an amount greater than 0.");
      return;
    }
    if (overLimit) {
      setError(
        mode === "BUY"
          ? `Insufficient balance — at the current price you can buy at most ${formatDecimal(maxBuy, 8)} ${symbol} (${formatCurrency(cashBalance, 2)} cash).`
          : `Insufficient holding — you only have ${formatDecimal(holding, 8)} ${symbol}.`,
      );
      return;
    }

    setSubmitting(true);
    try {
      await onTrade(mode, amount);
      setSuccess(
        `${mode === "BUY" ? "Bought" : "Sold"} ${formatDecimal(amount, 8)} ${symbol} for ${formatCurrency(totalValue, 2)}.`,
      );
      setAmountStr("");
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : "Trade failed. Please try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className={styles.tradeForm} onSubmit={submit}>
      <div className={styles.tabRow} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "BUY"}
          className={clsx(
            styles.tab,
            mode === "BUY" && styles.tabActiveBuy,
          )}
          onClick={() => {
            setMode("BUY");
            setError(null);
            setSuccess(null);
          }}
        >
          Buy
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "SELL"}
          className={clsx(
            styles.tab,
            mode === "SELL" && styles.tabActiveSell,
          )}
          onClick={() => {
            setMode("SELL");
            setError(null);
            setSuccess(null);
          }}
        >
          Sell
        </button>
      </div>

      <div className={styles.contextRow}>
        {mode === "BUY" ? (
          <>
            <div className={styles.contextItem}>
              <span className={styles.contextLabel}>Cash available</span>
              <span className={styles.contextValue}>
                {formatCurrency(cashBalance, 2)}
              </span>
            </div>
            <div className={styles.contextItem}>
              <span className={styles.contextLabel}>
                Max buy @ {formatCurrency(currentPrice, 2)}
              </span>
              <span className={styles.contextValue}>
                {formatDecimal(maxBuy, 8)} {symbol}
              </span>
            </div>
          </>
        ) : (
          <>
            <div className={styles.contextItem}>
              <span className={styles.contextLabel}>You hold</span>
              <span className={styles.contextValue}>
                {formatDecimal(holding, 8)} {symbol}
              </span>
            </div>
            <div className={styles.contextItem}>
              <span className={styles.contextLabel}>Worth</span>
              <span className={styles.contextValue}>
                {formatCurrency(holding * currentPrice, 2)}
              </span>
            </div>
          </>
        )}
      </div>

      <label className={styles.amountField}>
        <span className={styles.amountLabel}>Amount ({symbol})</span>
        <input
          type="number"
          min="0"
          step="0.00000001"
          value={amountStr}
          onChange={(e) => {
            setAmountStr(e.target.value);
            setError(null);
          }}
          placeholder="0.00000000"
          className={clsx(styles.amountInput, overLimit && styles.amountInputError)}
        />
      </label>

      <div className={styles.quickFills}>
        {[0.25, 0.5, 0.75, 1].map((pct) => (
          <button
            key={pct}
            type="button"
            className={styles.quickFill}
            onClick={() => setAmountFromPct(pct)}
            disabled={maxAmount <= 0}
          >
            {pct === 1 ? "Max" : `${pct * 100}%`}
          </button>
        ))}
      </div>

      <div className={styles.previewBlock}>
        <div className={styles.previewRow}>
          <span>Order total</span>
          <strong>{formatCurrency(totalValue, 2)}</strong>
        </div>
        <div className={styles.previewRow}>
          <span>{mode === "BUY" ? "Cash after" : "Holding after"}</span>
          <strong>
            {mode === "BUY"
              ? formatCurrency(Math.max(0, cashBalance - totalValue), 2)
              : `${formatDecimal(Math.max(0, holding - amount), 8)} ${symbol}`}
          </strong>
        </div>
      </div>

      {error && (
        <div className={styles.errorAlert} role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className={styles.successAlert} role="status">
          {success}
        </div>
      )}

      <Button
        type="submit"
        disabled={submitting || !isValid}
        className={clsx(
          styles.submitButton,
          mode === "BUY" ? styles.submitBuy : styles.submitSell,
        )}
      >
        {submitting
          ? "Placing order..."
          : `${mode === "BUY" ? "Buy" : "Sell"} ${
              amount > 0 ? formatDecimal(amount, 8) : "0"
            } ${symbol}`}
      </Button>
    </form>
  );
}
