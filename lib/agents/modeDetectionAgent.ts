import { createLLMClientFromEnv } from '../providers/llm'
import { Mode } from '../core/promptIR'

export interface ModeDetectionResult {
  detectedMode: Mode
  confidence: number
  reasoning: string
  keywords: string[]
  alternativeModes: Array<{
    mode: Mode
    confidence: number
  }>
}

export class ModeDetectionAgent {
  private llmClient = createLLMClientFromEnv()

  async detectModeFromPrompt(userInput: string): Promise<ModeDetectionResult> {
    // Quick keyword-based detection first (faster)
    const keywordResult = this.detectModeByKeywords(userInput)
    
    // If high confidence from keywords, return early
    if (keywordResult.confidence >= 0.85) {
      return keywordResult
    }

    // Otherwise, use LLM for semantic analysis
    try {
      const llmResult = await this.detectModeByLLM(userInput)
      
      // Combine keyword and LLM results for better accuracy
      return this.combineModeDetectionResults(keywordResult, llmResult)
    } catch (error) {
      console.error('LLM mode detection failed:', error)
      
      // If LLM is not configured, throw error for critical functionality
      if (error instanceof Error && error.message.includes('LLM_CONFIGURATION_REQUIRED')) {
        throw error
      }
      
      // For other errors (rate limits, network issues), use keyword fallback
      console.warn('Using keyword-only detection due to LLM error')
      return keywordResult
    }
  }

  private detectModeByKeywords(userInput: string): ModeDetectionResult {
    const input = userInput.toLowerCase()
    const modeKeywords: Record<Mode, string[]> = {
      'General Purpose': [],
      
      // Technology Sector
      'DevOps Engineer': [
        'ci/cd', 'pipeline', 'kubernetes', 'docker', 'containerization', 'deployment',
        'infrastructure', 'monitoring', 'alerting', 'terraform', 'ansible', 'jenkins',
        'gitlab ci', 'github actions', 'aws', 'cloud infrastructure', 'scalability',
        'load balancer', 'microservices', 'orchestration', 'automation', 'prometheus'
      ],
      'Data Scientist': [
        'machine learning', 'data analysis', 'python', 'pandas', 'numpy', 'jupyter',
        'statistical model', 'regression', 'classification', 'clustering', 'data visualization',
        'matplotlib', 'seaborn', 'scikit-learn', 'tensorflow', 'pytorch', 'dataset',
        'feature engineering', 'cross-validation', 'hyperparameter', 'neural network'
      ],
      'Cybersecurity Analyst': [
        'security', 'vulnerability', 'penetration test', 'threat', 'firewall',
        'encryption', 'malware', 'phishing', 'incident response', 'compliance',
        'risk assessment', 'security audit', 'intrusion detection', 'soc', 'siem',
        'zero trust', 'authentication', 'authorization', 'cyber', 'security policy'
      ],
      'Product Manager': [
        'product strategy', 'roadmap', 'user story', 'feature', 'stakeholder',
        'requirements', 'user research', 'market analysis', 'competitive analysis',
        'product launch', 'go-to-market', 'metrics', 'kpis', 'user feedback',
        'product backlog', 'sprint', 'agile', 'scrum', 'product vision'
      ],
      'UX/UI Designer': [
        'user experience', 'user interface', 'wireframe', 'prototype', 'mockup',
        'user research', 'usability', 'design system', 'figma', 'sketch',
        'user journey', 'persona', 'accessibility', 'responsive design',
        'interaction design', 'visual design', 'design thinking', 'a/b test'
      ],
      'Software Architect': [
        'system architecture', 'design pattern', 'microservices', 'api design',
        'scalability', 'performance', 'software design', 'architectural pattern',
        'distributed system', 'database design', 'caching', 'load balancing',
        'system integration', 'technical debt', 'code quality', 'design principles'
      ],
      'Machine Learning Engineer': [
        'ml model', 'model deployment', 'mlops', 'feature store', 'model serving',
        'model monitoring', 'data pipeline', 'feature pipeline', 'model training',
        'model inference', 'model versioning', 'ml infrastructure', 'kubernetes ml',
        'tensorflow serving', 'model registry', 'experiment tracking', 'mlflow'
      ],
      'Cloud Solutions Architect': [
        'cloud architecture', 'aws', 'azure', 'gcp', 'cloud migration',
        'cloud native', 'serverless', 'lambda', 'cloud security',
        'cost optimization', 'multi-cloud', 'hybrid cloud', 'cloud strategy',
        'well-architected', 'cloud governance', 'cloud compliance'
      ],
      
      // Healthcare & Life Sciences
      'Clinical Researcher': [
        'clinical trial', 'protocol', 'patient', 'regulatory', 'fda', 'gcp',
        'clinical data', 'adverse event', 'efficacy', 'safety', 'endpoint',
        'randomized controlled trial', 'phase i', 'phase ii', 'phase iii',
        'institutional review board', 'informed consent', 'clinical study'
      ],
      'Medical Writer': [
        'medical writing', 'clinical document', 'regulatory submission',
        'protocol', 'clinical study report', 'investigator brochure',
        'medical communication', 'scientific publication', 'manuscript',
        'medical terminology', 'regulatory writing', 'clinical data'
      ],
      'Biostatistician': [
        'biostatistics', 'clinical statistics', 'statistical analysis plan',
        'survival analysis', 'clinical trial design', 'sample size',
        'power analysis', 'interim analysis', 'statistical methodology',
        'regulatory statistics', 'clinical data analysis', 'sas', 'r statistics'
      ],
      'Pharmaceutical Analyst': [
        'pharmaceutical', 'drug development', 'market access', 'pricing',
        'competitive intelligence', 'therapeutic area', 'indication',
        'commercial strategy', 'market research', 'pharmaceutical market',
        'drug launch', 'pharma pipeline', 'regulatory pathway'
      ],
      'Regulatory Affairs Specialist': [
        'regulatory', 'fda', 'ema', 'submission', 'approval', 'compliance',
        'regulatory strategy', 'regulatory pathway', 'regulatory guidance',
        'regulatory submission', 'regulatory meeting', 'regulatory intelligence',
        'drug approval', 'marketing authorization', 'regulatory affairs'
      ],
      
      // Finance & Legal
      'Financial Analyst': [
        'financial analysis', 'financial model', 'valuation', 'dcf',
        'financial statement', 'cash flow', 'investment analysis',
        'financial planning', 'budgeting', 'forecasting', 'roi',
        'financial metrics', 'financial reporting', 'excel model'
      ],
      'Compliance Officer': [
        'compliance', 'regulatory compliance', 'risk management',
        'audit', 'policy', 'governance', 'internal control',
        'compliance program', 'compliance monitoring', 'compliance training',
        'regulatory requirement', 'compliance framework', 'sox'
      ],
      'Legal Researcher': [
        'legal research', 'case law', 'legal precedent', 'statute',
        'legal analysis', 'legal brief', 'legal memorandum',
        'contract analysis', 'legal database', 'westlaw', 'lexis',
        'legal opinion', 'legal document', 'legal writing'
      ],
      'Investment Analyst': [
        'investment', 'portfolio', 'equity research', 'due diligence',
        'investment strategy', 'asset allocation', 'risk analysis',
        'investment recommendation', 'financial markets', 'securities',
        'investment thesis', 'market analysis', 'investment banking'
      ],
      'Risk Management Specialist': [
        'risk management', 'risk assessment', 'risk mitigation',
        'risk analysis', 'operational risk', 'credit risk', 'market risk',
        'risk framework', 'risk monitoring', 'risk reporting',
        'enterprise risk', 'risk strategy', 'risk governance'
      ],
      
      // Marketing & Sales
      'Content Strategist': [
        'content strategy', 'content marketing', 'editorial calendar',
        'content planning', 'brand voice', 'content creation',
        'content performance', 'seo content', 'content optimization',
        'content distribution', 'content analytics', 'content management'
      ],
      'Sales Engineer': [
        'sales engineering', 'technical sales', 'solution architecture',
        'customer presentation', 'technical proposal', 'demo',
        'sales support', 'customer requirement', 'solution design',
        'sales process', 'technical evaluation', 'proof of concept'
      ],
      'Brand Manager': [
        'brand strategy', 'brand positioning', 'brand equity',
        'brand management', 'brand campaign', 'brand performance',
        'brand guidelines', 'brand identity', 'brand marketing',
        'brand awareness', 'brand loyalty', 'brand differentiation'
      ],
      'Growth Hacker': [
        'growth hacking', 'growth strategy', 'user acquisition',
        'conversion optimization', 'a/b testing', 'funnel optimization',
        'viral marketing', 'retention strategy', 'growth metrics',
        'user engagement', 'growth experiment', 'scalable growth'
      ],
      'Digital Marketing Specialist': [
        'digital marketing', 'seo', 'sem', 'social media marketing',
        'ppc', 'google ads', 'facebook ads', 'email marketing',
        'marketing automation', 'digital campaign', 'conversion tracking',
        'marketing analytics', 'digital advertising', 'online marketing'
      ],
      
      // Legacy broad categories
      'Science Researcher / Laboratory Professional': [
        'research', 'experiment', 'laboratory', 'hypothesis', 'methodology',
        'data collection', 'scientific method', 'peer review', 'publication',
        'research design', 'scientific analysis', 'lab protocol', 'research proposal'
      ],
      'Process Engineer / Development Engineer': [
        'process engineering', 'process optimization', 'process improvement',
        'engineering design', 'technical specification', 'system design',
        'process development', 'quality assurance', 'process control',
        'engineering analysis', 'technical documentation', 'process flow'
      ],
      'Business Consultant / Developer / Market Analyst': [
        'business analysis', 'consulting', 'market research', 'business strategy',
        'business development', 'competitive analysis', 'market analysis',
        'business process', 'strategic planning', 'business case',
        'market intelligence', 'business improvement', 'strategic consulting'
      ]
    }

    const modeScores: Array<{ mode: Mode; score: number; matchedKeywords: string[] }> = []

    for (const [mode, keywords] of Object.entries(modeKeywords)) {
      if (mode === 'General Purpose') continue
      
      const matchedKeywords: string[] = []
      let score = 0

      for (const keyword of keywords) {
        if (input.includes(keyword)) {
          matchedKeywords.push(keyword)
          // Weight longer, more specific keywords higher
          score += keyword.split(' ').length
        }
      }

      if (score > 0) {
        modeScores.push({ mode: mode as Mode, score, matchedKeywords })
      }
    }

    // Sort by score and normalize
    modeScores.sort((a, b) => b.score - a.score)
    
    if (modeScores.length === 0) {
      return {
        detectedMode: 'General Purpose',
        confidence: 0.3,
        reasoning: 'No specific professional keywords detected',
        keywords: [],
        alternativeModes: []
      }
    }

    const topScore = modeScores[0]
    const totalWords = input.split(/\s+/).length
    const confidence = Math.min(0.95, (topScore.score / totalWords) * 2 + 0.3)

    return {
      detectedMode: topScore.mode,
      confidence,
      reasoning: `Detected based on keywords: ${topScore.matchedKeywords.slice(0, 3).join(', ')}`,
      keywords: topScore.matchedKeywords,
      alternativeModes: modeScores.slice(1, 4).map(({ mode, score }) => ({
        mode,
        confidence: Math.min(0.9, (score / topScore.score) * confidence)
      }))
    }
  }

  private async detectModeByLLM(userInput: string): Promise<ModeDetectionResult> {
    const availableModes = [
      'General Purpose',
      'DevOps Engineer', 'Data Scientist', 'Cybersecurity Analyst', 'Product Manager',
      'UX/UI Designer', 'Software Architect', 'Machine Learning Engineer', 'Cloud Solutions Architect',
      'Clinical Researcher', 'Medical Writer', 'Biostatistician', 'Pharmaceutical Analyst', 'Regulatory Affairs Specialist',
      'Financial Analyst', 'Compliance Officer', 'Legal Researcher', 'Investment Analyst', 'Risk Management Specialist',
      'Content Strategist', 'Sales Engineer', 'Brand Manager', 'Growth Hacker', 'Digital Marketing Specialist',
      'Science Researcher / Laboratory Professional', 'Process Engineer / Development Engineer', 'Business Consultant / Developer / Market Analyst'
    ]

    const prompt = `You are an expert at identifying professional contexts from user requests. Analyze the following user input and determine which professional mode would be most appropriate.

USER INPUT: "${userInput}"

AVAILABLE MODES: ${availableModes.join(', ')}

Respond with ONLY a JSON object in this exact format:
{
  "detectedMode": "exact mode name from the list",
  "confidence": 0.85,
  "reasoning": "brief explanation of why this mode was chosen",
  "keywords": ["key", "words", "that", "indicated", "this", "mode"],
  "alternativeModes": [
    {"mode": "alternative mode 1", "confidence": 0.65},
    {"mode": "alternative mode 2", "confidence": 0.45}
  ]
}

Guidelines:
- Use "General Purpose" only if no specific professional context is clear
- Confidence should be 0.0-1.0 (higher = more certain)
- Include 2-3 alternative modes with lower confidence scores
- Base reasoning on professional terminology, tools, processes, or domain-specific language
- Keywords should be actual words/phrases from the user input that indicated the mode`

    const response = await this.llmClient.complete(prompt, {
      temperature: 0.1, // Low temperature for consistent classification
      maxTokens: 500
    })

    try {
      const result = JSON.parse(response.trim())
      
      // Validate the response structure
      if (!result.detectedMode || !availableModes.includes(result.detectedMode)) {
        throw new Error('Invalid mode detected')
      }

      return {
        detectedMode: result.detectedMode as Mode,
        confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
        reasoning: result.reasoning || 'LLM-based semantic analysis',
        keywords: Array.isArray(result.keywords) ? result.keywords : [],
        alternativeModes: Array.isArray(result.alternativeModes) 
          ? result.alternativeModes.filter((alt: any) => 
              alt.mode && availableModes.includes(alt.mode)
            ).map((alt: any) => ({
              mode: alt.mode as Mode,
              confidence: Math.max(0, Math.min(1, alt.confidence || 0))
            }))
          : []
      }
    } catch (error) {
      console.error('Failed to parse LLM mode detection response:', error)
      
      // Check if this is an LLM configuration error
      if (error instanceof Error && error.message.includes('LLM_NOT_CONFIGURED')) {
        console.error('🚨 Mode detection requires LLM access')
        throw new Error('LLM_CONFIGURATION_REQUIRED: Auto-detection requires LLM access. Please configure OPENAI_API_KEY or ANTHROPIC_API_KEY.')
      }
      
      // Fallback to General Purpose for other errors
      return {
        detectedMode: 'General Purpose',
        confidence: 0.4,
        reasoning: 'LLM analysis failed, using general mode',
        keywords: [],
        alternativeModes: []
      }
    }
  }

  private combineModeDetectionResults(
    keywordResult: ModeDetectionResult,
    llmResult: ModeDetectionResult
  ): ModeDetectionResult {
    // If both agree on the mode, boost confidence
    if (keywordResult.detectedMode === llmResult.detectedMode) {
      return {
        ...llmResult,
        confidence: Math.min(0.98, (keywordResult.confidence + llmResult.confidence) / 1.5),
        keywords: [...new Set([...keywordResult.keywords, ...llmResult.keywords])],
        reasoning: `Keyword and semantic analysis both suggest: ${llmResult.reasoning}`
      }
    }

    // Use the result with higher confidence
    return keywordResult.confidence > llmResult.confidence ? keywordResult : llmResult
  }
}

// Singleton instance
export const modeDetectionAgent = new ModeDetectionAgent()
