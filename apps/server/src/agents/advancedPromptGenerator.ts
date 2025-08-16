import { LLMClient, createLLMClientFromEnv } from '../providers/llm'
import { PromptIR, Mode, AdvancedTechniques, ChainOfThoughtConfig, FewShotConfig, ZeroShotConfig } from '../core/promptIR'

export interface AdvancedPromptOptions {
  enhanceWithTechniques: boolean
  explainTechniques: boolean
  includeMetadata: boolean
}

export interface PromptGenerationResult {
  prompt: string
  techniquesUsed: string[]
  metadata: {
    complexity: string
    estimatedTokens: number
    effectivenessScore: number
    reasoning: string
  }
}

export class AdvancedPromptGenerator {
  private llm: LLMClient

  constructor() {
    this.llm = createLLMClientFromEnv()
  }

  async generateAdvancedPrompt(
    ir: PromptIR, 
    options: AdvancedPromptOptions = { enhanceWithTechniques: true, explainTechniques: false, includeMetadata: true }
  ): Promise<PromptGenerationResult> {
    
    const techniques = ir.advancedTechniques
    if (!techniques) {
      return this.generateBasicPrompt(ir)
    }

    let prompt = ''
    const techniquesUsed: string[] = []

    // Chain-of-Thought Generation
    if (techniques.chainOfThought?.enabled) {
      prompt = await this.generateChainOfThoughtPrompt(ir, techniques.chainOfThought)
      techniquesUsed.push('Chain-of-Thought Reasoning')
    }
    // Few-Shot Generation  
    else if (techniques.fewShot?.enabled) {
      prompt = await this.generateFewShotPrompt(ir, techniques.fewShot)
      techniquesUsed.push('Few-Shot Learning')
    }
    // Zero-Shot Generation (fallback)
    else {
      prompt = await this.generateZeroShotPrompt(ir, techniques.zeroShot || {
        enabled: true,
        contextRichness: 'comprehensive',
        instructionClarity: 'explicit',
        constraintSpecificity: true,
        outputFormatting: true
      })
      techniquesUsed.push('Zero-Shot Optimization')
    }

    // Add technique explanations if requested
    if (options.explainTechniques) {
      prompt += this.addTechniqueExplanations(techniquesUsed)
    }

    const metadata = {
      complexity: techniques.complexity || 'moderate',
      estimatedTokens: this.estimateTokens(prompt),
      effectivenessScore: this.calculateEffectivenessScore(ir, techniquesUsed),
      reasoning: this.generateReasoningExplanation(ir, techniquesUsed)
    }

    return {
      prompt,
      techniquesUsed,
      metadata
    }
  }

  private async generateChainOfThoughtPrompt(ir: PromptIR, config: ChainOfThoughtConfig): Promise<string> {
    const roleContext = this.getRoleContext(ir.mode)
    const stepStructure = this.generateStepStructure(ir.mission, config.stepCount)
    const enhancedContext = this.generateEnhancedContext(ir)
    
    const cotPromptTemplate = `You are a ${roleContext.title} with ${roleContext.experience}.

${enhancedContext}

Task: ${ir.mission}

Please approach this systematically using the following step-by-step reasoning:

${stepStructure}

${config.domainSpecific ? this.getDomainSpecificGuidance(ir.mode) : ''}

For each step:
- Clearly state your reasoning
- Explain your decision-making process  
- Connect each step to the overall objective
- Use your professional expertise to ensure accuracy

ENHANCED OUTPUT REQUIREMENTS:
- Provide actionable, specific guidance with implementation steps
- Include potential challenges and mitigation strategies
- Reference industry standards and best practices
- Suggest success metrics and validation criteria
- Consider resource requirements and timelines

${config.reasoningStyle === 'structured' ? 'Format your response with clear section headers and bullet points.' : ''}
${config.includeReasoning ? 'Include a final "Reasoning Summary" section explaining your overall approach.' : ''}

QUALITY AMPLIFICATION:
- Challenge your initial assumptions and validate against industry benchmarks
- Consider multiple stakeholder perspectives (technical, business, operational)
- Provide insights that demonstrate real-world experience and proven methodologies

Provide thorough, professional-level output that demonstrates expert knowledge and systematic thinking.`

    return cotPromptTemplate
  }

  private async generateFewShotPrompt(ir: PromptIR, config: FewShotConfig): Promise<string> {
    const roleContext = this.getRoleContext(ir.mode)
    const examples = await this.generateExamples(ir.mode, ir.mission, config)
    const enhancedContext = this.generateEnhancedContext(ir)
    
    const fewShotPromptTemplate = `You are a ${roleContext.title} with ${roleContext.experience}.

${enhancedContext}

Task: ${ir.mission}

Here are ${config.exampleCount} examples of ${config.qualityLevel}-level work in this domain:

${examples}

ENHANCED GUIDANCE REQUIREMENTS:
Following these examples as guidance, provide a response that:
- Matches or exceeds the quality demonstrated in the examples
- Uses similar structure and professional language with enhanced depth
- Incorporates domain-specific best practices and industry standards
- Delivers comprehensive, actionable results with implementation details
- Includes success metrics, potential challenges, and risk mitigation
- Demonstrates expertise through specific methodologies and frameworks

QUALITY AMPLIFICATION:
- Apply the patterns shown but enhance with additional professional insights
- Include resource requirements, timelines, and success validation criteria
- Consider multiple stakeholder perspectives and cross-functional impact
- Provide alternatives and trade-off analysis where appropriate

Your response should demonstrate the same level of expertise and attention to detail shown in the examples above, while providing additional depth and actionability expected from an expert practitioner.`

    return fewShotPromptTemplate
  }

  private async generateZeroShotPrompt(ir: PromptIR, config: ZeroShotConfig): Promise<string> {
    const roleContext = this.getRoleContext(ir.mode)
    const enhancedContext = config.contextRichness === 'comprehensive' ? this.generateEnhancedContext(ir) : ''
    const contextLevel = this.getContextualInformation(ir.mode, config.contextRichness)
    const constraints = config.constraintSpecificity ? this.getSpecificConstraints(ir.mode) : ''
    const formatting = config.outputFormatting ? this.getOutputFormatting(ir.mode) : ''
    
    const instructionClarity = {
      basic: `Please help with: ${ir.mission}`,
      detailed: `As a ${roleContext.title}, please provide comprehensive guidance on: ${ir.mission}`,
      explicit: `You are a ${roleContext.title} with ${roleContext.experience}. Your task is to provide expert-level guidance on: ${ir.mission}

${enhancedContext}

${contextLevel}

ENHANCED REQUIREMENTS:
- Provide specific, actionable recommendations with implementation steps
- Use professional terminology and industry best practices
- Include relevant considerations, potential challenges, and mitigation strategies
- Ensure accuracy and completeness with validation criteria
- Reference industry standards, frameworks, and proven methodologies
- Consider resource requirements, timelines, and success metrics

EXPERT-LEVEL EXPECTATIONS:
- Demonstrate depth of knowledge expected from a ${roleContext.title}
- Provide insights that come from real-world experience
- Include both immediate tactical guidance and strategic considerations
- Address potential risks and provide contingency planning

${constraints}
${formatting}

QUALITY AMPLIFICATION:
- Challenge assumptions and validate against industry benchmarks
- Consider multiple stakeholder perspectives and cross-functional impact
- Provide comprehensive analysis that demonstrates professional expertise`
    }

    return instructionClarity[config.instructionClarity]
  }

  private generateStepStructure(mission: string, stepCount: number): string {
    const baseSteps = [
      "1. **Analysis & Understanding**: Break down the core requirements and context",
      "2. **Planning & Strategy**: Develop a systematic approach to address the challenge", 
      "3. **Implementation Design**: Create detailed steps and methodologies",
      "4. **Execution & Best Practices**: Apply industry standards and proven techniques",
      "5. **Validation & Quality Assurance**: Ensure accuracy and completeness",
      "6. **Optimization & Recommendations**: Suggest improvements and next steps"
    ]

    return baseSteps.slice(0, stepCount).join('\n')
  }

  private getRoleContext(mode: Mode): { title: string; experience: string } {
    const roleMap: Record<Mode, { title: string; experience: string }> = {
      'General Purpose': { title: 'Professional Consultant', experience: 'extensive cross-industry experience' },
      'DevOps Engineer': { title: 'Senior DevOps Engineer', experience: '10+ years in infrastructure automation and CI/CD' },
      'Data Scientist': { title: 'Senior Data Scientist', experience: '8+ years in machine learning and analytics' },
      'UX/UI Designer': { title: 'Senior UX/UI Designer', experience: '7+ years in user experience and interface design' },
      'Software Architect': { title: 'Principal Software Architect', experience: '12+ years in enterprise system design' },
      'Cybersecurity Analyst': { title: 'Senior Cybersecurity Analyst', experience: '9+ years in security and threat analysis' },
      'Product Manager': { title: 'Senior Product Manager', experience: '8+ years in product strategy and development' },
      'Machine Learning Engineer': { title: 'Senior ML Engineer', experience: '7+ years in ML systems and deployment' },
      'Cloud Solutions Architect': { title: 'Principal Cloud Architect', experience: '10+ years in cloud infrastructure design' },
      'Financial Analyst': { title: 'Senior Financial Analyst', experience: '8+ years in financial modeling and analysis' },
      'Legal Researcher': { title: 'Senior Legal Researcher', experience: '10+ years in legal research and analysis' },
      'Content Strategist': { title: 'Senior Content Strategist', experience: '7+ years in content planning and strategy' },
      'Clinical Researcher': { title: 'Senior Clinical Researcher', experience: '10+ years in clinical trials and research' },
      'Medical Writer': { title: 'Senior Medical Writer', experience: '8+ years in medical communications' },
      'Biostatistician': { title: 'Senior Biostatistician', experience: '9+ years in statistical analysis for life sciences' },
      'Pharmaceutical Analyst': { title: 'Senior Pharmaceutical Analyst', experience: '8+ years in drug development analysis' },
      'Regulatory Affairs Specialist': { title: 'Senior Regulatory Affairs Specialist', experience: '10+ years in regulatory compliance' },
      'Compliance Officer': { title: 'Senior Compliance Officer', experience: '9+ years in regulatory compliance' },
      'Investment Analyst': { title: 'Senior Investment Analyst', experience: '8+ years in investment research and analysis' },
      'Risk Management Specialist': { title: 'Senior Risk Management Specialist', experience: '10+ years in risk assessment' },
      'Sales Engineer': { title: 'Senior Sales Engineer', experience: '7+ years in technical sales and solutions' },
      'Brand Manager': { title: 'Senior Brand Manager', experience: '8+ years in brand strategy and management' },
      'Growth Hacker': { title: 'Senior Growth Hacker', experience: '6+ years in growth strategy and optimization' },
      'Digital Marketing Specialist': { title: 'Senior Digital Marketing Specialist', experience: '7+ years in digital marketing' },
      'Science Researcher / Laboratory Professional': { title: 'Principal Research Scientist', experience: '12+ years in scientific research' },
      'Process Engineer / Development Engineer': { title: 'Senior Process Engineer', experience: '10+ years in process optimization' },
      'Business Consultant / Developer / Market Analyst': { title: 'Senior Business Consultant', experience: '10+ years in strategy and market analysis' }
    }

    return roleMap[mode] || { title: 'Professional Expert', experience: 'extensive professional experience' }
  }

  private generateEnhancedContext(ir: PromptIR): string {
    const complexity = ir.advancedTechniques?.complexity || 'moderate'
    const domainContext = this.getAdvancedDomainContext(ir.mode)
    
    return `
ENHANCED PROFESSIONAL CONTEXT:
- Task complexity: ${complexity.toUpperCase()}
- Professional domain: ${ir.mode}
- Enhanced mode: ${ir.yafa ? 'ENABLED (Apply maximum technical rigor and critical analysis)' : 'STANDARD'}
- Advanced techniques: ${ir.advancedTechniques ? 'Optimized for systematic problem-solving' : 'Standard approach'}

${domainContext}

PERFORMANCE EXPECTATIONS:
- Demonstrate depth of knowledge expected from a ${this.getRoleContext(ir.mode).title}
- Provide insights that only come from real-world experience
- Include specific methodologies and proven frameworks
- Address both immediate needs and long-term considerations`
  }

  private getAdvancedDomainContext(mode: Mode): string {
    const advancedDomainContext: Record<string, string> = {
      'DevOps Engineer': `
TECHNICAL CONTEXT:
- Infrastructure: Consider scalability, reliability, and cost optimization
- Security: Apply zero-trust principles, compliance frameworks (SOC2, PCI-DSS)
- Automation: Include CI/CD best practices, infrastructure as code, monitoring
- Metrics: Reference DORA metrics (deployment frequency, lead time, MTTR, change failure rate)
- Tools: Consider industry-standard toolchains and integration patterns`,
      
      'Data Scientist': `
ANALYTICAL CONTEXT:
- Statistics: Apply rigorous statistical methods and validation techniques
- Ethics: Consider bias detection, fairness, and responsible AI principles
- Lifecycle: Address data pipeline, feature engineering, model deployment, and monitoring
- Metrics: Include precision, recall, F1-score, AUC, and business impact measurements
- Governance: Consider data privacy, model interpretability, and regulatory compliance`,
      
      'UX/UI Designer': `
DESIGN CONTEXT:
- Users: Apply user-centered design principles and accessibility standards (WCAG 2.1)
- Research: Include user research methodologies, usability testing, and data-driven decisions
- Systems: Consider design systems, responsive design, and cross-platform consistency
- Metrics: Reference task success rate, user satisfaction, completion time, and engagement
- Process: Include ideation, prototyping, iteration, and stakeholder collaboration`,
      
      'Software Architect': `
ARCHITECTURAL CONTEXT:
- Patterns: Apply proven architectural patterns (microservices, event-driven, hexagonal)
- Quality: Consider scalability, maintainability, security, and performance requirements
- Integration: Address system boundaries, API design, and inter-service communication
- Metrics: Include latency, throughput, availability, and technical debt measurements
- Evolution: Consider future extensibility, technology choices, and migration strategies`,
      
      'Cybersecurity Analyst': `
SECURITY CONTEXT:
- Threats: Assess current threat landscape and attack vectors
- Frameworks: Apply industry frameworks (NIST, CIS Controls, OWASP)
- Compliance: Consider regulatory requirements (GDPR, HIPAA, SOX)
- Metrics: Include risk scores, vulnerability assessments, and incident response times
- Strategy: Address prevention, detection, response, and recovery capabilities`
    }

    return advancedDomainContext[mode] || this.getDomainSpecificGuidance(mode)
  }

  private getDomainSpecificGuidance(mode: Mode): string {
    const domainGuidance: Record<string, string> = {
      'DevOps Engineer': 'Consider infrastructure scalability, security, monitoring, and automation best practices.',
      'Data Scientist': 'Apply statistical rigor, data validation, model evaluation, and interpretability standards.',
      'UX/UI Designer': 'Focus on user research, accessibility, usability testing, and design system consistency.',
      'Software Architect': 'Evaluate scalability, maintainability, security, and system integration patterns.',
      'Cybersecurity Analyst': 'Assess threat models, risk factors, compliance requirements, and security frameworks.'
    }

    return domainGuidance[mode] || 'Apply industry best practices and professional standards.'
  }

  private async generateExamples(mode: Mode, mission: string, config: FewShotConfig): Promise<string> {
    // In a real implementation, this would use the LLM to generate domain-specific examples
    // For now, return structured example placeholders
    const exampleStructure = `
Example 1 (${config.qualityLevel} level):
[Professional approach demonstrating best practices]

Example 2 (${config.qualityLevel} level):
[Alternative methodology with detailed reasoning]

${config.exampleCount >= 3 ? `Example 3 (${config.qualityLevel} level):
[Advanced technique with optimization considerations]` : ''}

${config.includeCounterExamples ? `
Counter-example (what to avoid):
[Common mistakes and why they should be avoided]` : ''}`

    return exampleStructure
  }

  private getContextualInformation(mode: Mode, richness: 'minimal' | 'standard' | 'comprehensive'): string {
    if (richness === 'minimal') return ''
    
    const contextMap: Record<string, string> = {
      'DevOps Engineer': 'Consider current infrastructure, scalability requirements, security constraints, and operational efficiency.',
      'Data Scientist': 'Take into account data quality, statistical significance, model interpretability, and business impact.',
      'UX/UI Designer': 'Consider user personas, accessibility requirements, brand guidelines, and usability principles.'
    }

    return contextMap[mode] || 'Consider relevant professional standards and industry best practices.'
  }

  private getSpecificConstraints(mode: Mode): string {
    const constraintMap: Record<string, string> = {
      'DevOps Engineer': 'Constraints: Follow security best practices, ensure high availability, maintain cost efficiency.',
      'Data Scientist': 'Constraints: Ensure statistical validity, maintain data privacy, provide interpretable results.',
      'UX/UI Designer': 'Constraints: Meet accessibility standards (WCAG 2.1), ensure mobile responsiveness, maintain brand consistency.'
    }

    return constraintMap[mode] || 'Constraints: Follow industry standards and best practices.'
  }

  private getOutputFormatting(mode: Mode): string {
    return `
Output Format:
- Use clear section headers
- Provide bullet points for key recommendations  
- Include specific, actionable steps
- End with a summary of key takeaways`
  }

  private addTechniqueExplanations(techniquesUsed: string[]): string {
    const explanations = {
      'Chain-of-Thought Reasoning': '\n\n--- Technique Note ---\nThis prompt uses Chain-of-Thought reasoning to break down complex problems into systematic steps, improving accuracy and logical flow.',
      'Few-Shot Learning': '\n\n--- Technique Note ---\nThis prompt uses Few-Shot learning with expert examples to guide the AI toward high-quality, consistent outputs.',
      'Zero-Shot Optimization': '\n\n--- Technique Note ---\nThis prompt uses Zero-Shot optimization with rich context and specific instructions for effective performance without examples.'
    }

    return techniquesUsed.map(technique => explanations[technique as keyof typeof explanations] || '').join('')
  }

  private estimateTokens(prompt: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(prompt.length / 4)
  }

  private calculateEffectivenessScore(ir: PromptIR, techniquesUsed: string[]): number {
    let score = 0.7 // Base score

    // Boost for advanced techniques
    if (techniquesUsed.includes('Chain-of-Thought Reasoning')) score += 0.15
    if (techniquesUsed.includes('Few-Shot Learning')) score += 0.1
    if (techniquesUsed.includes('Zero-Shot Optimization')) score += 0.05

    // Boost for YAFA mode
    if (ir.yafa) score += 0.1

    // Boost for specific professional modes
    const complexModes = ['Software Architect', 'Data Scientist', 'DevOps Engineer']
    if (complexModes.includes(ir.mode)) score += 0.05

    return Math.min(score, 0.95) // Cap at 95%
  }

  private generateReasoningExplanation(ir: PromptIR, techniquesUsed: string[]): string {
    const complexity = ir.advancedTechniques?.complexity || 'moderate'
    const primaryTechnique = techniquesUsed[0] || 'Standard prompting'
    
    return `Selected ${primaryTechnique} for ${complexity} complexity task in ${ir.mode} domain. ${ir.yafa ? 'YAFA mode enabled for enhanced professional context.' : 'Standard mode for general guidance.'}`
  }

  private async generateBasicPrompt(ir: PromptIR): Promise<PromptGenerationResult> {
    const roleContext = this.getRoleContext(ir.mode)
    const prompt = `You are a ${roleContext.title} with ${roleContext.experience}. Please provide professional guidance on: ${ir.mission}`
    
    return {
      prompt,
      techniquesUsed: ['Basic Prompting'],
      metadata: {
        complexity: 'simple',
        estimatedTokens: this.estimateTokens(prompt),
        effectivenessScore: 0.6,
        reasoning: 'Basic prompting used due to missing advanced technique configuration.'
      }
    }
  }
}

export const advancedPromptGenerator = new AdvancedPromptGenerator()
