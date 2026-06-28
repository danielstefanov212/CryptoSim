import { Link, useNavigate } from "react-router-dom";

import { authService } from "../../services/auth-service";
import { useOptionalUser } from "../../contexts/user-context";

import Button from "../button";
import NavigationMenu from "../navigation-menu";
import ThemeSelector from "../theme-selector";

import styles from "./styles.module.css";

export default function Header() {
  const navigate = useNavigate();
  const user = useOptionalUser();

  return (
    <header className={styles.header}>
      <Link to="/" className={styles.brand}>
        <span className={styles.brandMark}>₿</span>
        <span className={styles.brandName}>CryptoSim</span>
      </Link>

      <NavigationMenu isUserLoggedIn={!!user} />

      <div className={styles.actions}>
        <ThemeSelector className={styles.themeSelector} />

        {user ? (
          <div className={styles.userBlock}>
            <span className={styles.userGreeting}>
              {user.name ? `Hi, ${user.name}` : "Signed in"}
              {user.role === "ADMIN" && (
                <span className={styles.adminBadge}>ADMIN</span>
              )}
            </span>
            <Button variant="secondary" onClick={() => authService.logout()}>
              Logout
            </Button>
          </div>
        ) : (
          <div className={styles.authButtons}>
            <Button variant="secondary" onClick={() => navigate("/login")}>
              Login
            </Button>
            <Button variant="secondary" onClick={() => navigate("/register")}>
              Register
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
