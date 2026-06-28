import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";

import { useOptionalUser } from "../../contexts/user-context";

import styles from "./styles.module.css";

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

const PUBLIC_ITEMS: NavItem[] = [
  { to: "/", label: "Home", end: true },
];

const TRADER_ITEMS: NavItem[] = [
  { to: "/trading", label: "Trading" },
  { to: "/watchlist", label: "Watchlist" },
  { to: "/alerts", label: "Alerts" },
  { to: "/reports", label: "Reports" },
  { to: "/profile", label: "Profile" },
];

const ADMIN_ITEMS: NavItem[] = [
  { to: "/admin/users", label: "Users" },
  { to: "/admin/crypto-assets", label: "Crypto Assets" },
];

interface NavigationMenuProps {
  isUserLoggedIn: boolean;
}

export default function NavigationMenu({ isUserLoggedIn }: NavigationMenuProps) {
  const user = useOptionalUser();
  const isAdmin = user?.role === "ADMIN";

  const items: NavItem[] = isUserLoggedIn
    ? [...PUBLIC_ITEMS, ...TRADER_ITEMS]
    : PUBLIC_ITEMS;

  const [adminOpen, setAdminOpen] = useState(false);
  const adminMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!adminOpen) return;
    const onClickAway = (e: MouseEvent) => {
      if (
        adminMenuRef.current &&
        !adminMenuRef.current.contains(e.target as Node)
      ) {
        setAdminOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, [adminOpen]);

  return (
    <nav className={styles.navigation}>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `${styles.link} ${isActive ? styles.linkActive : ""}`
          }
        >
          {item.label}
        </NavLink>
      ))}

      {isAdmin && (
        <div ref={adminMenuRef} className={styles.adminWrapper}>
          <button
            type="button"
            className={`${styles.link} ${styles.adminToggle} ${adminOpen ? styles.linkActive : ""}`}
            aria-haspopup="menu"
            aria-expanded={adminOpen}
            onClick={() => setAdminOpen((prev) => !prev)}
          >
            Admin <span className={styles.chev}>▾</span>
          </button>
          {adminOpen && (
            <div className={styles.adminMenu} role="menu">
              {ADMIN_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  role="menuitem"
                  className={({ isActive }) =>
                    `${styles.adminMenuItem} ${isActive ? styles.adminMenuItemActive : ""}`
                  }
                  onClick={() => setAdminOpen(false)}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
