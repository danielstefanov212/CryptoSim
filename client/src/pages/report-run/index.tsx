import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Line } from "react-chartjs-2";

import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";

import { reportsService } from "../../services/reports";

import Button from "../../components/button";
import LoadingSpinner from "../../components/loading-spinner";

import type { ReportRunResponse } from "../../lib/reports";
import { formatCurrency } from "../../lib/formatters";

import styles from "./styles.module.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

export function ReportRun() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [run, setRun] = useState<ReportRunResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      setRun(await reportsService.run(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run report");
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);

  const downloadPdf = async () => {
    if (!id || !run) return;
    setDownloading(true);
    try {
      await reportsService.downloadPdf(id, `${run.template.name}.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF download failed");
    } finally {
      setDownloading(false);
    }
  };

  const summary = useMemo(() => {
    if (!run) return null;

    const priced = run.points.filter(
      (p): p is { t: string; value: string } => p.value !== null,
    );
    if (priced.length === 0) return null;
    const numbers = priced.map((p) => Number(p.value));
    const first = numbers[0]!;
    const last = numbers[numbers.length - 1]!;
    const change = last - first;
    const changePct = first === 0 ? 0 : (change / first) * 100;
    const peak = numbers.reduce((acc, v) => (v > acc ? v : acc), first);
    const trough = numbers.reduce((acc, v) => (v < acc ? v : acc), first);
    return { first, last, change, changePct, peak, trough };
  }, [run]);

  if (error) {
    return (
      <div className={styles.container}>
        <Button onClick={() => navigate("/reports")}>← Back to reports</Button>
        <div className={styles.errorAlert} role="alert">
          {error}
        </div>
      </div>
    );
  }

  if (!run) return <LoadingSpinner />;

  const positive = summary ? summary.change >= 0 : true;
  const windowSummary = formatRunWindow(run);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Button onClick={() => navigate("/reports")}>← Back to reports</Button>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>{run.template.name}</h1>
          <p className={styles.subtitle}>Portfolio value over time</p>
        </div>
        <div className={styles.headerActions}>
          <Button variant="secondary" onClick={load}>
            Re-run
          </Button>
          <Button onClick={downloadPdf} disabled={downloading}>
            {downloading ? "Generating PDF..." : "Export PDF"}
          </Button>
        </div>
      </header>

      {summary ? (
        <section className={styles.statsRow}>
          <SummaryCard
            label="Start value"
            value={formatCurrency(summary.first, 2)}
          />
          <SummaryCard
            label="End value"
            value={formatCurrency(summary.last, 2)}
          />
          <SummaryCard
            label="Change"
            value={`${positive ? "+" : "−"}${formatCurrency(Math.abs(summary.change), 2)}`}
            secondary={`${positive ? "+" : "−"}${Math.abs(summary.changePct).toFixed(2)}%`}
            tone={positive ? "positive" : "negative"}
          />
          <SummaryCard label="Peak" value={formatCurrency(summary.peak, 2)} />
          <SummaryCard
            label="Trough"
            value={formatCurrency(summary.trough, 2)}
          />
        </section>
      ) : (
        <section className={styles.statsRow}>
          <div className={styles.emptyStat}>
            No priced data points in this window — see the warnings below for
            details.
          </div>
        </section>
      )}

      <section className={styles.metaCard}>
        <MetaItem label="Window" value={windowSummary} />
        <MetaItem
          label="Granularity"
          value={
            run.window.clamped && run.window.effectiveGranularity
              ? `${run.window.granularity} (clamped to ${run.window.effectiveGranularity})`
              : run.window.granularity
          }
        />
        <MetaItem
          label="Symbols"
          value={
            run.template.symbols.length > 0
              ? run.template.symbols.join(", ")
              : "All your holdings"
          }
        />
        {run.template.rollingDays != null && (
          <MetaItem
            label="Range type"
            value={`Rolling — last ${run.template.rollingDays} day${run.template.rollingDays === 1 ? "" : "s"}`}
          />
        )}
        {run.inactiveSymbols.length > 0 && (
          <MetaItem
            label="Inactive symbols"
            value={`${run.inactiveSymbols.join(", ")} — these symbols are no longer in the active catalogue and were excluded from the chart`}
            warn
          />
        )}
        {run.dataGaps.length > 0 && (
          <MetaItem
            label="Data gaps"
            value={run.dataGaps
              .map((g) =>
                g.reason === "fetch_failed"
                  ? `${g.symbol} (couldn't fetch from Kraken)`
                  : `${g.symbol} before ${new Date(g.gapBefore).toLocaleDateString()}`,
              )
              .join("; ")}
            warn
          />
        )}
      </section>

      <section className={styles.chartCard}>
        <h2 className={styles.cardTitle}>Portfolio value (USD)</h2>
        <div className={styles.chartWrapper}>
          <Line
            data={{
              labels: run.points.map((p) => new Date(p.t).toLocaleString()),
              datasets: [
                {
                  label: "Portfolio value (USD)",

                  data: run.points.map((p) =>
                    p.value === null ? null : Number(p.value),
                  ),
                  borderColor: "rgb(34, 130, 240)",
                  backgroundColor: "rgba(34, 130, 240, 0.18)",
                  fill: true,
                  tension: 0.25,
                  pointRadius: 0,
                  borderWidth: 2,
                  spanGaps: false,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: true, position: "bottom" },
                title: { display: false },
              },
              scales: {
                y: {
                  beginAtZero: false,
                  title: { display: true, text: "USD" },
                },
                x: { ticks: { maxTicksLimit: 12, maxRotation: 0 } },
              },
            }}
          />
        </div>
      </section>
    </div>
  );
}

function formatRunWindow(run: ReportRunResponse): string {
  const start = new Date(run.window.start).toLocaleString();
  const end = new Date(run.window.end).toLocaleString();
  if (run.template.rollingDays != null) {
    return `${start} → ${end} (rolling, last ${run.template.rollingDays} day${run.template.rollingDays === 1 ? "" : "s"})`;
  }
  return `${start} → ${end}`;
}

function SummaryCard({
  label,
  value,
  secondary,
  tone,
}: {
  label: string;
  value: string;
  secondary?: string;
  tone?: "positive" | "negative";
}) {
  return (
    <div className={styles.summaryCard}>
      <span className={styles.summaryLabel}>{label}</span>
      <span
        className={`${styles.summaryValue} ${tone === "positive" ? styles.tonePositive : tone === "negative" ? styles.toneNegative : ""}`}
      >
        {value}
      </span>
      {secondary && (
        <span
          className={`${styles.summarySecondary} ${tone === "positive" ? styles.tonePositive : tone === "negative" ? styles.toneNegative : ""}`}
        >
          {secondary}
        </span>
      )}
    </div>
  );
}

function MetaItem({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className={`${styles.metaItem} ${warn ? styles.metaItemWarn : ""}`}>
      <span className={styles.metaLabel}>{label}</span>
      <span className={styles.metaValue}>{value}</span>
    </div>
  );
}
