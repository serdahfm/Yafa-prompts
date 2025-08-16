import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import generateRoute from './routes/generate'
import correctRoute from './routes/correct'
import qualityRoute from './routes/quality'
import feedbackRoute from './routes/feedback'
import analyticsRoute from './routes/analytics'
import { getSecretString } from './providers/secret'

const app = express()
app.use(cors())
app.use(express.json({ limit: '2mb' }))

// Health check endpoint for monitoring
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    services: {
      llm: process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY ? 'configured' : 'not-configured'
    }
  })
})

// Cache statistics endpoint
app.get('/api/cache/stats', async (req, res) => {
  try {
    const { promptCache } = await import('./providers/cache.js')
    const stats = promptCache.getStats()
    res.json({
      cache: stats,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to get cache stats' })
  }
})

app.use('/api/generate', generateRoute)
app.use('/api/correct', correctRoute)
app.use('/api/quality', qualityRoute)
app.use('/api/feedback', feedbackRoute)
app.use('/api/analytics', analyticsRoute)

const port = Number(process.env.PORT) || 8787
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`YAFA-prompts server listening on http://localhost:${port}`)
})


