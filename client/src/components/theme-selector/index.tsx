import { useEffect } from "react";

import {
  UserPreferences,
  useUserPreferences,
} from "../../contexts/user-preferences-context";

import ToggleButton from "../toggle-button";

const THEMES_OPTIONS = ["Light", "Dark"];

interface ThemeSelectorProps {
  className?: string;
}

export default function ThemeSelector({ className }: ThemeSelectorProps) {
  const { theme, setPreferences } = useUserPreferences();
  useEffect(() => {
    document.body.classList.remove("light", "dark");
    document.body.classList.add(theme);
  }, [theme]);

  return (
    <ToggleButton
      variant="secondary"
      className={className}
      toggleHandler={(theme) => {
        setPreferences({ theme: theme.toLowerCase() } as UserPreferences);
      }}
      isFirstSelected={theme === THEMES_OPTIONS[0].toLowerCase()}
      firstOption={THEMES_OPTIONS[0]}
      secondOption={THEMES_OPTIONS[1]}
    />
  );
}
