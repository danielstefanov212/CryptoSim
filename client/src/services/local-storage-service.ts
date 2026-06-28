export class LocalStorageService<T> {
    constructor(private key: string) {}

    get data(): T | undefined {
      const data = localStorage.getItem(this.key);

      if (!data) {
        return undefined;
      }

      return this.safeParseJson(data);
    }

    save(data: T) {
      localStorage.setItem(this.key, JSON.stringify(data));
    }

    remove() {
      localStorage.removeItem(this.key);
    }

    private safeParseJson(rawData: string) {
      try {
        return JSON.parse(rawData) as T;
      } catch {
        this.remove();
        return undefined;
      }
    }
  }
