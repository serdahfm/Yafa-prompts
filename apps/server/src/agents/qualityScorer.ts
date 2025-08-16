import { createLLMClientFromEnv } from '../providers/llm'

export interface QualityScore {
  overall: number
  breakdown: {
    clarity: number
    completeness: number
    effectiveness: number
    professional: number
  }
  recommendations: string[]
  confidence: number
}

export class QualityScorer {
  private llmClient = createLLMClientFromEnv()

  async scorePrompt(prompt: string, taskType: string): Promise<QualityScore> {
    const scoringPrompt = this.buildScoringPrompt(prompt, taskType)
    
    try {
      const response = await this.llmClient.complete(scoringPrompt, {
        temperature: 0.3, // Lower temperature for consistent scoring
        maxTokens: 1000,
      })
      
      return this.parseQualityResponse(response)
    } catch (error) {
      console.error('Quality scoring failed:', error)
      return this.generateFallbackScore(prompt)
    }
  }

  private buildScoringPrompt(prompt: string, taskType: string): string {
    return `You are an expert prompt quality assessor. Analyze the following prompt and provide a detailed quality score.

TASK TYPE: ${taskType}

PROMPT TO ANALYZE:
${prompt}

Evaluate the prompt on these dimensions (score 0-100 for each):

1. CLARITY (0-100): How clear and understandable is the prompt?
   - Are instructions easy to follow?
   - Is the language unambiguous?
   - Are expectations clearly set?

2. COMPLETENESS (0-100): Does the prompt include all necessary elements?
   - Role definition
   - Context/background
   - Requirements/constraints
   - Success criteria

3. EFFECTIVENESS (0-100): How likely is this prompt to produce good results?
   - Will it guide the AI to the desired outcome?
   - Are the instructions actionable?
   - Is the structure logical?

4. PROFESSIONAL (0-100): Does it meet professional standards?
   - Appropriate terminology
   - Industry best practices
   - Professional tone and structure

Respond in this exact JSON format:
{
  "clarity": [score],
  "completeness": [score], 
  "effectiveness": [score],
  "professional": [score],
  "recommendations": [
    "specific recommendation 1",
    "specific recommendation 2"
  ],
  "confidence": [0-100]
}`
  }

  private parseQualityResponse(response: string): QualityScore {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const parsed = JSON.parse(jsonMatch[0])
      
      const overall = Math.round(
        (parsed.clarity + parsed.completeness + parsed.effectiveness + parsed.professional) / 4
      )

      return {
        overall,
        breakdown: {
          clarity: parsed.clarity,
          completeness: parsed.completeness,
          effectiveness: parsed.effectiveness,
          professional: parsed.professional,
        },
        recommendations: parsed.recommendations || [],
        confidence: parsed.confidence || 85,
      }
    } catch (error) {
      console.error('Failed to parse quality response:', error)
      return this.generateFallbackScore(response)
    }
  }

  private generateFallbackScore(prompt: string): QualityScore {
    // Simple heuristic-based scoring as fallback
    const wordCount = prompt.split(' ').length
    const hasRole = /role|you are/i.test(prompt)
    const hasContext = /context|background/i.test(prompt)
    const hasRequirements = /requirement|must|should/i.test(prompt)
    
    const clarity = Math.min(90, 60 + (hasRole ? 10 : 0) + (hasContext ? 10 : 0))
    const completeness = 50 + (hasRole ? 15 : 0) + (hasContext ? 15 : 0) + (hasRequirements ? 15 : 0)
    const effectiveness = Math.min(85, 40 + Math.min(30, wordCount / 10))
    const professional = hasRole && hasContext ? 80 : 65
    
    return {
      overall: Math.round((clarity + completeness + effectiveness + professional) / 4),
      breakdown: { clarity, completeness, effectiveness, professional },
      recommendations: [
        'Quality scoring performed with fallback heuristics',
        'Consider improving prompt structure for better analysis'
      ],
      confidence: 60,
    }
  }
}

export const qualityScorer = new QualityScorer()
