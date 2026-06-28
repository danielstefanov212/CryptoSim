import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";

import Button from "../../components/button";
import Input from "../../components/input";
import LoadingSpinner from "../../components/loading-spinner";
import { cryptoAssetsService } from "../../services/crypto-assets";
import type {
  CreateCryptoAssetInput,
  CryptoAsset,
} from "../../lib/crypto-assets";

import styles from "./styles.module.css";

const EMPTY_FORM: CreateCryptoAssetInput = {
  symbol: "",
  name: "",
  krakenPair: "",
  krakenRestPair: "",
};

export function AdminCryptoAssets() {
  const [assets, setAssets] = useState<CryptoAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CreateCryptoAssetInput>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAssets(await cryptoAssetsService.list());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load assets");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const updateForm = <K extends keyof CreateCryptoAssetInput>(
    key: K,
    value: CreateCryptoAssetInput[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await cryptoAssetsService.create(form);
      setForm(EMPTY_FORM);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (a: CryptoAsset) => {
    try {
      await cryptoAssetsService.update(a.id, { isActive: !a.isActive });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  };

  const deactivate = async (a: CryptoAsset) => {
    if (
      !window.confirm(
        `Deactivate ${a.symbol}? Active orders/holdings keep working; new traders can't trade it.`,
      )
    )
      return;
    try {
      await cryptoAssetsService.deactivate(a.id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deactivate failed");
    }
  };

  const activeCount = assets.filter((a) => a.isActive).length;

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Admin · Crypto assets</h1>
        <p className={styles.pageSubtitle}>
          Manage the catalogue of tradable assets and their mapping to Kraken's
          symbol conventions.
        </p>
      </header>

      {error && (
        <div className={styles.errorAlert} role="alert">
          {error}
        </div>
      )}

      <section className={styles.formCard}>
        <h2 className={styles.cardTitle}>Add new asset</h2>
        <form onSubmit={submit} className={styles.form}>
          <div className={styles.grid}>
            <Input
              label="Symbol (e.g. BTC)"
              value={form.symbol}
              onChange={(v) => updateForm("symbol", String(v))}
              required
            />
            <Input
              label="Name"
              value={form.name}
              onChange={(v) => updateForm("name", String(v))}
              required
            />
            <Input
              label="Kraken WebSocket pair (e.g. BTC/USD)"
              value={form.krakenPair}
              onChange={(v) => updateForm("krakenPair", String(v))}
              required
            />
            <Input
              label="Kraken REST pair (e.g. XBTUSD)"
              value={form.krakenRestPair}
              onChange={(v) => updateForm("krakenRestPair", String(v))}
              required
            />
          </div>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Adding..." : "Add asset"}
          </Button>
        </form>
      </section>

      <section className={styles.listCard}>
        <header className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Catalogue</h2>
          <div className={styles.summaryRow}>
            <span className={`${styles.summaryPill} ${styles.summaryActive}`}>
              {activeCount} active
            </span>
            <span className={`${styles.summaryPill} ${styles.summaryInactive}`}>
              {assets.length - activeCount} inactive
            </span>
          </div>
        </header>

        {loading ? (
          <LoadingSpinner />
        ) : assets.length === 0 ? (
          <p className={styles.empty}>No assets in the catalogue yet.</p>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Name</th>
                  <th>WS pair</th>
                  <th>REST pair</th>
                  <th>Order</th>
                  <th>Status</th>
                  <th aria-label="Actions"></th>
                </tr>
              </thead>
              <tbody>
                {assets.map((a) => (
                  <tr
                    key={a.id}
                    className={clsx(!a.isActive && styles.rowInactive)}
                  >
                    <td>
                      <span className={styles.symbolPill}>{a.symbol}</span>
                    </td>
                    <td>{a.name}</td>
                    <td className={styles.monoCell}>{a.krakenPair}</td>
                    <td className={styles.monoCell}>{a.krakenRestPair}</td>
                    <td>{a.displayOrder ?? "—"}</td>
                    <td>
                      <span
                        className={clsx(
                          styles.statusPill,
                          a.isActive
                            ? styles.statusActive
                            : styles.statusInactive,
                        )}
                      >
                        {a.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className={styles.actions}>
                      <Button
                        variant="secondary"
                        onClick={() => toggleActive(a)}
                      >
                        {a.isActive ? "Deactivate" : "Reactivate"}
                      </Button>
                      {a.isActive && (
                        <Button
                          variant="secondary"
                          onClick={() => deactivate(a)}
                        >
                          Soft delete
                        </Button>
                      )}
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
