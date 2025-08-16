import { z } from 'zod'

export type Mode =
  | 'General Purpose'
  // Technology Sector
  | 'DevOps Engineer'
  | 'Data Scientist'
  | 'Cybersecurity Analyst'
  | 'Product Manager'
  | 'UX/UI Designer'
  | 'Software Architect'
  | 'Machine Learning Engineer'
  | 'Cloud Solutions Architect'
  // Healthcare & Life Sciences
  | 'Clinical Researcher'
  | 'Medical Writer'
  | 'Biostatistician'
  | 'Pharmaceutical Analyst'
  | 'Regulatory Affairs Specialist'
  // Finance & Legal
  | 'Financial Analyst'
  | 'Compliance Officer'
  | 'Legal Researcher'
  | 'Investment Analyst'
  | 'Risk Management Specialist'
  // Marketing & Sales
  | 'Content Strategist'
  | 'Sales Engineer'
  | 'Brand Manager'
  | 'Growth Hacker'
  | 'Digital Marketing Specialist'
  // Original broad categories (for backward compatibility)
  | 'Science Researcher / Laboratory Professional'
  | 'Process Engineer / Development Engineer'
  | 'Business Consultant / Developer / Market Analyst'

export const ConstraintsSchema = z.object({
  noAssumptions: z.literal(true),
  twoPartDelivery: z.literal(true),
  outputFormatConstraints: z.literal(true),
  markdownLiteForPart2: z.literal(true),
})
export type Constraints = z.infer<typeof ConstraintsSchema>

export const RequirementSlotSchema = z.object({
  key: z.string(),
  label: z.string(),
  required: z.boolean().default(true),
  value: z.string().optional(),
})
export type RequirementSlot = z.infer<typeof RequirementSlotSchema>

export const AcceptanceCriteriaSchema = z.object({
  bullets: z.array(z.string()),
})
export type AcceptanceCriteria = z.infer<typeof AcceptanceCriteriaSchema>

// Advanced Prompt Engineering Techniques Schema
export const ChainOfThoughtConfigSchema = z.object({
  enabled: z.boolean().default(false),
  stepCount: z.number().min(2).max(8).default(4),
  reasoningStyle: z.enum(['explicit', 'implicit', 'structured']).default('structured'),
  domainSpecific: z.boolean().default(true),
  includeReasoning: z.boolean().default(true)
})
export type ChainOfThoughtConfig = z.infer<typeof ChainOfThoughtConfigSchema>

export const FewShotConfigSchema = z.object({
  enabled: z.boolean().default(false),
  exampleCount: z.enum([2, 3, 5]).default(3),
  qualityLevel: z.enum(['basic', 'intermediate', 'expert']).default('expert'),
  domainSpecific: z.boolean().default(true),
  includeCounterExamples: z.boolean().default(false)
})
export type FewShotConfig = z.infer<typeof FewShotConfigSchema>

export const ZeroShotConfigSchema = z.object({
  enabled: z.boolean().default(true),
  contextRichness: z.enum(['minimal', 'standard', 'comprehensive']).default('comprehensive'),
  instructionClarity: z.enum(['basic', 'detailed', 'explicit']).default('explicit'),
  constraintSpecificity: z.boolean().default(true),
  outputFormatting: z.boolean().default(true)
})
export type ZeroShotConfig = z.infer<typeof ZeroShotConfigSchema>

export const AdvancedTechniquesSchema = z.object({
  chainOfThought: ChainOfThoughtConfigSchema.optional(),
  fewShot: FewShotConfigSchema.optional(),
  zeroShot: ZeroShotConfigSchema.optional(),
  complexity: z.enum(['simple', 'moderate', 'complex']).default('moderate'),
  autoSelect: z.boolean().default(true)
})
export type AdvancedTechniques = z.infer<typeof AdvancedTechniquesSchema>

export const ModeDetectionMetadataSchema = z.object({
  wasAutoDetected: z.boolean(),
  detectedMode: z.enum([
    'General Purpose',
    // Technology Sector
    'DevOps Engineer',
    'Data Scientist',
    'Cybersecurity Analyst',
    'Product Manager',
    'UX/UI Designer',
    'Software Architect',
    'Machine Learning Engineer',
    'Cloud Solutions Architect',
    // Healthcare & Life Sciences
    'Clinical Researcher',
    'Medical Writer',
    'Biostatistician',
    'Pharmaceutical Analyst',
    'Regulatory Affairs Specialist',
    // Finance & Legal
    'Financial Analyst',
    'Compliance Officer',
    'Legal Researcher',
    'Investment Analyst',
    'Risk Management Specialist',
    // Marketing & Sales
    'Content Strategist',
    'Sales Engineer',
    'Brand Manager',
    'Growth Hacker',
    'Digital Marketing Specialist',
    // Original broad categories
    'Science Researcher / Laboratory Professional',
    'Process Engineer / Development Engineer', 
    'Business Consultant / Developer / Market Analyst'
  ]).optional(),
  confidence: z.number().optional(),
  reasoning: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  alternativeModes: z.array(z.object({
    mode: z.enum([
      'General Purpose',
      'DevOps Engineer',
      'Data Scientist',
      'Cybersecurity Analyst',
      'Product Manager',
      'UX/UI Designer',
      'Software Architect',
      'Machine Learning Engineer',
      'Cloud Solutions Architect',
      'Clinical Researcher',
      'Medical Writer',
      'Biostatistician',
      'Pharmaceutical Analyst',
      'Regulatory Affairs Specialist',
      'Financial Analyst',
      'Compliance Officer',
      'Legal Researcher',
      'Investment Analyst',
      'Risk Management Specialist',
      'Content Strategist',
      'Sales Engineer',
      'Brand Manager',
      'Growth Hacker',
      'Digital Marketing Specialist',
      'Science Researcher / Laboratory Professional',
      'Process Engineer / Development Engineer', 
      'Business Consultant / Developer / Market Analyst'
    ]),
    confidence: z.number()
  })).optional(),
  recommendedTechniques: z.array(z.enum(['chain-of-thought', 'few-shot', 'zero-shot', 'prompt-chaining'])).optional()
})
export type ModeDetectionMetadata = z.infer<typeof ModeDetectionMetadataSchema>

export const QualityMetadataSchema = z.object({
  finalScore: z.object({
    overall: z.number(),
    breakdown: z.object({
      clarity: z.number(),
      completeness: z.number(),
      effectiveness: z.number(),
      professional: z.number(),
    }),
    recommendations: z.array(z.string()),
    confidence: z.number(),
  }),
  iterations: z.number(),
  improvementLog: z.array(z.string()),
})
export type QualityMetadata = z.infer<typeof QualityMetadataSchema>

export const PromptIRSchema = z.object({
  id: z.string(),
  language: z.string().default('en'),
  mission: z.string(),
  mode: z.enum([
    'General Purpose',
    // Technology Sector
    'DevOps Engineer',
    'Data Scientist',
    'Cybersecurity Analyst',
    'Product Manager',
    'UX/UI Designer',
    'Software Architect',
    'Machine Learning Engineer',
    'Cloud Solutions Architect',
    // Healthcare & Life Sciences
    'Clinical Researcher',
    'Medical Writer',
    'Biostatistician',
    'Pharmaceutical Analyst',
    'Regulatory Affairs Specialist',
    // Finance & Legal
    'Financial Analyst',
    'Compliance Officer',
    'Legal Researcher',
    'Investment Analyst',
    'Risk Management Specialist',
    // Marketing & Sales
    'Content Strategist',
    'Sales Engineer',
    'Brand Manager',
    'Growth Hacker',
    'Digital Marketing Specialist',
    // Original broad categories
    'Science Researcher / Laboratory Professional',
    'Process Engineer / Development Engineer', 
    'Business Consultant / Developer / Market Analyst'
  ]),
  yafa: z.boolean().default(false),
  constraints: ConstraintsSchema,
  requirementSlots: z.array(RequirementSlotSchema),
  clarifyingQuestions: z.array(z.string()).default([]),
  acceptance: AcceptanceCriteriaSchema,
  composedPrompt: z.string().optional(),
  modeDetection: ModeDetectionMetadataSchema.optional(),
  advancedTechniques: AdvancedTechniquesSchema.optional(),
  qualityMetadata: QualityMetadataSchema.optional(),
})
export type PromptIR = z.infer<typeof PromptIRSchema>

export function createInitialIR(params: {
  id: string
  mission: string
  mode: Mode
  yafa?: boolean
  language?: string
  modeDetection?: ModeDetectionMetadata
  advancedTechniques?: AdvancedTechniques
}): PromptIR {
  const constraints: Constraints = {
    noAssumptions: true,
    twoPartDelivery: true,
    outputFormatConstraints: true,
    markdownLiteForPart2: true,
  }

  const requirementSlots: RequirementSlot[] = baseRequirementSlots(params.mode)

  // Auto-configure advanced techniques based on mission complexity and YAFA mode
  const defaultAdvancedTechniques: AdvancedTechniques = params.yafa ? {
    chainOfThought: {
      enabled: shouldUseChainOfThought(params.mission, params.mode),
      stepCount: determineStepCount(params.mission),
      reasoningStyle: 'structured',
      domainSpecific: true,
      includeReasoning: true
    },
    fewShot: {
      enabled: shouldUseFewShot(params.mission, params.mode),
      exampleCount: 3,
      qualityLevel: 'expert',
      domainSpecific: true,
      includeCounterExamples: false
    },
    zeroShot: {
      enabled: true,
      contextRichness: 'comprehensive',
      instructionClarity: 'explicit',
      constraintSpecificity: true,
      outputFormatting: true
    },
    complexity: assessComplexity(params.mission),
    autoSelect: true
  } : {
    zeroShot: {
      enabled: true,
      contextRichness: 'standard',
      instructionClarity: 'detailed',
      constraintSpecificity: false,
      outputFormatting: true
    },
    complexity: 'simple',
    autoSelect: false
  }

  return {
    id: params.id,
    mission: params.mission,
    mode: params.mode,
    yafa: Boolean(params.yafa),
    language: params.language ?? 'en',
    constraints,
    requirementSlots,
    clarifyingQuestions: [],
    acceptance: { bullets: [] },
    modeDetection: params.modeDetection,
    advancedTechniques: params.advancedTechniques ?? defaultAdvancedTechniques,
  }
}

// Helper functions for intelligent technique selection
function shouldUseChainOfThought(mission: string, mode: Mode): boolean {
  const complexKeywords = ['analyze', 'design', 'implement', 'optimize', 'troubleshoot', 'plan', 'strategy', 'architecture']
  const missionLower = mission.toLowerCase()
  const hasComplexKeywords = complexKeywords.some(keyword => missionLower.includes(keyword))
  const isComplexMode = ['Software Architect', 'Data Scientist', 'DevOps Engineer', 'Business Consultant / Developer / Market Analyst'].includes(mode)
  
  return hasComplexKeywords || isComplexMode || mission.length > 100
}

function shouldUseFewShot(mission: string, mode: Mode): boolean {
  const fewShotKeywords = ['example', 'template', 'format', 'style', 'pattern', 'similar to']
  const missionLower = mission.toLowerCase()
  const hasExampleKeywords = fewShotKeywords.some(keyword => missionLower.includes(keyword))
  const isCreativeMode = ['UX/UI Designer', 'Content Strategist', 'Brand Manager'].includes(mode)
  
  return hasExampleKeywords || isCreativeMode
}

function determineStepCount(mission: string): number {
  if (mission.length < 50) return 3
  if (mission.length < 100) return 4
  if (mission.length < 200) return 5
  return 6
}

function assessComplexity(mission: string): 'simple' | 'moderate' | 'complex' {
  const complexityIndicators = {
    simple: ['help', 'explain', 'describe', 'list'],
    moderate: ['analyze', 'compare', 'evaluate', 'design'],
    complex: ['optimize', 'architect', 'implement', 'troubleshoot', 'strategy']
  }
  
  const missionLower = mission.toLowerCase()
  
  if (complexityIndicators.complex.some(word => missionLower.includes(word))) return 'complex'
  if (complexityIndicators.moderate.some(word => missionLower.includes(word))) return 'moderate'
  return 'simple'
}

function baseRequirementSlots(mode: Mode): RequirementSlot[] {
  const common: RequirementSlot[] = [
    { key: 'audience', label: 'Intended Audience', required: true },
    { key: 'deliverableType', label: 'Deliverable Type', required: true },
    { key: 'constraints', label: 'Key Constraints', required: true },
  ]
  switch (mode) {
    case 'Science Researcher / Laboratory Professional':
      return [
        ...common,
        { key: 'methodology', label: 'Methodology/Protocol', required: true },
        { key: 'dataContext', label: 'Data/Specimens Context', required: false },
      ]
    case 'Process Engineer / Development Engineer':
      return [
        ...common,
        { key: 'systemContext', label: 'System/Architecture Context', required: true },
        { key: 'performanceTargets', label: 'Performance Targets', required: false },
      ]
    case 'Business Consultant / Developer / Market Analyst':
      return [
        ...common,
        { key: 'marketContext', label: 'Market/Business Context', required: true },
        { key: 'successCriteria', label: 'Success Criteria', required: false },
      ]
    default:
      return common
  }
}



