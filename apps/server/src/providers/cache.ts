import crypto from 'crypto'

export interface CacheEntry<T> {
  data: T
  timestamp: number
  hitCount: number
  ttl: number
}

export class MemoryCache<T> {
  private cache = new Map<string, CacheEntry<T>>()
  private readonly defaultTTL: number

  constructor(defaultTTLMinutes: number = 15) {
    this.defaultTTL = defaultTTLMinutes * 60 * 1000 // Convert to milliseconds
  }

  private generateKey(input: any): string {
    const serialized = typeof input === 'string' ? input : JSON.stringify(input)
    return crypto.createHash('sha256').update(serialized).digest('hex')
  }

  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl
  }

  set(key: string | any, data: T, ttlMinutes?: number): void {
    const cacheKey = typeof key === 'string' ? key : this.generateKey(key)
    const ttl = ttlMinutes ? ttlMinutes * 60 * 1000 : this.defaultTTL
    
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      hitCount: 0,
      ttl
    })
  }

  get(key: string | any): T | null {
    const cacheKey = typeof key === 'string' ? key : this.generateKey(key)
    const entry = this.cache.get(cacheKey)
    
    if (!entry) {
      return null
    }

    if (this.isExpired(entry)) {
      this.cache.delete(cacheKey)
      return null
    }

    // Update hit count for analytics
    entry.hitCount++
    return entry.data
  }

  has(key: string | any): boolean {
    const cacheKey = typeof key === 'string' ? key : this.generateKey(key)
    const entry = this.cache.get(cacheKey)
    
    if (!entry) return false
    if (this.isExpired(entry)) {
      this.cache.delete(cacheKey)
      return false
    }
    
    return true
  }

  delete(key: string | any): boolean {
    const cacheKey = typeof key === 'string' ? key : this.generateKey(key)
    return this.cache.delete(cacheKey)
  }

  clear(): void {
    this.cache.clear()
  }

  // Cleanup expired entries
  cleanup(): number {
    let deletedCount = 0
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key)
        deletedCount++
      }
    }
    return deletedCount
  }

  // Get cache statistics
  getStats() {
    const entries = Array.from(this.cache.values())
    const totalHits = entries.reduce((sum, entry) => sum + entry.hitCount, 0)
    const avgAge = entries.length > 0 
      ? entries.reduce((sum, entry) => sum + (Date.now() - entry.timestamp), 0) / entries.length 
      : 0

    return {
      size: this.cache.size,
      totalHits,
      avgAgeMs: avgAge,
      avgAgeMinutes: avgAge / (60 * 1000)
    }
  }
}

// Global prompt cache instance
export const promptCache = new MemoryCache<any>(15) // 15 minutes TTL

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const deleted = promptCache.cleanup()
  if (deleted > 0) {
    console.log(`Cache cleanup: removed ${deleted} expired entries`)
  }
}, 5 * 60 * 1000)
