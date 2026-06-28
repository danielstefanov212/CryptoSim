import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useCryptoPrice } from "../../contexts/crypto-price-context";

import { watchlistService } from "../../services/watchlist";
import { useActiveCryptoSymbols } from "../../hooks/use-active-symbols";
import { formatCurrency } from "../../lib/formatters";

import Button from "../../components/button";
import LoadingSpinner from "../../components/loading-spinner";
import Input from "../../components/input";

import type { WatchlistEntry } from "../../lib/watchlist";

import styles from "./styles.module.css";

export function Watchlist() {
  const symbols = useActiveCryptoSymbols();
  const [rows, setRows] = useState<WatchlistEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newSymbol, setNewSymbol] = useState<string>(symbols[0]!);
  const [newNotes, setNewNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const { prices, subscribeToPair, unsubscribeFromPair } = useCryptoPrice();
  useEffect(() => {
    if (symbols.length > 0 && !symbols.includes(newSymbol)) {
      setNewSymbol(symbols[0]!);
    }
  }, [symbols, newSymbol]);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      setRows(await watchlistService.list());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load watchlist");
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (!rows) return;
    const symbols = rows.map((r) => r.symbol);
    symbols.forEach(subscribeToPair);
    return () => {
      symbols.forEach(unsubscribeFromPair);
    };
  }, [rows, subscribeToPair, unsubscribeFromPair]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await watchlistService.add(newSymbol, newNotes || undefined);
      setNewNotes("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Remove this symbol from your watchlist?")) return;
    await watchlistService.remove(id);
    await refresh();
  };

  const saveNotes = async (id: string, notes: string) => {
    await watchlistService.updateNotes(id, notes || null);
    await refresh();
  };

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Watchlist</h1>
        <p className={styles.pageSubtitle}>
          Symbols you're keeping an eye on. Live prices update automatically.
        </p>
      </header>

      {error && (
        <div className={styles.errorAlert} role="alert">
          {error}
        </div>
      )}

      <section className={styles.formCard}>
        <h2 className={styles.cardTitle}>Add a symbol</h2>
        <form onSubmit={add} className={styles.addForm}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Symbol</label>
            <select
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value)}
              className={styles.select}
            >
              {symbols.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.fieldGrow}>
            <Input
              label="Notes (optional)"
              placeholder="e.g. waiting for breakout above 50k"
              value={newNotes}
              onChange={(v) => setNewNotes(String(v))}
            />
          </div>
          <Button
            type="submit"
            disabled={submitting}
            className={styles.submitButton}
          >
            {submitting ? "Adding..." : "Add to watchlist"}
          </Button>
        </form>
      </section>

      <section className={styles.listCard}>
        <header className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Your watchlist</h2>
          {rows && (
            <span className={styles.cardCount}>
              {rows.length} {rows.length === 1 ? "symbol" : "symbols"}
            </span>
          )}
        </header>

        {!rows ? (
          <LoadingSpinner />
        ) : rows.length === 0 ? (
          <p className={styles.empty}>
            Your watchlist is empty. Pick a symbol above to start watching.
          </p>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Current price</th>
                  <th>24h change</th>
                  <th>Notes</th>
                  <th aria-label="Actions"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const p = prices[r.symbol];
                  const positive = p ? p.changePct >= 0 : false;
                  return (
                    <tr key={r.id}>
                      <td>
                        <Link
                          to={`/trading/${r.symbol}`}
                          className={styles.symbolLink}
                        >
                          {r.symbol}
                        </Link>
                      </td>
                      <td className={styles.numeric}>
                        {p ? formatCurrency(p.price, 2) : "—"}
                      </td>
                      <td>
                        {p ? (
                          <span
                            className={clsx(
                              styles.changeBadge,
                              positive ? styles.positive : styles.negative,
                            )}
                          >
                            {positive ? "▲" : "▼"}{" "}
                            {Math.abs(p.changePct).toFixed(2)}%
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className={styles.notesCell}>
                        <NotesField
                          initial={r.notes ?? ""}
                          onSave={(notes) => saveNotes(r.id, notes)}
                        />
                      </td>
                      <td className={styles.actions}>
                        <Button
                          variant="secondary"
                          onClick={() => remove(r.id)}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

interface NotesFieldProps {
  initial: string;
  onSave: (notes: string) => Promise<void>;
}

function NotesField({ initial, onSave }: NotesFieldProps) {
  const [value, setValue] = useState(initial);
  const dirty = value !== initial;
  return (
    <div className={styles.notesField}>
      <Input
        value={value}
        onChange={(v) => setValue(String(v))}
        placeholder="Add a note…"
      />
      {dirty && (
        <Button variant="secondary" onClick={() => onSave(value)}>
          Save
        </Button>
      )}
    </div>
  );
}
