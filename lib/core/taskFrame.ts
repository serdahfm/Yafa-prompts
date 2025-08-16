/**
 * TaskFrame: Single Source of Truth for Prompt Generation
 * 
 * Treats prompt creation like compilation: user intent → typed TaskFrame → 
 * Prompt Plan → executable prompts with guardrails → measured outcomes
 */

export interface TaskFrameConstraints {
  style: 'executive_brief' | 'technical' | 'empathetic' | 'legalistic' | 'scientific';
  length: {
    max_words?: number;
    max_tokens?: number;
  };
  format: 'json' | 'markdown' | 'text' | 'csv';
  tone: 'neutral' | 'formal' | 'casual' | 'urgent' | 'friendly';
  safety: {
    no_pii?: boolean;
    no_speculation?: boolean;
    no_profanity?: boolean;
    topic_blocks?: string[];
  };
}

export interface ContextPolicy {
  retrieval: {
    k: number;
    rerank: boolean;
    recency_days?: number;
    similarity_threshold?: number;
  };
  must_cite: boolean;
  fallback_on_low_confidence: 'insufficient_evidence' | 'caveat' | 'refuse';
  chunk_size?: number;
  overlap?: number;
}

export interface TaskFramePreferences {
  verbosity: 'tight' | 'verbose' | 'minimal';
  examples_profile: 'business' | 'technical' | 'academic' | 'legalistic';
  reasoning_style: 'direct' | 'chain_of_thought' | 'step_by_step';
}

export interface TaskFrame {
  id: string;
  goal: 'qa_with_citations' | 'summarize' | 'analyze' | 'generate_plan' | 'classify' | 'extract';
  domain: 'policies' | 'technical_docs' | 'business_plans' | 'legal' | 'marketing' | 'general';
  
  inputs: {
    question?: string;
    text?: string;
    sources?: string[];
    data?: Record<string, unknown>;
  };
  
  constraints: TaskFrameConstraints;
  output_schema: string; // Path to JSON schema file
  context_policy: ContextPolicy;
  preferences: TaskFramePreferences;
  
  // Metadata
  created_at: string;
  version: string;
  creator: string;
}

export interface PromptPlan {
  plan_id: string;
  taskframe_id: string;
  
  model: 'gpt-4o' | 'gpt-4o-mini' | 'claude-3-sonnet' | 'claude-3-haiku';
  patterns: PromptPattern[];
  
  token_budget: {
    total: number;
    context: number;
    answer: number;
    overhead: number;
  };
  
  retrieval: {
    k_raw: number;
    rerank: boolean;
    keep: number;
    reranker_model?: string;
  };
  
  templates: {
    system: string;
    user: string;
    critic?: string;
  };
  
  schema_path: string;
  style_profile: string;
}

export type PromptPattern = 
  | 'role'
  | 'few_shot' 
  | 'rag'
  | 'reasoning'
  | 'reflexion'
  | 'constrained_json'
  | 'safety'
  | 'citation_enforcement';

export interface ExecutionTrace {
  trace_id: string;
  taskframe_id: string;
  plan_id: string;
  
  timestamps: {
    start: string;
    retrieve_start?: string;
    retrieve_end?: string;
    generate_start?: string;
    generate_end?: string;
    reflexion_start?: string;
    reflexion_end?: string;
    validate_start?: string;
    validate_end?: string;
    complete: string;
  };
  
  metrics: {
    tokens: {
      prompt: number;
      completion: number;
      total: number;
    };
    latency_ms: number;
    cost_usd: number;
    retrieved_chunks: number;
    citation_coverage: number;
  };
  
  violations: {
    schema: number;
    citations_missing: number;
    length_overflow: boolean;
    safety_flags: string[];
  };
  
  retrieved_chunk_ids: string[];
  model_version: string;
  template_version: string;
  compiler_version: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  citation_coverage: number;
  word_count: number;
  schema_violations: string[];
  safety_flags: string[];
}

// Utility functions for TaskFrame creation and validation
export class TaskFrameBuilder {
  private frame: Partial<TaskFrame> = {
    version: '1.0.0',
    created_at: new Date().toISOString(),
  };

  static create(goal: TaskFrame['goal'], domain: TaskFrame['domain']): TaskFrameBuilder {
    return new TaskFrameBuilder().setGoal(goal).setDomain(domain);
  }

  setId(id: string): this {
    this.frame.id = id;
    return this;
  }

  setGoal(goal: TaskFrame['goal']): this {
    this.frame.goal = goal;
    return this;
  }

  setDomain(domain: TaskFrame['domain']): this {
    this.frame.domain = domain;
    return this;
  }

  setInputs(inputs: TaskFrame['inputs']): this {
    this.frame.inputs = inputs;
    return this;
  }

  setConstraints(constraints: Partial<TaskFrameConstraints>): this {
    this.frame.constraints = {
      style: 'neutral' as any,
      length: {},
      format: 'json',
      tone: 'neutral',
      safety: {},
      ...constraints,
    };
    return this;
  }

  setContextPolicy(policy: Partial<ContextPolicy>): this {
    this.frame.context_policy = {
      retrieval: { k: 6, rerank: true },
      must_cite: false,
      fallback_on_low_confidence: 'insufficient_evidence',
      ...policy,
    };
    return this;
  }

  setPreferences(prefs: Partial<TaskFramePreferences>): this {
    this.frame.preferences = {
      verbosity: 'tight',
      examples_profile: 'business',
      reasoning_style: 'direct',
      ...prefs,
    };
    return this;
  }

  setOutputSchema(schema_path: string): this {
    this.frame.output_schema = schema_path;
    return this;
  }

  setCreator(creator: string): this {
    this.frame.creator = creator;
    return this;
  }

  build(): TaskFrame {
    if (!this.frame.id) {
      this.frame.id = `tf_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }
    
    // Validate required fields
    const required: (keyof TaskFrame)[] = ['goal', 'domain', 'constraints', 'context_policy', 'preferences', 'output_schema'];
    for (const field of required) {
      if (!this.frame[field]) {
        throw new Error(`TaskFrame missing required field: ${field}`);
      }
    }

    return this.frame as TaskFrame;
  }
}
