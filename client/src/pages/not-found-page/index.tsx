import { useNavigate } from "react-router-dom";
import Button from "../../components/button";
import styles from "./styles.module.css";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.code}>404</div>
        <h1 className={styles.title}>Page not found</h1>
        <p className={styles.subtitle}>
          The page you're looking for doesn't exist or has moved. Let's get you
          back on track.
        </p>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={() => navigate(-1)}>
            ← Go back
          </Button>
          <Button onClick={() => navigate("/")} className={styles.homeButton}>
            Take me home
          </Button>
        </div>
      </div>
    </div>
  );
}
