import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { reportsService } from "../../services/reports";
import { useActiveCryptoSymbols } from "../../hooks/use-active-symbols";

import Button from "../../components/button";
import LoadingSpinner from "../../components/loading-spinner";
import Input from "../../components/input";

import type {
  CreateReportTemplateInput,
  ReportTemplate,
} from "../../lib/reports";

import styles from "./styles.module.css";

type RangeKind = "rolling" | "fixed";
type EndMode = "now" | "fixed";

interface FormState {
  name: string;
  symbols: string[];
  rangeKind: RangeKind;
  startDate: string;
  endDate: string;
  endMode: EndMode;
  rollingDays: number;
}

function toLocalInputValue(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const offsetMs = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - offsetMs).toISOString().slice(0, 16);
}

function fromLocalInputValue(local: string): string {
  if (!local) return "";
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

function defaultForm(): FormState {
  return {
    name: "Last 7 days",
    symbols: [],
    rangeKind: "rolling",
    rollingDays: 7,
    startDate: "",
    endDate: "",
    endMode: "now",
  };
}

function formFromTemplate(t: ReportTemplate): FormState {
  const rangeKind: RangeKind = t.rollingDays != null ? "rolling" : "fixed";
  return {
    name: t.name,
    symbols: [...t.symbols],
    rangeKind,
    rollingDays: t.rollingDays ?? 7,
    startDate: t.startDate ?? "",
    endDate: t.endDate ?? "",
    endMode: t.endDate ? "fixed" : "now",
  };
}

function buildPayload(form: FormState): CreateReportTemplateInput {
  const endDate =
    form.endMode === "fixed" && form.endDate ? form.endDate : null;
  if (form.rangeKind === "rolling") {
    return {
      name: form.name,
      symbols: form.symbols,
      startDate: null,
      endDate,
      rollingDays: form.rollingDays,
    };
  }
  return {
    name: form.name,
    symbols: form.symbols,
    startDate: form.startDate || null,
    endDate,
    rollingDays: null,
  };
}

function validateForm(form: FormState): string | null {
  if (!form.name.trim()) return "Template name is required.";
  const now = Date.now();
  if (form.rangeKind === "rolling") {
    if (!Number.isInteger(form.rollingDays) || form.rollingDays <= 0) {
      return "Rolling window must be a positive integer (days).";
    }
    if (form.rollingDays > 3650) {
      return "Rolling window can be at most 3650 days (~10 years).";
    }
  } else {
    if (!form.startDate) return "Start date is required for a fixed window.";
    if (new Date(form.startDate).getTime() > now) {
      return "Start date cannot be in the future.";
    }
    if (form.endMode === "fixed") {
      if (!form.endDate) return "End date is required when 'Fixed end date' is selected.";
      if (new Date(form.endDate).getTime() > now) {
        return "End date cannot be in the future.";
      }
      if (new Date(form.startDate).getTime() >= new Date(form.endDate).getTime()) {
        return "End date must be strictly after start date.";
      }
    }
  }
  return null;
}

function formatTemplateWindow(t: ReportTemplate): string {
  const end = t.endDate ? new Date(t.endDate).toLocaleDateString() : "now";
  if (t.rollingDays != null) {
    return `Last ${t.rollingDays} day${t.rollingDays === 1 ? "" : "s"} → ${end}`;
  }
  const start = t.startDate
    ? new Date(t.startDate).toLocaleDateString()
    : "?";
  return `${start} → ${end}`;
}

export function Reports() {
  const navigate = useNavigate();
  const availableSymbols = useActiveCryptoSymbols();
  const [rows, setRows] = useState<ReportTemplate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const nowLocalMax = toLocalInputValue(new Date().toISOString());

  const refresh = useCallback(async () => {
    setError(null);
    try {
      setRows(await reportsService.list());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports");
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const resetForm = () => {
    setForm(defaultForm());
    setEditingId(null);
  };

  const startEdit = (t: ReportTemplate) => {
    setEditingId(t.id);
    setForm(formFromTemplate(t));
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleSymbol = (sym: string) => {
    setForm((prev) => ({
      ...prev,
      symbols: prev.symbols.includes(sym)
        ? prev.symbols.filter((s) => s !== sym)
        : [...prev.symbols, sym],
    }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = buildPayload(form);
      if (editingId) {
        await reportsService.update(editingId, payload);
      } else {
        await reportsService.create(payload);
      }
      resetForm();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this template?")) return;
    await reportsService.remove(id);
    if (editingId === id) resetForm();
    await refresh();
  };

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Portfolio reports</h1>
        <p className={styles.pageSubtitle}>
          Save reusable report templates and run them whenever you want to see
          how your portfolio performed over time.
        </p>
      </header>

      {error && (
        <div className={styles.errorAlert} role="alert">
          {error}
        </div>
      )}

      <section className={styles.formCard}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>
            {editingId ? "Edit template" : "New template"}
          </h2>
          {editingId && (
            <span className={styles.editingTag}>Editing existing template</span>
          )}
        </div>

        <form onSubmit={submit} className={styles.form}>
          <Input
            label="Template name"
            value={form.name}
            onChange={(v) => setForm((p) => ({ ...p, name: String(v) }))}
            placeholder="e.g. Last 30 days"
            required
          />

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Window type</label>
            <div className={styles.endModeRow}>
              <button
                type="button"
                className={clsx(
                  styles.modePill,
                  form.rangeKind === "rolling" && styles.modePillActive,
                )}
                onClick={() =>
                  setForm((p) => ({ ...p, rangeKind: "rolling" }))
                }
              >
                Rolling (last N days)
              </button>
              <button
                type="button"
                className={clsx(
                  styles.modePill,
                  form.rangeKind === "fixed" && styles.modePillActive,
                )}
                onClick={() => setForm((p) => ({ ...p, rangeKind: "fixed" }))}
              >
                Fixed start date
              </button>
            </div>
            <p className={styles.fieldHint}>
              {form.rangeKind === "rolling"
                ? "The window slides forward over time — re-running tomorrow gives you the most recent N days."
                : "The start date is anchored to a specific moment — useful for tracking how a snapshot of your portfolio evolves."}
            </p>
          </div>

          <div className={styles.dateGrid}>
            {form.rangeKind === "rolling" ? (
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="rolling-days">
                  Days back
                </label>
                <input
                  id="rolling-days"
                  type="number"
                  min={1}
                  max={3650}
                  step={1}
                  value={form.rollingDays}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      rollingDays: Number(e.target.value) || 0,
                    }))
                  }
                  required
                  className={styles.dateInput}
                />
              </div>
            ) : (
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Start date</label>
                <input
                  type="datetime-local"
                  value={toLocalInputValue(form.startDate)}
                  max={nowLocalMax}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      startDate: fromLocalInputValue(e.target.value),
                    }))
                  }
                  required
                  className={styles.dateInput}
                />
              </div>
            )}

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>End date</label>
              <div className={styles.endModeRow}>
                <button
                  type="button"
                  className={clsx(
                    styles.modePill,
                    form.endMode === "now" && styles.modePillActive,
                  )}
                  onClick={() => setForm((p) => ({ ...p, endMode: "now" }))}
                >
                  End now (live)
                </button>
                <button
                  type="button"
                  className={clsx(
                    styles.modePill,
                    form.endMode === "fixed" && styles.modePillActive,
                  )}
                  onClick={() => setForm((p) => ({ ...p, endMode: "fixed" }))}
                >
                  Fixed end date
                </button>
              </div>
              {form.endMode === "fixed" && (
                <input
                  type="datetime-local"
                  value={toLocalInputValue(form.endDate)}
                  max={nowLocalMax}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      endDate: fromLocalInputValue(e.target.value),
                    }))
                  }
                  className={styles.dateInput}
                />
              )}
            </div>
          </div>

          <fieldset className={styles.symbolsFieldset}>
            <legend className={styles.symbolsLegend}>
              Symbols
              <span className={styles.symbolsHint}>
                {form.symbols.length === 0
                  ? "(empty = include all your holdings)"
                  : `(${form.symbols.length} selected)`}
              </span>
            </legend>
            <div className={styles.symbolsGrid}>
              {availableSymbols.map((s) => {
                const active = form.symbols.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSymbol(s)}
                    className={clsx(
                      styles.symbolChip,
                      active && styles.symbolChipActive,
                    )}
                    aria-pressed={active}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className={styles.formActions}>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? editingId
                  ? "Saving..."
                  : "Creating..."
                : editingId
                  ? "Save changes"
                  : "Create template"}
            </Button>
            {editingId && (
              <Button type="button" variant="secondary" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </section>

      <section className={styles.listCard}>
        <header className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Saved templates</h2>
          {rows && (
            <span className={styles.cardCount}>
              {rows.length} {rows.length === 1 ? "template" : "templates"}
            </span>
          )}
        </header>

        {!rows ? (
          <LoadingSpinner />
        ) : rows.length === 0 ? (
          <p className={styles.empty}>
            You haven't saved any report templates yet. Create one above to
            track your portfolio over time.
          </p>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Symbols</th>
                  <th>Window</th>
                  <th>Created</th>
                  <th aria-label="Actions"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className={clsx(editingId === r.id && styles.editingRow)}
                  >
                    <td>
                      <strong>{r.name}</strong>
                      {r.rollingDays != null && (
                        <span className={styles.rollingTag}>rolling</span>
                      )}
                    </td>
                    <td className={styles.symbolsCell}>
                      {r.symbols.length === 0
                        ? "All holdings"
                        : r.symbols.join(", ")}
                    </td>
                    <td className={styles.dateCell}>
                      {formatTemplateWindow(r)}
                    </td>
                    <td className={styles.dateCell}>
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className={styles.actions}>
                      <Button onClick={() => navigate(`/reports/${r.id}`)}>
                        Run
                      </Button>
                      <Button variant="secondary" onClick={() => startEdit(r)}>
                        Edit
                      </Button>
                      <Button variant="secondary" onClick={() => remove(r.id)}>
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
