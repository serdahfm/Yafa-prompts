import { PromptIR } from '../promptIR'
import { promptGenerator } from '../../agents/promptGenerator'
import { advancedPromptGenerator } from '../../agents/advancedPromptGenerator'

export async function runTemplateCompose(ir: PromptIR): Promise<PromptIR> {
  try {
    // Use Advanced Prompt Generation for YAFA mode with techniques
    if (ir.yafa && ir.advancedTechniques) {
      console.log(`🧠 Using advanced prompt generation with techniques for ${ir.mode}`)
      
      const advancedResult = await advancedPromptGenerator.generateAdvancedPrompt(ir, {
        enhanceWithTechniques: true,
        explainTechniques: false, // Keep clean for user
        includeMetadata: true
      })

      console.log(`✅ Advanced techniques applied: ${advancedResult.techniquesUsed.join(', ')}`)
      console.log(`📊 Effectiveness score: ${Math.round(advancedResult.metadata.effectivenessScore * 100)}%`)
      
      return { ...ir, composedPrompt: advancedResult.prompt }
    }

    // Fallback to standard LLM generation
    const generatedPrompt = await promptGenerator.generatePrompt(ir, {
      temperature: ir.yafa ? 0.8 : 0.7, // Higher creativity for YAFA mode
      useYAFAMode: ir.yafa,
    })
    
    return { ...ir, composedPrompt: generatedPrompt }
  } catch (error) {
    console.error('🚨 CRITICAL: LLM prompt generation failed:', error)
    
    // Check if this is an LLM configuration error
    if (error instanceof Error && error.message.includes('LLM_NOT_CONFIGURED')) {
      console.error('💡 YAFA requires LLM access for intelligent prompt generation')
      console.error('📋 Please configure OpenAI or Anthropic API keys')
      throw new Error('LLM_CONFIGURATION_REQUIRED: YAFA requires LLM access. Please configure OPENAI_API_KEY or ANTHROPIC_API_KEY environment variables.')
    }
    
    // For other LLM errors (rate limits, network issues, etc.), provide helpful fallback
    console.warn('⚠️  LLM temporarily unavailable, using enhanced template fallback')
    
    // Enhanced template that acknowledges the limitation
    const lines: string[] = []
    lines.push(`⚠️  LLM-GENERATED PROMPT UNAVAILABLE`)
    lines.push(`This is a template fallback. For optimal YAFA experience, configure LLM API keys.`)
    lines.push('')
    lines.push(`PROFESSIONAL CONTEXT: ${ir.mode}`)
    lines.push(`ENHANCED MODE: ${ir.yafa ? 'ENABLED' : 'DISABLED'}`)
    lines.push('')
    lines.push('ROLE: You are an expert professional operating with the following context.')
    lines.push('')
    lines.push('ACCOUNTABILITY: You are accountable for completeness, accuracy, and professional delivery.')
    lines.push('')
    lines.push('INFORMATION GATHERING:')
    if (ir.clarifyingQuestions.length > 0) {
      for (const q of ir.clarifyingQuestions) lines.push(`- ${q}`)
    } else {
      lines.push('- Identify and ask any critical questions before proceeding')
      lines.push('- Ensure all requirements are clearly understood')
    }
    lines.push('')
    lines.push('DELIVERABLE REQUIREMENTS:')
    lines.push('- Provide complete, professional-quality output appropriate for your field')
    lines.push('- Include implementation details and actionable guidance')
    lines.push('- Explain methodology and reasoning clearly')
    lines.push('')
    if (ir.yafa) {
      lines.push('ENHANCED ANALYSIS MODE:')
      lines.push('- Apply extreme technical rigor and critical analysis')
      lines.push('- Challenge assumptions and provide evidence-based recommendations')
      lines.push('- Consider multiple approaches and explain trade-offs')
      lines.push('- Focus on root cause analysis and systematic problem-solving')
      lines.push('')
    }
    lines.push(`PRIMARY TASK: ${ir.mission}`)
    
    return { ...ir, composedPrompt: lines.join('\n') }
  }
}



