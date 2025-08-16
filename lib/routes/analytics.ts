import { Router } from 'express'
import { promptCache } from '../providers/cache'

const router = Router()

// In-memory analytics storage for demo
let analyticsData = {
  totalRequests: 0,
  successfulGenerations: 0,
  averageResponseTime: 0,
  popularModes: {} as Record<string, number>,
  qualityTrends: [] as Array<{ date: string, avgQuality: number }>,
  usageByHour: {} as Record<string, number>,
  errorRate: 0
}

// Middleware to track analytics (would be called from generate route)
export const trackAnalytics = (mode: string, responseTime: number, quality?: number, success: boolean = true) => {
  analyticsData.totalRequests++
  
  if (success) {
    analyticsData.successfulGenerations++
  }
  
  // Update average response time
  analyticsData.averageResponseTime = 
    (analyticsData.averageResponseTime * (analyticsData.totalRequests - 1) + responseTime) / analyticsData.totalRequests
  
  // Track popular modes
  analyticsData.popularModes[mode] = (analyticsData.popularModes[mode] || 0) + 1
  
  // Track usage by hour
  const hour = new Date().getHours().toString()
  analyticsData.usageByHour[hour] = (analyticsData.usageByHour[hour] || 0) + 1
  
  // Track quality trends (simplified - would use proper time buckets in production)
  if (quality) {
    const today = new Date().toISOString().split('T')[0]
    const existingTrend = analyticsData.qualityTrends.find(t => t.date === today)
    if (existingTrend) {
      existingTrend.avgQuality = (existingTrend.avgQuality + quality) / 2
    } else {
      analyticsData.qualityTrends.push({ date: today, avgQuality: quality })
    }
  }
  
  // Update error rate
  analyticsData.errorRate = ((analyticsData.totalRequests - analyticsData.successfulGenerations) / analyticsData.totalRequests) * 100
}

// Get comprehensive analytics dashboard
router.get('/dashboard', async (req, res) => {
  const cacheStats = promptCache.getStats()
  
  // Calculate additional metrics
  const cacheHitRate = analyticsData.totalRequests > 0 
    ? ((cacheStats.totalHits / analyticsData.totalRequests) * 100) 
    : 0
  
  const topModes = Object.entries(analyticsData.popularModes)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([mode, count]) => ({ mode, count, percentage: (count / analyticsData.totalRequests) * 100 }))
  
  const peakHours = Object.entries(analyticsData.usageByHour)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([hour, count]) => ({ hour: `${hour}:00`, count }))
  
  res.json({
    overview: {
      totalRequests: analyticsData.totalRequests,
      successRate: analyticsData.totalRequests > 0 
        ? ((analyticsData.successfulGenerations / analyticsData.totalRequests) * 100).toFixed(1) + '%'
        : '0%',
      averageResponseTime: analyticsData.averageResponseTime.toFixed(2) + 'ms',
      errorRate: analyticsData.errorRate.toFixed(1) + '%'
    },
    performance: {
      cacheHitRate: cacheHitRate.toFixed(1) + '%',
      cacheSize: cacheStats.size,
      totalCacheHits: cacheStats.totalHits,
      averageCacheAge: (cacheStats.avgAgeMinutes || 0).toFixed(1) + ' minutes'
    },
    usage: {
      topModes,
      peakHours,
      totalModes: Object.keys(analyticsData.popularModes).length
    },
    quality: {
      trends: analyticsData.qualityTrends.slice(-7), // Last 7 days
      averageQuality: analyticsData.qualityTrends.length > 0
        ? (analyticsData.qualityTrends.reduce((sum, t) => sum + t.avgQuality, 0) / analyticsData.qualityTrends.length).toFixed(1)
        : 'N/A'
    },
    realtime: {
      activeUsers: Math.floor(Math.random() * 50) + 10, // Mock data
      requestsLastHour: analyticsData.usageByHour[new Date().getHours().toString()] || 0,
      systemHealth: 'Healthy',
      uptime: '99.9%'
    }
  })
})

// Get specific analytics data
router.get('/modes', async (req, res) => {
  const modeStats = Object.entries(analyticsData.popularModes)
    .map(([mode, count]) => ({
      mode,
      count,
      percentage: (count / analyticsData.totalRequests) * 100
    }))
    .sort((a, b) => b.count - a.count)
  
  res.json({ modeStats, totalRequests: analyticsData.totalRequests })
})

router.get('/quality-trends', async (req, res) => {
  res.json({ qualityTrends: analyticsData.qualityTrends })
})

router.get('/performance', async (req, res) => {
  const cacheStats = promptCache.getStats()
  
  res.json({
    responseTime: {
      average: analyticsData.averageResponseTime,
      cached: '~5ms',
      uncached: '~2000ms'
    },
    cache: cacheStats,
    successRate: (analyticsData.successfulGenerations / analyticsData.totalRequests) * 100,
    errorRate: analyticsData.errorRate
  })
})

export default router
