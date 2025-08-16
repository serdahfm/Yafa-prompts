import { createLLMClientFromEnv } from '../providers/llm'

export async function buildCorrectionPrompt(params: {
  mode: string
  mission: string
  failed: string
  issue: string
  yafa?: boolean
}): Promise<string> {
  const llmClient = createLLMClientFromEnv()
  
  const metaPrompt = `You are an expert prompt engineer specializing in creating corrective prompts for AI systems. Generate a highly effective correction prompt based on the following context:

PROFESSIONAL MODE: ${params.mode}
ORIGINAL MISSION: ${params.mission}
FAILED OUTPUT: ${params.failed}
IDENTIFIED ISSUES: ${params.issue}
YAFA MODE: ${params.yafa ? 'ENABLED - Require extremely technical detail and critical analysis' : 'DISABLED'}

Create a prompt that:
1. Clearly establishes the professional role and context
2. References the original mission and failed attempt
3. Specifically addresses the identified issues
4. Provides clear guidance for correction
5. Sets expectations for deliverable format
6. ${params.yafa ? 'Includes YAFA mode requirements for technical rigor and critical thinking' : 'Maintains professional standards'}

Generate a comprehensive correction prompt that will produce better results:`

  try {
    const correctionPrompt = await llmClient.complete(metaPrompt, {
      temperature: 0.7,
      maxTokens: 1500,
    })
    
    return correctionPrompt
  } catch (error) {
    console.error('LLM correction prompt generation failed, using fallback:', error)
    
    // Fallback to original template-based correction
    const lines: string[] = []
    lines.push('FOLLOW-UP CORRECTION')
    lines.push(`ROLE: ${params.mode}`)
    lines.push('')
    lines.push(`CONTEXT: Original task: ${params.mission}`)
    lines.push(`FAILED OUTPUT: ${params.failed}`)
    lines.push(`ISSUES: ${params.issue}`)
    lines.push('')
    lines.push('MANDATE: Fix the issues explicitly. Ask any missing questions first and wait for confirmation.')
    lines.push('Then deliver Part 1 (Final Product, complete raw content) and Part 2 (Conversational Breakdown, Markdown-lite).')
    lines.push('Avoid preformatted code blocks/snippets unless explicitly requested; no canvas by default.')
    if (params.yafa) {
      lines.push('YAFA MODE: Be extremely technical; challenge your strategy; re-check root causes.')
    }
    return lines.join('\n')
  }
}



