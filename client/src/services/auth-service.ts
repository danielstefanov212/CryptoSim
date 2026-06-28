import { UserStorage } from "./user-storage";

import httpService from "./http-service";

import { LoginProps, RegisterProps, User } from "../lib/users";

type OnChangeHandler = ((user: User | undefined) => unknown) | undefined;

const userStorage = new UserStorage();

class AuthService {
  private onChange: OnChangeHandler;
  setOnChange(action: OnChangeHandler) {
    this.onChange = action;
  }

  async login({ email, password }: LoginProps) {
    const { token } = await httpService.post<{ token: string }>("/auth/login", {
      email,
      password,
    });
    userStorage.saveToken(token);

    const user = userStorage.currentUser;
    this.onChange?.(user);
  }

  async register({ name, email, password, repeatPassword }: RegisterProps) {
    const { token } = await httpService.post<{ token: string }>(
      "/auth/register",
      {
        name,
        email,
        password,
        repeatPassword,
      }
    );
    userStorage.saveToken(token);

    const user = userStorage.currentUser;
    this.onChange?.(user);
  }

  logout() {
    userStorage.remove();
    this.onChange?.(undefined);
  }
}

export const authService = new AuthService();
