import { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'

// Import correction agent
import { buildCorrectionPrompt } from '../lib/agents/correctionAgent'

const CorrectSchema = z.object({
  input: z.string().min(1),
  mode: z.string().min(1),
  yafa: z.boolean().optional(),
  failed: z.string().min(1),
  issue: z.string().min(1),
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

  const parse = CorrectSchema.safeParse(req.body)
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid body' })
  }

  const { input, mode, yafa, failed, issue } = parse.data
  
  try {
    const prompt = await buildCorrectionPrompt({ 
      mission: input, 
      mode, 
      failed, 
      issue, 
      yafa 
    })
    res.json({ prompt })
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Correction prompt generation error' })
  }
}
