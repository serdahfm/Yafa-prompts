import { Router } from 'express'
import { z } from 'zod'

const router = Router()

// In-memory storage for demo (in production, use a database)
let feedbackStorage: Array<{
  id: string
  promptId: string
  rating: number
  feedback: string
  timestamp: Date
}> = []

const FeedbackSchema = z.object({
  promptId: z.string().min(1),
  rating: z.number().min(1).max(5),
  feedback: z.string().optional(),
})

// Submit feedback for a prompt
router.post('/submit', async (req, res) => {
  const parse = FeedbackSchema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: 'Invalid feedback data' })
  
  const { promptId, rating, feedback } = parse.data
  
  const feedbackEntry = {
    id: Date.now().toString(),
    promptId,
    rating,
    feedback: feedback || '',
    timestamp: new Date()
  }
  
  feedbackStorage.push(feedbackEntry)
  
  res.json({ 
    success: true, 
    message: 'Feedback submitted successfully',
    id: feedbackEntry.id
  })
})

// Get feedback statistics
router.get('/stats', async (req, res) => {
  const totalFeedback = feedbackStorage.length
  const averageRating = totalFeedback > 0 
    ? feedbackStorage.reduce((sum, f) => sum + f.rating, 0) / totalFeedback 
    : 0
  
  const ratingDistribution = {
    5: feedbackStorage.filter(f => f.rating === 5).length,
    4: feedbackStorage.filter(f => f.rating === 4).length,
    3: feedbackStorage.filter(f => f.rating === 3).length,
    2: feedbackStorage.filter(f => f.rating === 2).length,
    1: feedbackStorage.filter(f => f.rating === 1).length,
  }
  
  const recentFeedback = feedbackStorage
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 10)
    .map(f => ({
      rating: f.rating,
      feedback: f.feedback,
      timestamp: f.timestamp
    }))
  
  res.json({
    totalFeedback,
    averageRating: Math.round(averageRating * 10) / 10,
    ratingDistribution,
    recentFeedback,
    satisfaction: averageRating >= 4 ? 'High' : averageRating >= 3 ? 'Medium' : 'Low'
  })
})

// Get feedback for a specific prompt
router.get('/prompt/:promptId', async (req, res) => {
  const { promptId } = req.params
  const promptFeedback = feedbackStorage.filter(f => f.promptId === promptId)
  
  res.json({
    promptId,
    feedbackCount: promptFeedback.length,
    averageRating: promptFeedback.length > 0 
      ? promptFeedback.reduce((sum, f) => sum + f.rating, 0) / promptFeedback.length 
      : 0,
    feedback: promptFeedback.map(f => ({
      rating: f.rating,
      feedback: f.feedback,
      timestamp: f.timestamp
    }))
  })
})

export default router
