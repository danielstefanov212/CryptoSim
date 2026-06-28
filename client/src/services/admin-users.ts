import httpService from "./http-service";

import type { UserRole } from "../lib/users";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  balance: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUpdateUserInput {
  name?: string;
  email?: string;
  role?: UserRole;
  password?: string;
}

class AdminUsersService {
  list(): Promise<AdminUser[]> {
    return httpService.get<AdminUser[]>("/users");
  }

  get(id: string): Promise<AdminUser> {
    return httpService.get<AdminUser>(`/users/${id}`);
  }

  update(id: string, patch: AdminUpdateUserInput): Promise<AdminUser> {
    return httpService.put<AdminUser>(`/users/${id}`, patch);
  }

  delete(id: string): Promise<void> {
    return httpService.delete(`/users/${id}`) as Promise<void>;
  }
}

export const adminUsersService = new AdminUsersService();
