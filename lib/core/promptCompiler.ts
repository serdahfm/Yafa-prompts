/**
 * Prompt Compiler: Maps TaskFrames to PromptPlans to Executable Prompts
 * 
 * Transforms the art of prompt engineering into a systematic compilation process
 */

import { TaskFrame, PromptPlan, PromptPattern } from './taskFrame';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import Handlebars from 'handlebars';

interface StyleProfile {
  name: string;
  description: string;
  rules: string[];
  tone_markers: {
    positive: string[];
    negative: string[];
    neutral: string[];
  };
  avoid: string[];
  structure: {
    answer_first: boolean;
    citation_style: string;
    fallback_phrase: string;
    include_examples?: boolean;
  };
}

interface ExemplarSet {
  domain: string;
  style: string;
  examples: Array<{
    question: string;
    answer: string;
    citations: string[];
    style: string;
  }>;
}

export class PromptCompiler {
  private styleProfiles: Map<string, StyleProfile> = new Map();
  private exemplars: Map<string, ExemplarSet> = new Map();
  private templates: Map<string, HandlebarsTemplateDelegate> = new Map();

  constructor(private basePath: string) {
    this.loadStyleProfiles();
    this.loadExemplars();
    this.loadTemplates();
  }

  /**
   * Main compilation method: TaskFrame → PromptPlan
   */
  compile(taskFrame: TaskFrame): PromptPlan {
    const planId = `pp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // 1. Select patterns based on task requirements
    const patterns = this.selectPatterns(taskFrame);
    
    // 2. Choose model based on complexity and constraints
    const model = this.selectModel(taskFrame, patterns);
    
    // 3. Calculate token budget
    const tokenBudget = this.calculateTokenBudget(taskFrame, model);
    
    // 4. Configure retrieval strategy
    const retrieval = this.configureRetrieval(taskFrame, tokenBudget);
    
    // 5. Select templates
    const templates = this.selectTemplates(taskFrame, patterns);
    
    return {
      plan_id: planId,
      taskframe_id: taskFrame.id,
      model,
      patterns,
      token_budget: tokenBudget,
      retrieval,
      templates,
      schema_path: taskFrame.output_schema,
      style_profile: taskFrame.constraints.style
    };
  }

  /**
   * Render templates with context to create executable prompts
   */
  renderPrompts(plan: PromptPlan, taskFrame: TaskFrame, retrievedContexts: any[] = []) {
    const styleProfile = this.styleProfiles.get(plan.style_profile);
    const exemplars = this.getExemplars(taskFrame.domain, plan.style_profile);
    
    const templateContext = {
      ...taskFrame,
      style_profile: plan.style_profile,
      style_rules: styleProfile?.rules || [],
      retrieved_contexts: retrievedContexts,
      few_shot_examples: plan.patterns.includes('few_shot') ? { examples: exemplars } : null,
      context_policy: taskFrame.context_policy,
      constraints: taskFrame.constraints
    };

    return {
      system: this.templates.get('system')?.(templateContext) || '',
      user: this.templates.get('user_qa')?.(templateContext) || '',
      critic: plan.patterns.includes('reflexion') ? 
        this.templates.get('critic')?.(templateContext) || '' : undefined
    };
  }

  /**
   * Pattern selection logic - the core of the compilation intelligence
   */
  private selectPatterns(taskFrame: TaskFrame): PromptPattern[] {
    const patterns: PromptPattern[] = ['role']; // Always include role

    // Add patterns based on goal and requirements
    switch (taskFrame.goal) {
      case 'qa_with_citations':
        patterns.push('constrained_json');
        if (taskFrame.context_policy.must_cite) {
          patterns.push('citation_enforcement');
        }
        if (taskFrame.inputs.sources && taskFrame.inputs.sources.length > 0) {
          patterns.push('rag');
        }
        break;
        
      case 'analyze':
      case 'generate_plan':
        patterns.push('reasoning', 'constrained_json');
        break;
        
      case 'summarize':
        patterns.push('constrained_json');
        break;
    }

    // Add few-shot if we have exemplars for this domain
    if (this.hasExemplars(taskFrame.domain, taskFrame.constraints.style)) {
      patterns.push('few_shot');
    }

    // Add reflexion for high-stakes tasks or when quality is critical
    if (taskFrame.context_policy.must_cite || 
        taskFrame.constraints.safety.no_speculation ||
        taskFrame.preferences.verbosity === 'tight') {
      patterns.push('reflexion');
    }

    // Always add safety for sensitive content
    if (taskFrame.constraints.safety.no_pii || 
        taskFrame.constraints.safety.topic_blocks?.length) {
      patterns.push('safety');
    }

    return patterns;
  }

  /**
   * Model selection based on task complexity and performance requirements
   */
  private selectModel(taskFrame: TaskFrame, patterns: PromptPattern[]): PromptPlan['model'] {
    // High complexity tasks need stronger models
    if (patterns.includes('reasoning') && patterns.includes('reflexion')) {
      return 'gpt-4o';
    }
    
    // Citation tasks benefit from better reasoning
    if (taskFrame.context_policy.must_cite && taskFrame.domain === 'legal') {
      return 'gpt-4o';
    }
    
    // Fast, lightweight tasks
    if (taskFrame.goal === 'classify' || taskFrame.goal === 'extract') {
      return 'gpt-4o-mini';
    }
    
    // Default balanced choice
    return 'gpt-4o-mini';
  }

  /**
   * Token budget calculation with smart allocation
   */
  private calculateTokenBudget(taskFrame: TaskFrame, model: string) {
    const basebudgets = {
      'gpt-4o': { total: 8000, context: 5000, answer: 800, overhead: 400 },
      'gpt-4o-mini': { total: 3000, context: 1800, answer: 350, overhead: 200 },
      'claude-3-sonnet': { total: 6000, context: 4000, answer: 600, overhead: 300 },
      'claude-3-haiku': { total: 3000, context: 1800, answer: 350, overhead: 200 }
    };

    const baseBudget = basebudgets[model as keyof typeof basebudgets] || basebudgets['gpt-4o-mini'];
    
    // Adjust based on constraints
    if (taskFrame.constraints.length.max_words) {
      // Rough conversion: 1 word ≈ 1.3 tokens
      const maxTokens = Math.ceil(taskFrame.constraints.length.max_words * 1.3);
      baseBudget.answer = Math.min(baseBudget.answer, maxTokens);
    }

    return baseBudget;
  }

  /**
   * Retrieval configuration based on context policy and token budget
   */
  private configureRetrieval(taskFrame: TaskFrame, tokenBudget: any) {
    const policy = taskFrame.context_policy.retrieval;
    
    return {
      k_raw: Math.max(policy.k * 2, 8), // Retrieve more, then filter
      rerank: policy.rerank,
      keep: Math.min(policy.k, Math.floor(tokenBudget.context / 300)), // ~300 tokens per chunk
      reranker_model: policy.rerank ? 'cross-encoder-ms-marco-MiniLM-L-12-v2' : undefined
    };
  }

  /**
   * Template selection based on goal and patterns
   */
  private selectTemplates(taskFrame: TaskFrame, patterns: PromptPattern[]) {
    return {
      system: 'system',
      user: this.selectUserTemplate(taskFrame.goal),
      critic: patterns.includes('reflexion') ? 'critic' : undefined
    };
  }

  private selectUserTemplate(goal: TaskFrame['goal']): string {
    const templateMap = {
      'qa_with_citations': 'user_qa',
      'summarize': 'user_summarize',
      'analyze': 'user_analyze',
      'generate_plan': 'user_plan',
      'classify': 'user_classify',
      'extract': 'user_extract'
    };
    
    return templateMap[goal] || 'user_qa';
  }

  /**
   * Load style profiles from YAML files
   */
  private loadStyleProfiles() {
    const stylesDir = path.join(this.basePath, 'styles');
    if (!fs.existsSync(stylesDir)) return;

    const files = fs.readdirSync(stylesDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(stylesDir, file), 'utf8');
        const profile = yaml.load(content) as StyleProfile;
        this.styleProfiles.set(profile.name, profile);
      } catch (error) {
        console.warn(`Failed to load style profile ${file}:`, error);
      }
    }
  }

  /**
   * Load exemplars from JSONL files
   */
  private loadExemplars() {
    const exemplarsDir = path.join(this.basePath, 'exemplars');
    if (!fs.existsSync(exemplarsDir)) return;

    const files = fs.readdirSync(exemplarsDir).filter(f => f.endsWith('.jsonl'));
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(exemplarsDir, file), 'utf8');
        const lines = content.trim().split('\n');
        const examples = lines.map(line => JSON.parse(line));
        
        // Extract domain and style from filename (e.g., "policies.qa.jsonl" → domain: policies)
        const [domain] = file.split('.');
        const style = examples[0]?.style || 'executive_brief';
        
        const key = `${domain}_${style}`;
        this.exemplars.set(key, {
          domain,
          style,
          examples
        });
      } catch (error) {
        console.warn(`Failed to load exemplars ${file}:`, error);
      }
    }
  }

  /**
   * Load and compile Handlebars templates
   */
  private loadTemplates() {
    const templatesDir = path.join(this.basePath, 'templates');
    if (!fs.existsSync(templatesDir)) return;

    const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.md'));
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(templatesDir, file), 'utf8');
        const templateName = path.basename(file, '.md');
        const compiled = Handlebars.compile(content);
        this.templates.set(templateName, compiled);
      } catch (error) {
        console.warn(`Failed to load template ${file}:`, error);
      }
    }
  }

  private hasExemplars(domain: string, style: string): boolean {
    return this.exemplars.has(`${domain}_${style}`);
  }

  private getExemplars(domain: string, style: string): any[] {
    const exemplarSet = this.exemplars.get(`${domain}_${style}`);
    return exemplarSet?.examples || [];
  }
}
