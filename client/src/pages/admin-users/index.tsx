import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";

import Button from "../../components/button";
import LoadingSpinner from "../../components/loading-spinner";
import { adminUsersService, type AdminUser } from "../../services/admin-users";

import { formatCurrency, formatDate } from "../../lib/formatters";

import styles from "./styles.module.css";

export function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(await adminUsersService.list());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggleRole = async (u: AdminUser) => {
    const newRole = u.role === "ADMIN" ? "TRADER" : "ADMIN";
    if (!window.confirm(`Change ${u.email} role to ${newRole}?`)) return;
    try {
      await adminUsersService.update(u.id, { role: newRole });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  };

  const remove = async (u: AdminUser) => {
    if (!window.confirm(`Delete ${u.email}? This cannot be undone.`)) return;
    try {
      await adminUsersService.delete(u.id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const stats = useMemo(() => {
    const admins = users.filter((u) => u.role === "ADMIN").length;
    const traders = users.length - admins;
    const totalBalance = users.reduce(
      (acc, u) => acc + (Number(u.balance) || 0),
      0,
    );
    return { admins, traders, totalBalance };
  }, [users]);

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Admin · Users</h1>
        <p className={styles.pageSubtitle}>
          Manage trader accounts, change roles, and remove users.
        </p>
      </header>

      {error && (
        <div className={styles.errorAlert} role="alert">
          {error}
        </div>
      )}

      <section className={styles.statsRow}>
        <StatCard label="Total users" value={String(users.length)} />
        <StatCard label="Admins" value={String(stats.admins)} />
        <StatCard label="Traders" value={String(stats.traders)} />
        <StatCard
          label="Combined cash"
          value={formatCurrency(stats.totalBalance, 2)}
        />
      </section>

      <section className={styles.listCard}>
        <header className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>All users</h2>
          <Button variant="secondary" onClick={refresh}>
            Refresh
          </Button>
        </header>

        {loading ? (
          <LoadingSpinner />
        ) : users.length === 0 ? (
          <p className={styles.empty}>No users yet.</p>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Balance</th>
                  <th>Joined</th>
                  <th aria-label="Actions"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td className={styles.emailCell}>{u.email}</td>
                    <td>
                      <span
                        className={clsx(
                          styles.rolePill,
                          u.role === "ADMIN"
                            ? styles.roleAdmin
                            : styles.roleTrader,
                        )}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className={styles.numeric}>
                      {formatCurrency(Number(u.balance), 2)}
                    </td>
                    <td className={styles.dateCell}>
                      {formatDate(u.createdAt)}
                    </td>
                    <td className={styles.actions}>
                      <Button variant="secondary" onClick={() => toggleRole(u)}>
                        {u.role === "ADMIN" ? "Make trader" : "Make admin"}
                      </Button>
                      <Button variant="secondary" onClick={() => remove(u)}>
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.statCard}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
    </div>
  );
}
