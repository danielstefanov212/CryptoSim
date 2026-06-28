export class HttpBaseError extends Error {
  public status = 500;
  constructor(_status: number, _name: string, message?: string) {
    super(message);
    this.status = _status;
    this.name = _name;
  }
}

export class ValidationException extends Error {
  constructor(public message: string) {
    super(message);
  }
}

export class InvalidLoginCredentials extends Error {
  constructor(public message: string) {
    super(message);
  }
}
