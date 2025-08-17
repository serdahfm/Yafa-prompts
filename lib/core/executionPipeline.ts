/**
 * Execution Pipeline: The Skinny but Potent Engine
 * 
 * Minimal stages: Ingest → Retrieve → Generate → Reflexion → Validate → Package
 */

import { TaskFrame, PromptPlan, ExecutionTrace, ValidationResult } from './taskFrame';
import { PromptCompiler } from './promptCompiler';
import Ajv from 'ajv';
import * as fs from 'fs';
import OpenAI from 'openai';

interface RetrievedContext {
  chunk_id: string;
  text: string;
  title?: string;
  section?: string;
  similarity_score: number;
  metadata?: Record<string, any>;
}

interface LLMResponse {
  content: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
  latency_ms: number;
  cost_usd: number;
}

export interface PipelineResult {
  success: boolean;
  output: any;
  trace: ExecutionTrace;
  errors?: string[];
}

export class ExecutionPipeline {
  private compiler: PromptCompiler;
  private ajv: Ajv;

  constructor(
    private basePath: string,
    private llmProvider: LLMProvider,
    private retrievalProvider?: RetrievalProvider
  ) {
    this.compiler = new PromptCompiler(basePath);
    this.ajv = new Ajv({ allErrors: true });
  }

  /**
   * Main execution method: TaskFrame → Validated Output
   */
  async execute(taskFrame: TaskFrame): Promise<PipelineResult> {
    const trace = this.initializeTrace(taskFrame);
    
    try {
      // Phase 1: Compilation
      const plan = this.compiler.compile(taskFrame);
      trace.plan_id = plan.plan_id;
      
      // Phase 2: Retrieval (if needed)
      let contexts: RetrievedContext[] = [];
      if (plan.patterns.includes('rag') && this.retrievalProvider) {
        trace.timestamps.retrieve_start = new Date().toISOString();
        contexts = await this.retrieve(taskFrame, plan);
        trace.timestamps.retrieve_end = new Date().toISOString();
        trace.metrics.retrieved_chunks = contexts.length;
        trace.retrieved_chunk_ids = contexts.map(c => c.chunk_id);
      }

      // Phase 3: Generate
      trace.timestamps.generate_start = new Date().toISOString();
      const prompts = this.compiler.renderPrompts(plan, taskFrame, contexts);
      const draftResponse = await this.generate(prompts.system, prompts.user, plan);
      trace.timestamps.generate_end = new Date().toISOString();
      
      this.updateTraceMetrics(trace, draftResponse);

      // Phase 4: Reflexion (if needed)
      let finalResponse = draftResponse;
      if (plan.patterns.includes('reflexion') && prompts.critic) {
        trace.timestamps.reflexion_start = new Date().toISOString();
        finalResponse = await this.reflexion(prompts.critic, draftResponse, contexts, plan);
        trace.timestamps.reflexion_end = new Date().toISOString();
      }

      // Phase 5: Validation
      trace.timestamps.validate_start = new Date().toISOString();
      const validation = await this.validate(finalResponse.content, taskFrame, contexts);
      trace.timestamps.validate_end = new Date().toISOString();
      
      this.updateTraceValidation(trace, validation);

      // Phase 6: Package
      const output = this.packageOutput(finalResponse.content, validation, taskFrame);
      
      trace.timestamps.complete = new Date().toISOString();
      
      // Log trace for learning
      this.logTrace(trace);

      return {
        success: validation.valid,
        output,
        trace,
        errors: validation.errors
      };

    } catch (error) {
      trace.timestamps.complete = new Date().toISOString();
      this.logTrace(trace);
      
      return {
        success: false,
        output: null,
        trace,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  /**
   * Retrieve relevant contexts based on the task
   */
  private async retrieve(taskFrame: TaskFrame, plan: PromptPlan): Promise<RetrievedContext[]> {
    if (!this.retrievalProvider) return [];

    const query = taskFrame.inputs.question || taskFrame.inputs.text || '';
    const sources = taskFrame.inputs.sources || [];
    
    // Retrieve raw results
    const rawResults = await this.retrievalProvider.retrieve(
      query, 
      plan.retrieval.k_raw,
      sources
    );

    // Rerank if enabled
    let rankedResults = rawResults;
    if (plan.retrieval.rerank && this.retrievalProvider.rerank) {
      rankedResults = await this.retrievalProvider.rerank(query, rawResults);
    }

    // Take top-k and fit to token budget
    const contexts = rankedResults.slice(0, plan.retrieval.keep);
    
    // Ensure contexts fit within token budget
    return this.fitContextsToTokenBudget(contexts, plan.token_budget.context);
  }

  /**
   * Generate response using LLM
   */
  private async generate(systemPrompt: string, userPrompt: string, plan: PromptPlan): Promise<LLMResponse> {
    return await this.llmProvider.generate({
      model: plan.model,
      system: systemPrompt,
      user: userPrompt,
      max_tokens: plan.token_budget.answer,
      temperature: 0.1, // Low temperature for consistency
      response_format: { type: 'json_object' }
    });
  }

  /**
   * Reflexion: Self-critique and repair
   */
  private async reflexion(
    criticPrompt: string, 
    draftResponse: LLMResponse, 
    contexts: RetrievedContext[], 
    plan: PromptPlan
  ): Promise<LLMResponse> {
    
    const criticPromptWithDraft = criticPrompt
      .replace('{{draft_response}}', draftResponse.content)
      .replace('{{retrieved_contexts}}', this.formatContextsForCritic(contexts));

    return await this.llmProvider.generate({
      model: plan.model,
      system: '',
      user: criticPromptWithDraft,
      max_tokens: plan.token_budget.answer,
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });
  }

  /**
   * Validate response against schema and business rules
   */
  private async validate(
    responseContent: string, 
    taskFrame: TaskFrame, 
    contexts: RetrievedContext[]
  ): Promise<ValidationResult> {
    
    const result: ValidationResult = {
      valid: true,
      errors: [],
      citation_coverage: 0,
      word_count: 0,
      schema_violations: [],
      safety_flags: []
    };

    try {
      // Parse JSON
      const parsed = JSON.parse(responseContent);
      
      // Schema validation
      const schemaPath = taskFrame.output_schema;
      if (fs.existsSync(schemaPath)) {
        const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
        const validate = this.ajv.compile(schema);
        
        if (!validate(parsed)) {
          result.valid = false;
          result.schema_violations = validate.errors?.map(e => `${e.instancePath} ${e.message}`) || [];
          result.errors.push(...result.schema_violations);
        }
      }

      // Citation validation
      if (taskFrame.context_policy.must_cite && parsed.citations) {
        result.citation_coverage = this.calculateCitationCoverage(parsed, contexts);
        if (result.citation_coverage < 0.8) {
          result.valid = false;
          result.errors.push(`Low citation coverage: ${result.citation_coverage.toFixed(2)}`);
        }
      }

      // Word count validation
      if (parsed.answer && taskFrame.constraints.length.max_words) {
        result.word_count = parsed.answer.split(/\s+/).length;
        if (result.word_count > taskFrame.constraints.length.max_words) {
          result.valid = false;
          result.errors.push(`Exceeds word limit: ${result.word_count}/${taskFrame.constraints.length.max_words}`);
        }
      }

      // Safety validation
      result.safety_flags = this.checkSafetyViolations(parsed, taskFrame.constraints.safety);
      if (result.safety_flags.length > 0) {
        result.valid = false;
        result.errors.push(...result.safety_flags);
      }

    } catch (error) {
      result.valid = false;
      result.errors.push(`JSON parsing error: ${error}`);
    }

    return result;
  }

  /**
   * Package final output with metadata
   */
  private packageOutput(responseContent: string, validation: ValidationResult, taskFrame: TaskFrame) {
    try {
      const parsed = JSON.parse(responseContent);
      return {
        ...parsed,
        _metadata: {
          taskframe_id: taskFrame.id,
          validation_score: validation.valid ? 1.0 : 0.0,
          citation_coverage: validation.citation_coverage,
          word_count: validation.word_count,
          generated_at: new Date().toISOString()
        }
      };
    } catch {
      return {
        error: "Invalid JSON response",
        raw_content: responseContent,
        validation_errors: validation.errors
      };
    }
  }

  /**
   * Helper methods
   */
  private initializeTrace(taskFrame: TaskFrame): ExecutionTrace {
    return {
      trace_id: `tr_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      taskframe_id: taskFrame.id,
      plan_id: '',
      timestamps: {
        start: new Date().toISOString(),
        complete: ''
      },
      metrics: {
        tokens: { prompt: 0, completion: 0, total: 0 },
        latency_ms: 0,
        cost_usd: 0,
        retrieved_chunks: 0,
        citation_coverage: 0
      },
      violations: {
        schema: 0,
        citations_missing: 0,
        length_overflow: false,
        safety_flags: []
      },
      retrieved_chunk_ids: [],
      model_version: '',
      template_version: '',
      compiler_version: '1.0.0'
    };
  }

  private updateTraceMetrics(trace: ExecutionTrace, response: LLMResponse) {
    trace.metrics.tokens = {
      prompt: response.usage.prompt_tokens,
      completion: response.usage.completion_tokens,
      total: response.usage.total_tokens
    };
    trace.metrics.latency_ms += response.latency_ms;
    trace.metrics.cost_usd += response.cost_usd;
    trace.model_version = response.model;
  }

  private updateTraceValidation(trace: ExecutionTrace, validation: ValidationResult) {
    trace.metrics.citation_coverage = validation.citation_coverage;
    trace.violations.schema = validation.schema_violations.length;
    trace.violations.citations_missing = validation.citation_coverage < 0.8 ? 1 : 0;
    trace.violations.length_overflow = validation.word_count > 0 && validation.errors.some(e => e.includes('word limit'));
    trace.violations.safety_flags = validation.safety_flags;
  }

  private calculateCitationCoverage(parsed: any, contexts: RetrievedContext[]): number {
    if (!parsed.citations || !Array.isArray(parsed.citations)) return 0;
    
    const validCitations = parsed.citations.filter((citation: any) => 
      contexts.some(ctx => ctx.chunk_id === citation.chunk_id)
    );
    
    return parsed.citations.length > 0 ? validCitations.length / parsed.citations.length : 1;
  }

  private checkSafetyViolations(parsed: any, safety: any): string[] {
    const flags: string[] = [];
    
    if (safety.no_speculation && parsed.flags?.includes('speculation')) {
      flags.push('Contains speculation despite no_speculation constraint');
    }
    
    if (safety.no_pii && this.containsPII(JSON.stringify(parsed))) {
      flags.push('Contains potential PII');
    }
    
    return flags;
  }

  private containsPII(text: string): boolean {
    // Simple PII detection - would be enhanced in production
    const piiPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
      /\b\d{3}-\d{3}-\d{4}\b/ // Phone
    ];
    
    return piiPatterns.some(pattern => pattern.test(text));
  }

  private fitContextsToTokenBudget(contexts: RetrievedContext[], budget: number): RetrievedContext[] {
    // Rough estimation: 4 characters per token
    let totalTokens = 0;
    const fitted: RetrievedContext[] = [];
    
    for (const context of contexts) {
      const contextTokens = Math.ceil(context.text.length / 4);
      if (totalTokens + contextTokens <= budget) {
        fitted.push(context);
        totalTokens += contextTokens;
      } else {
        break;
      }
    }
    
    return fitted;
  }

  private formatContextsForCritic(contexts: RetrievedContext[]): string {
    return contexts.map(ctx => `**[${ctx.chunk_id}]**: ${ctx.text}`).join('\n\n');
  }

  private logTrace(trace: ExecutionTrace) {
    // In production, this would go to a proper observability system
    console.log('Execution trace:', JSON.stringify(trace, null, 2));
  }
}

// Interface definitions for providers
export interface LLMProvider {
  generate(request: {
    model: string;
    system: string;
    user: string;
    max_tokens: number;
    temperature: number;
    response_format?: { type: string };
  }): Promise<LLMResponse>;
}

export interface RetrievalProvider {
  retrieve(query: string, k: number, sources?: string[]): Promise<RetrievedContext[]>;
  rerank?(query: string, contexts: RetrievedContext[]): Promise<RetrievedContext[]>;
}
