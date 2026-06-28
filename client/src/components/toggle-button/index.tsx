import clsx from "clsx";
import { ComponentProps, useState } from "react";
import Button from "../button";
import styles from "./styles.module.css";

interface ToggleButtonProps<T extends string> extends ComponentProps<"button"> {
  firstOption: T;
  secondOption: T;
  variant: "primary" | "secondary" | "destructive";
  isFirstSelected: boolean;
  toggleHandler: (val: T) => unknown;
}

export default function ToggleButton<T extends string>({
  firstOption,
  secondOption,
  className,
  variant,
  toggleHandler,
  isFirstSelected,
  ...otherProps
}: ToggleButtonProps<T>) {
  const [isFirst, setIsFirst] = useState(isFirstSelected);

  return (
    <Button
      variant={variant}
      onClick={() => {
        const newValue = !isFirst;
        setIsFirst(newValue);
        toggleHandler(newValue ? firstOption : secondOption);
      }}
      className={clsx(
        className,
        styles.toggleButton,
        !isFirst && styles.isSecondSelectedd
      )}
      {...otherProps}
    >
      <span>{firstOption}</span>
      <span>{secondOption}</span>
    </Button>
  );
}
