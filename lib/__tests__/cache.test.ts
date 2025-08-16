import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MemoryCache } from '../providers/cache'

describe('MemoryCache', () => {
  let cache: MemoryCache<string>

  beforeEach(() => {
    cache = new MemoryCache<string>(1) // 1 minute TTL for testing
  })

  it('should set and get values', () => {
    cache.set('key1', 'value1')
    expect(cache.get('key1')).toBe('value1')
  })

  it('should return null for non-existent keys', () => {
    expect(cache.get('nonexistent')).toBeNull()
  })

  it('should check if key exists', () => {
    cache.set('key1', 'value1')
    expect(cache.has('key1')).toBe(true)
    expect(cache.has('nonexistent')).toBe(false)
  })

  it('should delete keys', () => {
    cache.set('key1', 'value1')
    expect(cache.has('key1')).toBe(true)
    
    cache.delete('key1')
    expect(cache.has('key1')).toBe(false)
  })

  it('should clear all entries', () => {
    cache.set('key1', 'value1')
    cache.set('key2', 'value2')
    
    cache.clear()
    expect(cache.has('key1')).toBe(false)
    expect(cache.has('key2')).toBe(false)
  })

  it('should handle object keys by generating hash', () => {
    const objKey = { input: 'test', mode: 'General Purpose' }
    cache.set(objKey, 'cached-prompt')
    
    expect(cache.get(objKey)).toBe('cached-prompt')
    expect(cache.has(objKey)).toBe(true)
  })

  it('should expire entries after TTL', async () => {
    // Use a very short TTL for this test
    const shortCache = new MemoryCache<string>(0.001) // ~0.06 seconds
    
    shortCache.set('key1', 'value1')
    expect(shortCache.get('key1')).toBe('value1')
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 100))
    
    expect(shortCache.get('key1')).toBeNull()
    expect(shortCache.has('key1')).toBe(false)
  })

  it('should track hit counts', () => {
    cache.set('key1', 'value1')
    
    // Access the key multiple times
    cache.get('key1')
    cache.get('key1')
    cache.get('key1')
    
    const stats = cache.getStats()
    expect(stats.totalHits).toBe(3)
  })

  it('should provide cache statistics', async () => {
    cache.set('key1', 'value1')
    cache.set('key2', 'value2')
    
    // Wait a bit to ensure age > 0
    await new Promise(resolve => setTimeout(resolve, 10))
    
    cache.get('key1') // 1 hit
    cache.get('key1') // 2 hits
    
    const stats = cache.getStats()
    expect(stats.size).toBe(2)
    expect(stats.totalHits).toBe(2)
    expect(stats.avgAgeMs).toBeGreaterThanOrEqual(0)
  })

  it('should cleanup expired entries', async () => {
    const shortCache = new MemoryCache<string>(0.001) // Very short TTL
    
    shortCache.set('key1', 'value1')
    shortCache.set('key2', 'value2')
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const deletedCount = shortCache.cleanup()
    expect(deletedCount).toBe(2)
    expect(shortCache.getStats().size).toBe(0)
  })
})
