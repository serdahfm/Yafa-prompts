import { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'

// Import LLM client
import { createLLMClientFromEnv } from '../lib/providers/llm'

const ImproveSchema = z.object({
  originalPrompt: z.string().min(1),
  recommendation: z.string().min(1),
  userDetails: z.string().optional(),
  mode: z.string().min(1),
  yafa: z.boolean().optional()
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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const parse = ImproveSchema.safeParse(req.body)
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid body' })
  }
  
  const { originalPrompt, recommendation, userDetails, mode, yafa } = parse.data
  
  try {
    const llmClient = createLLMClientFromEnv()
    
    // Create a clean refinement prompt
    const refinementInstruction = `You are an expert prompt engineer. Your task is to improve an existing prompt by applying a specific recommendation.

ORIGINAL PROMPT:
---START---
${originalPrompt}
---END---

IMPROVEMENT RECOMMENDATION: ${recommendation}

${userDetails ? `ADDITIONAL USER REQUIREMENTS: ${userDetails}` : ''}

PROFESSIONAL CONTEXT: ${mode}
${yafa ? 'YAFA MODE: Apply enhanced technical rigor and critical analysis' : ''}

INSTRUCTIONS:
1. Apply the recommendation to improve the original prompt
2. ${userDetails ? `Incorporate the additional user requirements: "${userDetails}"` : 'Focus on the core recommendation'}
3. Maintain the original intent and professional context
4. Create a clean, professional prompt without meta-commentary
5. Ensure the result is immediately usable

OUTPUT: Return ONLY the improved prompt - no explanations, meta-commentary, or wrapper text.`

    const improvedPrompt = await llmClient.complete(refinementInstruction, {
      temperature: 0.7,
      maxTokens: 2000,
    })

    // Clean up any potential wrapper text or meta-commentary
    const cleanPrompt = improvedPrompt
      .replace(/^.*?---START---\s*/s, '')
      .replace(/\s*---END---.*$/s, '')
      .replace(/^(Here's the improved prompt:|Improved prompt:|The improved prompt is:)\s*/i, '')
      .trim()

    res.json({
      improvedPrompt: cleanPrompt,
      originalPrompt,
      recommendation,
      userDetails,
      improved_at: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Prompt improvement failed:', error)
    res.status(500).json({ 
      error: 'Failed to improve prompt',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
