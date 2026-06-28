import { useCallback, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Link } from "react-router-dom";

import { useAsyncAction } from "../../hooks/use-async-action";

import { authService } from "../../services/auth-service";

import {
  InvalidLoginCredentials,
  ValidationException,
} from "../../lib/errors/base-errors";

import Input from "../../components/input";
import Button from "../../components/button";

import styles from "./styles.module.css";

const initialState = {
  email: "",
  password: "",
};

type LoginState = typeof initialState;

export function Login() {
  const [formState, setFormState] = useState(initialState);

  const changeProp = useCallback(
    <Field extends keyof LoginState>(field: Field) => {
      return (value: string | number) =>
        setFormState((prevState) => ({
          ...prevState,
          [field]: value,
        }));
    },
    [],
  );

  const state = useLocation().state as { from: string | null } | null;
  const from = state?.from;
  const navigate = useNavigate();

  const { error, trigger: onSubmit } = useAsyncAction(async () => {
    await authService.login(formState);
    navigate({ pathname: from ?? "/" }, { replace: true });
  });

  const errorMessage =
    error instanceof InvalidLoginCredentials || error instanceof ValidationException
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
          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.subtitle}>
            Sign in to keep trading with your virtual portfolio.
          </p>
        </header>

        {errorMessage && (
          <div className={styles.errorAlert} role="alert">
            {errorMessage}
          </div>
        )}

        <Input
          type="email"
          label="Email"
          onChange={changeProp("email")}
          value={formState.email}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
        <Input
          type="password"
          label="Password"
          onChange={changeProp("password")}
          value={formState.password}
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />

        <Button variant="secondary" type="submit" className={styles.submit}>
          Sign in
        </Button>

        <p className={styles.switchLine}>
          New to CryptoSim?{" "}
          <Link to="/register" className={styles.switchLink}>
            Create an account
          </Link>
        </p>
      </form>
    </div>
  );
}
