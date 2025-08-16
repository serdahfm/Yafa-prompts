import { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'

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
    // Submit feedback
    const parse = FeedbackSchema.safeParse(req.body)
    if (!parse.success) {
      return res.status(400).json({ error: 'Invalid feedback data' })
    }
    
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
      feedback: feedbackEntry
    })
    
  } else if (req.method === 'GET') {
    // Get feedback stats
    const totalFeedback = feedbackStorage.length
    const averageRating = totalFeedback > 0
      ? feedbackStorage.reduce((sum, f) => sum + f.rating, 0) / totalFeedback
      : 0
    
    const ratingDistribution = feedbackStorage.reduce((dist, f) => {
      dist[f.rating] = (dist[f.rating] || 0) + 1
      return dist
    }, {} as Record<number, number>)

    res.json({
      totalFeedback,
      averageRating: Math.round(averageRating * 100) / 100,
      ratingDistribution,
      recentFeedback: feedbackStorage.slice(-10).reverse()
    })
    
  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
}
