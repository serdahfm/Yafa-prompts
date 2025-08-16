import { describe, it, expect } from 'vitest'
import request from 'supertest'
import express from 'express'

// Create a test app with just the health endpoint
const createTestApp = () => {
  const app = express()
  
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
  
  return app
}

describe('Health Check Endpoint', () => {
  const app = createTestApp()

  it('should return healthy status', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200)

    expect(response.body).toMatchObject({
      status: 'healthy',
      version: '0.1.0',
      services: {
        llm: expect.any(String)
      }
    })
    
    expect(response.body.timestamp).toBeDefined()
    expect(new Date(response.body.timestamp)).toBeInstanceOf(Date)
  })

  it('should include LLM service status', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200)

    expect(['configured', 'not-configured']).toContain(response.body.services.llm)
  })
})
