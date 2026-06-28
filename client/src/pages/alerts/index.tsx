import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { alertsService } from "../../services/alerts";
import { useActiveCryptoSymbols } from "../../hooks/use-active-symbols";
import { useNotificationPermission } from "../../hooks/use-browser-notifications";

import Button from "../../components/button";
import LoadingSpinner from "../../components/loading-spinner";
import Input from "../../components/input";

import type { AlertDirection, PriceAlert } from "../../lib/alerts";
import { formatCurrency } from "../../lib/formatters";

import styles from "./styles.module.css";

export function Alerts() {
  const symbols = useActiveCryptoSymbols();
  const notifications = useNotificationPermission();
  const [rows, setRows] = useState<PriceAlert[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [symbol, setSymbol] = useState<string>(symbols[0]!);
  const [targetPrice, setTargetPrice] = useState<string>("");
  const [direction, setDirection] = useState<AlertDirection>("ABOVE");
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    if (symbols.length > 0 && !symbols.includes(symbol)) {
      setSymbol(symbols[0]!);
    }
  }, [symbols, symbol]);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      setRows(await alertsService.list());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load alerts");
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPrice) {
      setError("Target price is required");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await alertsService.create({ symbol, targetPrice, direction });
      setTargetPrice("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create alert");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (a: PriceAlert) => {
    await alertsService.update(a.id, { isActive: !a.isActive });
    await refresh();
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this alert?")) return;
    await alertsService.remove(id);
    await refresh();
  };

  const summary = rows
    ? {
        watching: rows.filter((a) => a.isActive && !a.isTriggered).length,
        triggered: rows.filter((a) => a.isTriggered).length,
        paused: rows.filter((a) => !a.isActive && !a.isTriggered).length,
      }
    : null;

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Price alerts</h1>
        <p className={styles.pageSubtitle}>
          Get notified the moment a price crosses your target. Browser
          notifications fire even when this tab is in the background.
        </p>
      </header>

      <NotificationBanner
        permission={notifications.permission}
        onEnable={() => void notifications.requestPermission()}
      />

      {error && (
        <div className={styles.errorAlert} role="alert">
          {error}
        </div>
      )}

      <section className={styles.formCard}>
        <h2 className={styles.cardTitle}>Create an alert</h2>
        <form onSubmit={add} className={styles.addForm}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Symbol</label>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className={styles.select}
            >
              {symbols.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Direction</label>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as AlertDirection)}
              className={styles.select}
            >
              <option value="ABOVE">Rises above</option>
              <option value="BELOW">Drops below</option>
            </select>
          </div>

          <div className={styles.fieldGrow}>
            <Input
              label="Target price (USD)"
              type="number"
              placeholder="e.g. 65000"
              min={0}
              step="0.01"
              value={targetPrice}
              onChange={(v) => setTargetPrice(String(v))}
            />
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className={styles.submitButton}
          >
            {submitting ? "Saving..." : "Create alert"}
          </Button>
        </form>
      </section>

      <section className={styles.listCard}>
        <header className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Your alerts</h2>
          {summary && (
            <div className={styles.summaryRow}>
              <span className={`${styles.summaryPill} ${styles.summaryWatching}`}>
                {summary.watching} watching
              </span>
              <span
                className={`${styles.summaryPill} ${styles.summaryTriggered}`}
              >
                {summary.triggered} triggered
              </span>
              <span className={`${styles.summaryPill} ${styles.summaryPaused}`}>
                {summary.paused} paused
              </span>
            </div>
          )}
        </header>

        {!rows ? (
          <LoadingSpinner />
        ) : rows.length === 0 ? (
          <p className={styles.empty}>
            You haven't created any alerts yet. Use the form above to set your
            first price target.
          </p>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Condition</th>
                  <th>Target</th>
                  <th>Status</th>
                  <th aria-label="Actions"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr
                    key={a.id}
                    className={clsx(
                      a.isTriggered && styles.rowTriggered,
                      !a.isActive && !a.isTriggered && styles.rowInactive,
                    )}
                  >
                    <td>
                      <Link
                        to={`/trading/${a.symbol}`}
                        className={styles.symbolLink}
                      >
                        {a.symbol}
                      </Link>
                    </td>
                    <td>
                      {a.direction === "ABOVE" ? "Rises above" : "Drops below"}
                    </td>
                    <td className={styles.numeric}>
                      {formatCurrency(Number(a.targetPrice), 2)}
                    </td>
                    <td>
                      <StatusPill
                        triggered={a.isTriggered}
                        active={a.isActive}
                      />
                    </td>
                    <td className={styles.actions}>
                      {!a.isTriggered && (
                        <Button
                          variant="secondary"
                          onClick={() => toggleActive(a)}
                        >
                          {a.isActive ? "Pause" : "Resume"}
                        </Button>
                      )}
                      <Button variant="secondary" onClick={() => remove(a.id)}>
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function NotificationBanner({
  permission,
  onEnable,
}: {
  permission: "unsupported" | "default" | "granted" | "denied";
  onEnable: () => void;
}) {
  if (permission === "granted") return null;
  if (permission === "unsupported") {
    return (
      <div className={`${styles.notifBanner} ${styles.notifBannerWarn}`}>
        <span>
          Your browser doesn't support desktop notifications. You'll see
          in-page toasts instead.
        </span>
      </div>
    );
  }
  if (permission === "denied") {
    return (
      <div className={`${styles.notifBanner} ${styles.notifBannerWarn}`}>
        <span>
          Desktop notifications are blocked for this site. To re-enable them,
          open your browser's site settings (the lock/info icon in the address
          bar) and allow notifications, then refresh the page. macOS users
          also need to allow notifications for the browser itself in System
          Settings → Notifications.
        </span>
      </div>
    );
  }
  return (
    <div className={`${styles.notifBanner} ${styles.notifBannerInfo}`}>
      <span>
        Get a desktop popup the moment a price target is hit — even when this
        tab isn't focused.
      </span>
      <Button onClick={onEnable}>Enable browser notifications</Button>
    </div>
  );
}

function StatusPill({
  triggered,
  active,
}: {
  triggered: boolean;
  active: boolean;
}) {
  if (triggered) {
    return (
      <span className={`${styles.statusPill} ${styles.statusTriggered}`}>
        🔔 Triggered
      </span>
    );
  }
  if (active) {
    return (
      <span className={`${styles.statusPill} ${styles.statusWatching}`}>
        Watching
      </span>
    );
  }
  return (
    <span className={`${styles.statusPill} ${styles.statusPaused}`}>
      Paused
    </span>
  );
}
