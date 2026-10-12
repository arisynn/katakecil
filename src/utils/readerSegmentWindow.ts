/** Short-lived RAM-only Secure Reader cache.
 * Do not put manuscript text into localStorage, IndexedDB, or the service-worker cache.
 * In-flight requests are shared, and failed prefetches can be retried normally.
 */
export class ReaderSegmentWindow<T> {
  private readonly settled = new Map<string, T>();
  private readonly inflight = new Map<string, Promise<T>>();
  private readonly fetcher: (episode: number, part: number) => Promise<T>;
  private readonly capacity: number;
  constructor(fetcher: (episode: number, part: number) => Promise<T>, capacity = 3) {
    if (!Number.isSafeInteger(capacity) || capacity < 2 || capacity > 4) throw new Error('Invalid cache capacity');
    this.fetcher = fetcher;
    this.capacity = capacity;
  }
  private key(episode: number, part: number): string { return `${episode}:${part}`; }
  peek(episode: number, part: number): T | undefined { return this.settled.get(this.key(episode, part)); }
  async get(episode: number, part: number): Promise<T> {
    const key = this.key(episode, part);
    if (this.settled.has(key)) {
      const value = this.settled.get(key)!;
      this.settled.delete(key); this.settled.set(key, value);
      return value;
    }
    const ongoing = this.inflight.get(key);
    if (ongoing) return ongoing;
    const task = this.fetcher(episode, part).then(value => {
      this.settled.delete(key);
      this.settled.set(key, value);
      while (this.settled.size > this.capacity) {
        const oldest = this.settled.keys().next().value;
        if (oldest === undefined) break;
        this.settled.delete(oldest);
      }
      return value;
    }).finally(() => { this.inflight.delete(key); });
    this.inflight.set(key, task);
    return task;
  }
  /** Opportunistic network fetch; never show a loading overlay or an unhandled rejection. */
  prefetch(episode: number, part: number): void {
    void this.get(episode, part).catch(() => {});
  }
  clear(): void { this.settled.clear(); }
  get cachedParts(): number { return this.settled.size; }
}
