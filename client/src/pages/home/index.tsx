import { Link, useNavigate } from "react-router-dom";

import { useOptionalUser } from "../../contexts/user-context";

import Button from "../../components/button";
import { CryptoPriceContainer } from "../../components/crypto-price-container";
import { TOP_3_CRYPTO_PAIRS } from "../../lib/constants/crypto-pairs";

import styles from "./styles.module.css";

const FEATURES = [
  {
    title: "Real-time market data",
    description:
      "Stream live cryptocurrency prices directly from the Kraken exchange via WebSocket.",
    icon: "📡",
  },
  {
    title: "Risk-free practice",
    description:
      "Start with $10,000 in virtual cash. Buy, sell, and learn without losing a cent.",
    icon: "💰",
  },
  {
    title: "Smart price alerts",
    description:
      "Set targets above or below market price and get a browser notification the moment they hit.",
    icon: "🔔",
  },
  {
    title: "Portfolio reports",
    description:
      "Track your portfolio value over time. Save report templates and export them to PDF.",
    icon: "📈",
  },
];

export default function Home() {
  const user = useOptionalUser();
  const navigate = useNavigate();

  return (
    <div className={styles.homePage}>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <span className={styles.eyebrow}>Cryptocurrency trading simulator</span>
          <h1 className={styles.heroTitle}>
            Trade crypto with{" "}
            <span className={styles.heroAccent}>real prices</span>, zero risk.
          </h1>
          <p className={styles.heroSubtitle}>
            CryptoSim gives you a $10,000 virtual portfolio and live Kraken
            market data. Build strategies, set price alerts, and track
            performance — without putting real money on the line.
          </p>
          <div className={styles.heroActions}>
            {user ? (
              <Button
                variant="secondary"
                onClick={() => navigate("/trading")}
                className={styles.heroButton}
              >
                Launch trading platform →
              </Button>
            ) : (
              <>
                <Button
                  variant="secondary"
                  onClick={() => navigate("/register")}
                  className={styles.heroButton}
                >
                  Get $10,000 to trade →
                </Button>
                <Link to="/login" className={styles.heroSecondaryLink}>
                  Already have an account? Sign in
                </Link>
              </>
            )}
          </div>
        </div>

        <div className={styles.heroPreview}>
          <CryptoPriceContainer
            cryptoPairs={TOP_3_CRYPTO_PAIRS}
            preview
            title="Live prices"
            subtitle="Updated every second from Kraken"
          />
        </div>
      </section>

      <section className={styles.features}>
        <h2 className={styles.sectionTitle}>What you can do</h2>
        <div className={styles.featuresGrid}>
          {FEATURES.map((f) => (
            <article key={f.title} className={styles.featureCard}>
              <span className={styles.featureIcon} aria-hidden="true">
                {f.icon}
              </span>
              <h3 className={styles.featureTitle}>{f.title}</h3>
              <p className={styles.featureDescription}>{f.description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
