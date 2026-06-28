export interface LoginProps {
  email: string;
  password: string;
}

export interface RegisterProps {
  name: string;
  email: string;
  password: string;
  repeatPassword: string;
}

export type UserRole = "TRADER" | "ADMIN";

export interface User {
  userId: string;
  name: string;
  email: string;
  balance: number;
  role: UserRole;
}
