import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Link } from "react-router-dom";

import { authService } from "../../services/auth-service";

import { ValidationException } from "../../lib/errors/base-errors";
import { useAsyncAction } from "../../hooks/use-async-action";

import Button from "../../components/button";
import Input from "../../components/input";

import styles from "./styles.module.css";

export function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");

  const state = useLocation().state as { from: string | null } | null;
  const from = state?.from;
  const navigate = useNavigate();

  const { error, trigger: onSubmit } = useAsyncAction(async () => {
    await authService.register({ name, email, password, repeatPassword });
    navigate({ pathname: from ?? "/" }, { replace: true });
  });

  const errorMessage =
    error instanceof ValidationException
      ? error.message
      : error
        ? "Something went wrong. Please try again."
        : null;

  return (
    <div className={styles.authPage}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className={styles.card}
      >
        <header className={styles.hero}>
          <h1 className={styles.title}>Create your account</h1>
          <p className={styles.subtitle}>
            Start trading risk-free with $10,000 in virtual cash.
          </p>
        </header>

        {errorMessage && (
          <div className={styles.errorAlert} role="alert">
            {errorMessage}
          </div>
        )}

        <Input
          name="name"
          label="Name"
          onChange={(v) => setName(v.toString())}
          value={name}
          placeholder="Your name"
          autoComplete="name"
          required
        />

        <Input
          name="email"
          type="email"
          label="Email"
          onChange={(v) => setEmail(v.toString())}
          value={email}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />

        <Input
          name="password"
          type="password"
          label="Password"
          onChange={(v) => setPassword(v.toString())}
          value={password}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          required
        />

        <Input
          name="repeatpassword"
          type="password"
          label="Repeat password"
          onChange={(v) => setRepeatPassword(v.toString())}
          value={repeatPassword}
          placeholder="Re-enter password"
          autoComplete="new-password"
          required
        />

        <Button variant="secondary" type="submit" className={styles.submit}>
          Create account
        </Button>

        <p className={styles.switchLine}>
          Already have an account?{" "}
          <Link to="/login" className={styles.switchLink}>
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
