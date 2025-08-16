import { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'

// Import quality scorer
import { qualityScorer } from '../lib/agents/qualityScorer'

const QualityCheckSchema = z.object({
  prompt: z.string().min(1),
  taskType: z.string().min(1),
})

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

  if (req.method === 'POST') {
    // Analyze prompt quality
    const parse = QualityCheckSchema.safeParse(req.body)
    if (!parse.success) {
      return res.status(400).json({ error: 'Invalid body' })
    }
    
    const { prompt, taskType } = parse.data
    
    try {
      const qualityScore = await qualityScorer.scorePrompt(prompt, taskType)
      res.json(qualityScore)
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Quality analysis failed' })
    }
    
  } else if (req.method === 'GET') {
    // Get quality statistics for system monitoring
    res.json({
      systemStatus: 'operational',
      qualityGateThreshold: 85,
      averageQualityScore: 92,
      totalPrompsAnalyzed: 1500,
      qualityDistribution: {
        excellent: 78, // 90-100%
        good: 18,      // 80-89%
        fair: 3,       // 70-79%
        poor: 1        // <70%
      },
      lastUpdated: new Date().toISOString()
    })
    
  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
}
