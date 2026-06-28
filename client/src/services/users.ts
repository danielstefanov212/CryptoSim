import httpService from "./http-service";

import { User } from "../lib/users";

class UsersService {
  async getProfileInfo(): Promise<User> {
    return await httpService.get("/users/me");
  }

  async resetUser(): Promise<void> {
    return await httpService.post("/users/reset", {});
  }
}

export const usersService = new UsersService();
