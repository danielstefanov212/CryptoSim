import styles from "./styles.module.css";

export default function Footer() {
  return (
    <footer className={styles.pageFooter}>
      <p className={styles.footerText}>
        &copy; 2025 CryptoSim. All rights reserved.
      </p>
    </footer>
  );
}
