import { Router } from 'express'
import { z } from 'zod'
import { createInitialIR, Mode } from '../core/promptIR'
import { runPipeline } from '../core/stateMachine'
import { promptCache } from '../providers/cache'
import { qualityScorer } from '../agents/qualityScorer'
import { modeDetectionAgent } from '../agents/modeDetectionAgent'
import { trackAnalytics } from './analytics'
import crypto from 'crypto'

const router = Router()

const GenerateSchema = z.object({
  input: z.string().min(1),
  mode: z.string().min(1),
  yafa: z.boolean().optional(),
  language: z.string().optional(),
  autoDetectMode: z.boolean().optional(),
})

router.post('/', async (req, res) => {
  const parse = GenerateSchema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ error: 'Invalid body' })
  const { input, mode, yafa, language, autoDetectMode } = parse.data
  
  let finalMode = mode as Mode
  let modeDetection = undefined
  
  // Auto-detect mode if YAFA is enabled and autoDetectMode is true
  if (yafa && autoDetectMode) {
    console.log('Auto-detecting professional mode from user input...')
    try {
      const detectionResult = await modeDetectionAgent.detectModeFromPrompt(input)
      finalMode = detectionResult.detectedMode
      modeDetection = {
        wasAutoDetected: true,
        detectedMode: detectionResult.detectedMode,
        confidence: detectionResult.confidence,
        reasoning: detectionResult.reasoning,
        keywords: detectionResult.keywords,
        alternativeModes: detectionResult.alternativeModes
      }
      console.log(`Detected mode: ${finalMode} (confidence: ${detectionResult.confidence})`)
    } catch (error) {
      console.error('Mode auto-detection failed:', error)
      
      // If LLM is not configured, return proper error
      if (error instanceof Error && error.message.includes('LLM_CONFIGURATION_REQUIRED')) {
        return res.status(500).json({ 
          error: 'LLM_CONFIGURATION_REQUIRED',
          message: 'YAFA auto-detection requires LLM access. Please configure OPENAI_API_KEY or ANTHROPIC_API_KEY environment variables.',
          setupInstructions: {
            openai: 'Get API key from https://platform.openai.com/api-keys',
            anthropic: 'Get API key from https://console.anthropic.com/settings/keys',
            environment: 'Set OPENAI_API_KEY=sk-your-key-here or ANTHROPIC_API_KEY=sk-ant-your-key-here'
          }
        })
      }
      
      // Fall back to provided mode for other errors
      modeDetection = {
        wasAutoDetected: false,
        detectedMode: undefined,
        confidence: 0,
        reasoning: 'Auto-detection failed, using manual selection',
        keywords: [],
        alternativeModes: []
      }
    }
  }
  
  // Create cache key from request parameters (include final mode for caching)
  const cacheKey = { input, mode: finalMode, yafa: !!yafa, language: language || 'en' }
  
  // Check cache first
  const cachedResult = promptCache.get(cacheKey)
  if (cachedResult) {
    console.log('Cache hit for prompt generation')
    // If cached result is old format (just string), upgrade it
    if (typeof cachedResult === 'string') {
      return res.json({ 
        prompt: cachedResult, 
        cached: true,
        quality: null,
        version: '1.0.0',
        modeDetection
      })
    }
    return res.json({ ...cachedResult, cached: true, modeDetection })
  }
  
  console.log('Cache miss - generating new prompt')
  const startTime = Date.now()
  const ir = createInitialIR({ 
    id: crypto.randomUUID(), 
    mission: input, 
    mode: finalMode, 
    yafa, 
    language,
    modeDetection 
  })
  
  try {
    const result = await runPipeline(ir)
    
    // Score the generated prompt quality
    console.log('Analyzing prompt quality...')
    const qualityScore = await qualityScorer.scorePrompt(result.prompt, input)
    const responseTime = Date.now() - startTime
    
    // Track analytics (use final mode for analytics)
    trackAnalytics(finalMode, responseTime, qualityScore.overall, true)
    
    // Enhanced result with quality metrics
    const enhancedResult = {
      prompt: result.prompt,
      cached: false,
      quality: qualityScore,
      generated_at: new Date().toISOString(),
      version: '3.0.0', // Enhanced version with mode auto-detection
      responseTime: responseTime + 'ms',
      modeDetection,
      finalMode
    }
    
    // Cache the result for future requests
    promptCache.set(cacheKey, enhancedResult, 15) // Cache for 15 minutes
    
    res.json(enhancedResult)
  } catch (e: any) {
    const responseTime = Date.now() - startTime
    trackAnalytics(finalMode, responseTime, undefined, false)
    
    // Handle LLM configuration errors with helpful messages
    if (e?.message?.includes('LLM_CONFIGURATION_REQUIRED')) {
      return res.status(500).json({ 
        error: 'LLM_CONFIGURATION_REQUIRED',
        message: 'YAFA requires LLM access for intelligent prompt generation. Please configure API keys.',
        setupInstructions: {
          openai: 'Get API key from https://platform.openai.com/api-keys',
          anthropic: 'Get API key from https://console.anthropic.com/settings/keys',
          environment: 'Set OPENAI_API_KEY=sk-your-key-here or ANTHROPIC_API_KEY=sk-ant-your-key-here'
        }
      })
    }
    
    res.status(500).json({ error: e?.message || 'Pipeline error' })
  }
})

export default router



