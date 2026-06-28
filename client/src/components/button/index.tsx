import clsx from "clsx";
import { ComponentProps } from "react";
import styles from "./styles.module.css";

interface ButtonProps extends ComponentProps<"button"> {
  variant?: "primary" | "secondary" | "destructive";
}

export default function Button({
  variant = "primary",
  className,
  ...otherProps
}: ButtonProps) {
  return (
    <button
      className={clsx(styles.button, className, variant)}
      {...otherProps}
    ></button>
  );
}
