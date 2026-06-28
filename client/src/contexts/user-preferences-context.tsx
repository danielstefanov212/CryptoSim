import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";

import { LocalStorageService } from "../services/local-storage-service";

export interface UserPreferences {
  theme: "light" | "dark";
}

interface UserPreferencesProviderValue extends UserPreferences {
  setPreferences: (preferences: Partial<UserPreferences>) => void;
}

const UserPreferencesContext =
  createContext<UserPreferencesProviderValue | null>(null);

const USER_PREFERENCES_KEY = "crypto-sim-user-preferences";
const storage = new LocalStorageService<UserPreferences>(USER_PREFERENCES_KEY);

interface UserPreferencesProviderProps {
  children: ReactNode;
}

export default function UserPreferencesProvider({
  children,
}: UserPreferencesProviderProps) {
  const [userPreferences, setUserPreferences] = useState<UserPreferences>(
    () =>
      storage.data ?? {
        theme: "light",
      }
  );

  const setPartialPreferences = useCallback(
    (preferences: Partial<UserPreferences>) => {
      setUserPreferences((prev) => {
        const newState = {
          ...prev,
          ...preferences,
        };
        storage.save(newState);
        return newState;
      });
    },
    []
  );

  return (
    <UserPreferencesContext.Provider
      value={{
        theme: userPreferences.theme,
        setPreferences: setPartialPreferences,
      }}
    >
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const preferences = useContext(UserPreferencesContext);

  if (preferences === null) {
    throw new Error(
      "You can call useUserPreferences only in children component of UserPreferencesProvider"
    );
  }

  return preferences;
}
