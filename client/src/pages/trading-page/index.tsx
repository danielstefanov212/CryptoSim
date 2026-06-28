import { CryptoPriceContainer } from "../../components/crypto-price-container";

import { useActiveCryptoSymbols } from "../../hooks/use-active-symbols";

import styles from "./styles.module.css";

export function TradingPage() {
  const symbols = useActiveCryptoSymbols();

  return (
    <div className={styles.tradingPage}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Trading platform</h1>
        <p className={styles.pageSubtitle}>
          Live cryptocurrency prices powered by Kraken. Click any ticker to open
          its trading screen.
        </p>
      </header>

      <CryptoPriceContainer
        cryptoPairs={symbols}
        preview={false}
        title="Available markets"
        subtitle="Prices update in real time"
      />
    </div>
  );
}
