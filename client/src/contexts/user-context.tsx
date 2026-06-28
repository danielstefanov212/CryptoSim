import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

import { UserStorage } from "../services/user-storage";
import { authService } from "../services/auth-service";

import { User } from "../lib/users";

const UserContext = createContext<User | undefined | null>(null);

interface UserProviderProps {
  children: ReactNode;
}

const userStorage = new UserStorage();

export default function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState(userStorage.currentUser);
  useEffect(() => {
    authService.setOnChange(setUser);
  }, []);

  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export function useCurrentUser() {
  const user = useOptionalUser();

  if (!user) {
    throw new Error("There isn't a logged in user!");
  }

  return user;
}

export function useOptionalUser() {
  const user = useContext(UserContext);

  if (user === null) {
    throw new Error(
      "You can call useCurrentUser only in children component of UserProvider"
    );
  }

  return user;
}
