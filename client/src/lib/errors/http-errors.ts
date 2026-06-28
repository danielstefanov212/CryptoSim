import { HttpBaseError } from "./base-errors";

export class BadRequestError extends HttpBaseError {
  constructor(message = "Bad Request") {
    super(400, "BadRequestError", message);
  }
}

export class UnauthorizedError extends HttpBaseError {
  constructor(message = "Unauthorized") {
    super(401, "UnauthorizedError", message);
  }
}

export class ForbiddenError extends HttpBaseError {
  constructor(message = "Forbidden") {
    super(403, "ForbiddenError", message);
  }
}

export class NotFoundError extends HttpBaseError {
  constructor(message = "Not Found") {
    super(404, "NotFoundError", message);
  }
}

export class ConflictError extends HttpBaseError {
  constructor(message = "Conflict") {
    super(409, "ConflictError", message);
  }
}

export class InternalServerError extends HttpBaseError {
  constructor(message = "Internal Server Error") {
    super(500, "InternalServerError", message);
  }
}

type ErrorConstructor = new (message?: string) => HttpBaseError;

const errorMap: Record<number, ErrorConstructor> = {
  400: BadRequestError,
  401: UnauthorizedError,
  403: ForbiddenError,
  404: NotFoundError,
  409: ConflictError,
  500: InternalServerError,
};

export function throwHttpError(status: number, message?: string): never {
  const ErrorClass = errorMap[status] || InternalServerError;
  throw new ErrorClass(message || "Unknown Error");
}
