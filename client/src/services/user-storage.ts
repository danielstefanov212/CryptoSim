import { jwtDecode } from "jwt-decode";

import { LocalStorageService } from "./local-storage-service";

import { User } from "../lib/users";

const USER_TOKEN_KEY = "current-user-token";

const storage = new LocalStorageService<string>(USER_TOKEN_KEY);

export class UserStorage {
  get currentUser(): User | undefined {
    const token = localStorage.getItem(USER_TOKEN_KEY);
    return token ? (jwtDecode(token) as User) : undefined;
  }

  get token() {
    return storage.data;
  }

  saveToken(token: string) {
    storage.save(token);
  }

  remove() {
    storage.remove();
  }
}
