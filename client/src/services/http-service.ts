import {
  InvalidLoginCredentials,
  ValidationException,
} from "../lib/errors/base-errors";

import { authService } from "./auth-service";
import { UserStorage } from "./user-storage";

import { throwHttpError } from "../lib/errors/http-errors";

enum HttpMethod {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  PATCH = "PATCH",
  DELETE = "DELETE",
}

const baseUrl = import.meta.env.VITE_API_BASE;

interface RequestOptions {
  query?: object;
  body?: object;
}

interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}

class HttpService {
  async get<ResultType = unknown>(route: string, query?: object) {
    return await this.request<ResultType>(route, HttpMethod.GET, { query });
  }

  async post<ResultType = unknown>(route: string, body: object) {
    return await this.request<ResultType>(route, HttpMethod.POST, { body });
  }

  async put<ResultType = unknown>(route: string, body: object) {
    return await this.request<ResultType>(route, HttpMethod.PUT, { body });
  }

  async patch<ResultType = unknown>(route: string, body: object) {
    return await this.request<ResultType>(route, HttpMethod.PATCH, { body });
  }

  async delete(route: string) {
    return await this.request(route, HttpMethod.DELETE, {});
  }

  private async request<ResultType = unknown>(
    route: string,
    method: HttpMethod,
    options: RequestOptions
  ) {
    const headers = new Headers();

    if (options.body) {
      headers.append("Content-Type", "application/json");
    }

    const userStorage = new UserStorage();
    const token = userStorage.token;

    if (token) {
      headers.append("Authorization", `Bearer ${token}`);
    }

    const sanitizedRoute = route.replace(/^\/+/, "");

    const queryParams = new URLSearchParams();
    if (options.query) {
      Object.entries(options.query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, `${value}`);
        }
      });
    }
    const queryString = queryParams.toString();
    const url =
      `${baseUrl}/${sanitizedRoute}` +
      (queryString ? `?${queryString}` : "");

    const response = await fetch(url, {
      method,
      headers,
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    });

    if (!response.ok) {
      const body = (await response
        .json()
        .catch(() => ({}))) as ApiErrorBody;
      const code = body?.error?.code;
      const message = body?.error?.message ?? response.statusText;

      if (response.status === 401 && code === "TOKEN_EXPIRED") {
        authService.logout();
      }

      if (response.status === 401) {
        throw new InvalidLoginCredentials(message);
      }

      if (response.status === 400 && code === "VALIDATION") {
        throw new ValidationException(message);
      }

      throwHttpError(response.status, message);
    }

    if (response.status === 204 || response.headers.get("content-length") === "0") {
      return undefined as ResultType;
    }
    return (await response.json()) as ResultType;
  }
}

const httpService = new HttpService();
export default httpService;
