const values = new Map<string, string>()

const storage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => values.set(key, value),
  removeItem: (key: string) => values.delete(key),
  clear: () => values.clear(),
}

Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })
Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: storage })
