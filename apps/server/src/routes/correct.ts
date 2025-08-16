import { Router } from 'express'
import { z } from 'zod'
import { buildCorrectionPrompt } from '../agents/correctionAgent'

const router = Router()

const CorrectSchema = z.object({
  input: z.string().min(1),
  mode: z.string().min(1),
  yafa: z.boolean().optional(),
  failed: z.string().min(1),
  issue: z.string().min(1),
})

router.post('/', async (req, res) => {
  const parse = CorrectSchema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: 'Invalid body' })
  const { input, mode, yafa, failed, issue } = parse.data
  try {
    const prompt = await buildCorrectionPrompt({ mission: input, mode, failed, issue, yafa })
    res.json({ prompt })
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Correction prompt generation error' })
  }
})

export default router



