export class SearchCache<TValue> {
  readonly #entries = new Map<string, { expiresAt: number; value: TValue }>()

  constructor(private readonly ttlMs: number) {}

  get(key: string): TValue | undefined {
    const entry = this.#entries.get(key)

    if (!entry) {
      return undefined
    }

    if (entry.expiresAt <= Date.now()) {
      this.#entries.delete(key)
      return undefined
    }

    return entry.value
  }

  set(key: string, value: TValue): void {
    this.#entries.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    })
  }
}
