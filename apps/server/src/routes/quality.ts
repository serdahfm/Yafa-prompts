import { Router } from 'express'
import { z } from 'zod'
import { qualityScorer } from '../agents/qualityScorer'

const router = Router()

const QualityCheckSchema = z.object({
  prompt: z.string().min(1),
  taskType: z.string().min(1),
})

// Analyze prompt quality
router.post('/analyze', async (req, res) => {
  const parse = QualityCheckSchema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: 'Invalid body' })
  
  const { prompt, taskType } = parse.data
  
  try {
    const qualityScore = await qualityScorer.scorePrompt(prompt, taskType)
    res.json(qualityScore)
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Quality analysis failed' })
  }
})

// Get quality statistics for system monitoring
router.get('/stats', async (req, res) => {
  // This would integrate with analytics system
  // For now, return mock data showing the concept
  res.json({
    averageQuality: 87,
    totalAnalyzed: 1250,
    topRecommendations: [
      'Add more specific success criteria',
      'Include clearer role definitions',
      'Provide better context information'
    ],
    qualityTrends: {
      thisWeek: 89,
      lastWeek: 85,
      improvement: '+4.7%'
    }
  })
})

export default router
