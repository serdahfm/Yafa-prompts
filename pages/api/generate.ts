import { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import crypto from 'crypto'

// Import all the necessary modules from the shared lib
import { createInitialIR, Mode } from '../lib/core/promptIR'
import { runPipeline } from '../lib/core/stateMachine'
import { promptCache } from '../lib/providers/cache'
import { modeDetectionAgent } from '../lib/agents/modeDetectionAgent'

const GenerateSchema = z.object({
  input: z.string().min(1),
  mode: z.string().min(1),
  yafa: z.boolean().optional(),
  language: z.string().optional(),
  autoDetectMode: z.boolean().optional(),
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

  const parse = GenerateSchema.safeParse(req.body)
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid body' })
  }

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
          message: 'YAFA requires LLM access for intelligent prompt generation. Please configure API keys.',
          setupInstructions: {
            openai: 'Get API key from https://platform.openai.com/api-keys',
            anthropic: 'Get API key from https://console.anthropic.com/settings/keys',
            environment: 'Set OPENAI_API_KEY=sk-your-key-here or ANTHROPIC_API_KEY=sk-ant-your-key-here'
          }
        })
      }
      
      // For other auto-detection errors, continue with original mode
      console.log(`Continuing with original mode: ${mode}`)
      finalMode = mode
    }
  }
  
  // Create cache key from request parameters
  const cacheKey = { input, mode: finalMode, yafa: !!yafa, language: language || 'en' }
  
  // Check cache first
  const cachedResult = promptCache.get(cacheKey)
  if (cachedResult) {
    console.log('Cache hit for prompt generation')
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
    const responseTime = Date.now() - startTime
    
    // Extract quality metadata from the pipeline result IR
    const finalIR = result.ir
    const qualityScore = finalIR.qualityMetadata?.finalScore || null
    const qualityIterations = finalIR.qualityMetadata?.iterations || 1
    const improvementLog = finalIR.qualityMetadata?.improvementLog || []
    
    // Enhanced result with quality metrics
    const enhancedResult = {
      prompt: result.prompt,
      cached: false,
      quality: qualityScore,
      qualityMetadata: finalIR.qualityMetadata ? {
        iterations: qualityIterations,
        improvementLog: improvementLog,
        qualityThresholdMet: (qualityScore?.overall || 0) >= 85
      } : null,
      generated_at: new Date().toISOString(),
      version: '4.0.0', // Enhanced version with quality gates
      responseTime: responseTime + 'ms',
      modeDetection,
      finalMode
    }
    
    // Cache the result for future requests
    promptCache.set(cacheKey, enhancedResult, 15) // Cache for 15 minutes
    
    res.json(enhancedResult)
  } catch (e: any) {
    const responseTime = Date.now() - startTime
    
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
}
