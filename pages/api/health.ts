import { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Debug environment variables
  const openaiKey = process.env.OPENAI_API_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  
  console.log('🔍 Health Check Environment Debug:')
  console.log('OPENAI_API_KEY exists:', !!openaiKey)
  console.log('ANTHROPIC_API_KEY exists:', !!anthropicKey)
  console.log('OPENAI_API_KEY prefix:', openaiKey ? openaiKey.substring(0, 10) + '...' : 'NOT_SET')
  console.log('NODE_ENV:', process.env.NODE_ENV)
  console.log('VERCEL_ENV:', process.env.VERCEL_ENV)

  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '4.0.0-serverless',
    services: {
      llm: openaiKey || anthropicKey ? 'configured' : 'not-configured'
    },
    debug: {
      hasOpenAI: !!openaiKey,
      hasAnthropic: !!anthropicKey,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      openaiPrefix: openaiKey ? openaiKey.substring(0, 10) + '...' : 'NOT_SET'
    }
  })
}
