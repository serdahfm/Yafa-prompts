import { LLMClient, createLLMClientFromEnv } from '../providers/llm'
import { PromptIR, Mode } from '../core/promptIR'

export interface PromptGenerationOptions {
  temperature?: number
  maxTokens?: number
  useYAFAMode?: boolean
}

export class LLMPromptGenerator {
  private llmClient: LLMClient

  constructor(llmClient?: LLMClient) {
    this.llmClient = llmClient || createLLMClientFromEnv()
  }

  async generatePrompt(ir: PromptIR, options: PromptGenerationOptions = {}): Promise<string> {
    const metaPrompt = this.buildMetaPrompt(ir, options)
    
    try {
      const generatedPrompt = await this.llmClient.complete(metaPrompt, {
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 2000,
      })
      
      return generatedPrompt
    } catch (error) {
      console.error('LLM prompt generation failed:', error)
      // Fallback to template-based generation if LLM fails
      return this.generateFallbackPrompt(ir)
    }
  }

  private buildMetaPrompt(ir: PromptIR, options: PromptGenerationOptions): string {
    const yafaInstructions = ir.yafa ? this.getYAFAInstructions() : ''
    
    return `You are an expert prompt engineer specializing in creating highly effective prompts for AI systems. Your task is to generate a comprehensive, structured prompt based on the user's needs.

USER'S MISSION/OBJECTIVE: ${ir.mission}

OPTIONAL CONTEXT HINT: ${ir.mode} (use this as light guidance only, don't be overly restrictive)

PROMPT GENERATION APPROACH:
- Analyze the user's mission to understand what they're trying to accomplish
- Create a prompt that would get the best results from any AI system
- Focus on clarity, specificity, and actionable instructions
- Include relevant sections as needed (role, context, requirements, constraints)
- Adapt the structure and complexity to match the task complexity
- Don't force unnecessary complexity if the task is simple

${yafaInstructions}

GENERATION PRINCIPLES:
- Prioritize effectiveness over rigid structure
- Make it as specific as needed but not overly constraining
- Include domain knowledge naturally when relevant to the task
- Focus on what will actually help the AI produce better results
- Avoid jargon unless it serves the specific task
- Keep it practical and actionable

Generate a prompt that will get excellent results for this specific request:`
  }

  private getModeContext(mode: Mode): string {
    switch (mode) {
      case 'General Purpose':
        return `Adapt to the specific task requirements without domain restrictions. Focus on clarity, effectiveness, and practical results.`
      
      // Technology Sector
      case 'DevOps Engineer':
        return `Focus on infrastructure automation, CI/CD pipelines, system reliability, monitoring, containerization, cloud platforms, and operational excellence. Emphasize scalability, security, and performance optimization.`
      
      case 'Data Scientist':
        return `Focus on data analysis, statistical modeling, machine learning, data visualization, hypothesis testing, and insight generation. Emphasize reproducible research, data quality, and actionable insights.`
      
      case 'Cybersecurity Analyst':
        return `Focus on threat assessment, vulnerability analysis, security protocols, risk management, incident response, and compliance. Emphasize defense strategies, threat intelligence, and security frameworks.`
      
      case 'Product Manager':
        return `Focus on product strategy, user requirements, roadmap planning, stakeholder management, market analysis, and feature prioritization. Emphasize user value, business impact, and cross-functional coordination.`
      
      case 'UX/UI Designer':
        return `Focus on user research, design systems, wireframes, prototypes, usability testing, and user experience optimization. Emphasize human-centered design, accessibility, and design thinking methodologies.`
      
      case 'Software Architect':
        return `Focus on system design, architectural patterns, scalability, performance, security, and technical decision-making. Emphasize maintainability, extensibility, and technology selection.`
      
      case 'Machine Learning Engineer':
        return `Focus on ML model development, deployment, MLOps, data pipelines, model performance, and production systems. Emphasize scalability, monitoring, and continuous improvement.`
      
      case 'Cloud Solutions Architect':
        return `Focus on cloud infrastructure, migration strategies, cost optimization, security, and multi-cloud solutions. Emphasize best practices, automation, and business alignment.`
      
      // Healthcare & Life Sciences
      case 'Clinical Researcher':
        return `Focus on clinical trial design, regulatory compliance, patient safety, data integrity, and statistical analysis. Emphasize GCP guidelines, ethical considerations, and scientific rigor.`
      
      case 'Medical Writer':
        return `Focus on clinical documentation, regulatory submissions, scientific publications, and medical communications. Emphasize accuracy, compliance, and clear medical terminology.`
      
      case 'Biostatistician':
        return `Focus on statistical analysis plans, clinical data analysis, regulatory submissions, and biostatistical methodologies. Emphasize statistical rigor and regulatory compliance.`
      
      case 'Pharmaceutical Analyst':
        return `Focus on drug development, market analysis, competitive intelligence, and regulatory pathways. Emphasize commercial viability and strategic insights.`
      
      case 'Regulatory Affairs Specialist':
        return `Focus on regulatory submissions, compliance strategies, approval processes, and regulatory intelligence. Emphasize regulatory requirements and strategic planning.`
      
      // Finance & Legal
      case 'Financial Analyst':
        return `Focus on financial modeling, valuation, risk assessment, market analysis, and investment recommendations. Emphasize quantitative analysis and business insights.`
      
      case 'Compliance Officer':
        return `Focus on regulatory compliance, risk management, policy development, and audit preparation. Emphasize regulatory requirements and organizational governance.`
      
      case 'Legal Researcher':
        return `Focus on legal research, case analysis, regulatory interpretation, and legal documentation. Emphasize accuracy, thoroughness, and legal precedents.`
      
      case 'Investment Analyst':
        return `Focus on investment research, portfolio analysis, market trends, and financial modeling. Emphasize due diligence and investment strategies.`
      
      case 'Risk Management Specialist':
        return `Focus on risk assessment, mitigation strategies, compliance monitoring, and risk reporting. Emphasize proactive risk identification and management.`
      
      // Marketing & Sales
      case 'Content Strategist':
        return `Focus on content planning, editorial calendars, audience analysis, and content performance. Emphasize brand consistency and engagement strategies.`
      
      case 'Sales Engineer':
        return `Focus on technical sales support, solution architecture, customer presentations, and technical proposals. Emphasize customer needs and technical expertise.`
      
      case 'Brand Manager':
        return `Focus on brand strategy, market positioning, campaign development, and brand performance. Emphasize brand equity and market differentiation.`
      
      case 'Growth Hacker':
        return `Focus on growth strategies, A/B testing, conversion optimization, and data-driven marketing. Emphasize rapid experimentation and scalable growth tactics.`
      
      case 'Digital Marketing Specialist':
        return `Focus on digital campaigns, SEO/SEM, social media, analytics, and online marketing strategies. Emphasize ROI optimization and digital performance metrics.`
        
      // Original broad categories (for backward compatibility)
      case 'Science Researcher / Laboratory Professional':
        return `Focus on research methodology, experimental design, data analysis, hypothesis testing, literature review, scientific rigor, reproducibility, and evidence-based conclusions. Emphasize peer review standards and scientific communication.`
      
      case 'Process Engineer / Development Engineer':
        return `Focus on system optimization, process improvement, technical specifications, engineering principles, quality assurance, scalability, efficiency metrics, and implementation strategies. Emphasize practical solutions and measurable outcomes.`
      
      case 'Business Consultant / Developer / Market Analyst':
        return `Focus on strategic analysis, market research, business development, competitive analysis, stakeholder management, ROI optimization, and data-driven decision making. Emphasize actionable insights and business value.`
      
      default:
        return `Focus on professional best practices, systematic approaches, and deliverable-oriented outcomes.`
    }
  }

  private getModeSpecificRequirements(mode: Mode): string {
    switch (mode) {
      case 'General Purpose':
        return `- Adapt requirements based on the specific task
- Focus on what's actually needed for success
- Don't add unnecessary complexity or constraints`
        
      case 'Science Researcher / Laboratory Professional':
        return `- Request specific research methodologies and experimental protocols
- Ask for literature review requirements and citation standards
- Include data analysis and statistical considerations
- Emphasize reproducibility and peer review readiness
- Request hypothesis formulation and testing criteria`
      
      case 'Process Engineer / Development Engineer':
        return `- Request technical specifications and system requirements
- Ask for performance metrics and optimization criteria
- Include scalability and maintainability considerations
- Emphasize testing, validation, and quality assurance
- Request implementation timelines and resource allocation`
      
      case 'Business Consultant / Developer / Market Analyst':
        return `- Request market analysis and competitive landscape
- Ask for stakeholder mapping and business objectives
- Include ROI calculations and success metrics
- Emphasize strategic recommendations and action plans
- Request implementation roadmap and risk assessment`
      
      default:
        return `- Request clear objectives and success criteria
- Ask for resource requirements and constraints
- Include quality standards and deliverable specifications`
    }
  }

  private getYAFAInstructions(): string {
    return `
YAFA MODE ACTIVATED - Enhanced Technical Rigor:
Include these additional requirements in the generated prompt:
- Push back on initial strategies and continuously re-evaluate approaches
- Demand extremely technical detail and precision
- Challenge assumptions and require evidence-based justification
- Insist on root cause analysis and systematic problem-solving
- Require multiple alternative approaches with trade-off analysis
- Emphasize continuous improvement and optimization mindset`
  }

  private generateFallbackPrompt(ir: PromptIR): string {
    // Fallback to original template-based generation if LLM fails
    const lines: string[] = []
    lines.push(`ROLE: You are operating in mode: ${ir.mode}.`)
    lines.push('')
    lines.push('ACCOUNTABILITY: You are accountable for completeness, accuracy, and on-scope delivery.')
    lines.push('')
    lines.push('INFORMATION GATHERING MANDATE:')
    lines.push('- Ask any missing questions before proceeding; wait for confirmation.')
    lines.push('')
    lines.push('DELIVERABLE REQUIREMENTS:')
    lines.push('Part 1 - Final Product: Complete, raw content ready for final use.')
    lines.push('Part 2 - Process Documentation: Conversational breakdown in Markdown-lite style.')
    lines.push('')
    lines.push('OUTPUT FORMAT CONSTRAINTS: Avoid preformatted code blocks unless requested.')
    lines.push('')
    lines.push(`TASK: ${ir.mission}`)
    
    if (ir.yafa) {
      lines.push('')
      lines.push('YAFA MODE: Be extremely technical, challenge strategies, and continuously re-evaluate.')
    }
    
    return lines.join('\n')
  }
}

// Singleton instance for the application
export const promptGenerator = new LLMPromptGenerator()
