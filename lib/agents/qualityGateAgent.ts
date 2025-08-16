import { PromptIR } from '../core/promptIR'
import { qualityScorer, QualityScore } from './qualityScorer'
import { createLLMClientFromEnv } from '../providers/llm'

export interface QualityGateResult {
  finalPrompt: string
  qualityScore: QualityScore
  iterations: number
  improvementLog: string[]
}

export class QualityGateAgent {
  private readonly QUALITY_THRESHOLD = 85
  private readonly MAX_ITERATIONS = 3

  async enforceQualityThreshold(ir: PromptIR): Promise<QualityGateResult> {
    if (!ir.composedPrompt) {
      throw new Error('No composed prompt to evaluate')
    }

    let currentPrompt = ir.composedPrompt
    let iterations = 0
    const improvementLog: string[] = []
    let qualityScore: QualityScore

    console.log('🎯 Starting quality gate enforcement...')

    while (iterations < this.MAX_ITERATIONS) {
      iterations++
      console.log(`📊 Quality check iteration ${iterations}...`)

      // Score the current prompt
      qualityScore = await qualityScorer.scorePrompt(currentPrompt, ir.mission)
      
      console.log(`📈 Quality Score: ${qualityScore.overall}% (Target: ${this.QUALITY_THRESHOLD}%)`)
      console.log(`📋 Breakdown: Clarity=${qualityScore.breakdown.clarity}%, Completeness=${qualityScore.breakdown.completeness}%, Effectiveness=${qualityScore.breakdown.effectiveness}%, Professional=${qualityScore.breakdown.professional}%`)

      // If quality meets threshold, we're done
      if (qualityScore.overall >= this.QUALITY_THRESHOLD) {
        console.log(`✅ Quality threshold met on iteration ${iterations}`)
        break
      }

      // If we've reached max iterations, accept what we have
      if (iterations >= this.MAX_ITERATIONS) {
        console.log(`⚠️  Reached max iterations (${this.MAX_ITERATIONS}), accepting current quality`)
        improvementLog.push(`Final attempt: Quality ${qualityScore.overall}% (below threshold but max iterations reached)`)
        break
      }

      // Generate improvement instructions based on quality breakdown
      const improvementInstructions = this.generateImprovementInstructions(qualityScore, ir)
      improvementLog.push(`Iteration ${iterations}: Quality ${qualityScore.overall}% - ${improvementInstructions}`)

      console.log(`🔄 Refining prompt: ${improvementInstructions}`)

      // Create refined prompt
      try {
        currentPrompt = await this.refinePrompt(currentPrompt, improvementInstructions, ir)
      } catch (error) {
        console.error(`❌ Refinement failed on iteration ${iterations}:`, error)
        improvementLog.push(`Iteration ${iterations}: Refinement failed - ${error}`)
        break
      }
    }

    return {
      finalPrompt: currentPrompt,
      qualityScore: qualityScore!,
      iterations,
      improvementLog
    }
  }

  private generateImprovementInstructions(qualityScore: QualityScore, ir: PromptIR): string {
    const issues: string[] = []
    const { breakdown } = qualityScore

    // Identify specific areas needing improvement
    if (breakdown.clarity < 80) {
      issues.push('improve clarity and remove ambiguity')
    }
    if (breakdown.completeness < 80) {
      issues.push('add missing role definition, context, or requirements')
    }
    if (breakdown.effectiveness < 80) {
      issues.push('enhance actionability and logical structure')
    }
    if (breakdown.professional < 80) {
      issues.push('improve professional terminology and industry standards')
    }

    // Use specific recommendations if available
    if (qualityScore.recommendations.length > 0) {
      const topRecommendations = qualityScore.recommendations.slice(0, 2)
      issues.push(...topRecommendations.map(rec => rec.toLowerCase()))
    }

    return issues.length > 0 
      ? issues.join(', ')
      : 'enhance overall prompt quality and effectiveness'
  }

  private async refinePrompt(currentPrompt: string, improvementInstructions: string, ir: PromptIR): Promise<string> {
    const refinementPrompt = `You are an expert prompt engineer. Your task is to refine and improve an existing prompt.

PROFESSIONAL CONTEXT: ${ir.mode}
ORIGINAL USER REQUEST: ${ir.mission}
IMPROVEMENT AREAS: ${improvementInstructions}

CURRENT PROMPT (TO BE IMPROVED):
---START PROMPT---
${currentPrompt}
---END PROMPT---

REFINEMENT INSTRUCTIONS:
1. Keep the same professional role and context (${ir.mode})
2. Maintain focus on the original user request: "${ir.mission}"
3. Address these specific improvement areas: ${improvementInstructions}
4. Improve clarity, completeness, effectiveness, and professional quality
5. ${ir.yafa ? 'Apply YAFA standards for technical rigor and critical analysis' : 'Focus on practical clarity and actionability'}
6. Return ONLY the refined prompt - no meta-commentary or explanations

OUTPUT FORMAT: Return the improved prompt as a clean, professional prompt ready for use.`

    try {
      // Use direct LLM client to avoid pipeline recursion
      const llmClient = createLLMClientFromEnv()
      
      const refinedPrompt = await llmClient.complete(refinementPrompt, {
        temperature: 0.7,
        maxTokens: 2000,
      })
      
      return refinedPrompt
    } catch (error) {
      console.error('Refinement generation failed:', error)
      throw new Error(`Failed to refine prompt: ${error}`)
    }
  }
}

export const qualityGateAgent = new QualityGateAgent()
