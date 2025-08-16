/**
 * YAFA Perfect Prompt Generator
 * 
 * Main entry point combining all components into a cohesive system
 */

export { TaskFrame, TaskFrameBuilder, PromptPlan, ExecutionTrace, ValidationResult } from './core/taskFrame';
export { PromptCompiler } from './core/promptCompiler';
export { ExecutionPipeline, LLMProvider, RetrievalProvider, PipelineResult } from './core/executionPipeline';
export { EvaluationEngine, EvaluationSummary } from './core/evaluationEngine';
export { TelemetryEngine, DriftDetection } from './core/telemetryEngine';

import { TaskFrame, TaskFrameBuilder } from './core/taskFrame';
import { PromptCompiler } from './core/promptCompiler';
import { ExecutionPipeline, LLMProvider, RetrievalProvider } from './core/executionPipeline';
import { EvaluationEngine } from './core/evaluationEngine';
import { TelemetryEngine } from './core/telemetryEngine';

/**
 * Perfect Prompt Generator - The Main Orchestrator
 */
export class PerfectPromptGenerator {
  private compiler: PromptCompiler;
  private pipeline: ExecutionPipeline;
  private evaluator: EvaluationEngine;
  private telemetry: TelemetryEngine;

  constructor(
    private basePath: string,
    private llmProvider: LLMProvider,
    private retrievalProvider?: RetrievalProvider,
    private enableTelemetry: boolean = true
  ) {
    this.compiler = new PromptCompiler(basePath);
    this.pipeline = new ExecutionPipeline(basePath, llmProvider, retrievalProvider);
    this.evaluator = new EvaluationEngine(basePath, llmProvider, retrievalProvider);
    this.telemetry = new TelemetryEngine(basePath, enableTelemetry);
  }

  /**
   * Main generation method: from user intent to validated output
   */
  async generate(taskFrame: TaskFrame) {
    console.log(`🚀 Generating response for task: ${taskFrame.id}`);
    
    const startTime = Date.now();
    
    try {
      // Execute pipeline
      const result = await this.pipeline.execute(taskFrame);
      
      // Record telemetry
      if (this.enableTelemetry) {
        this.telemetry.recordTrace(result.trace);
      }
      
      const duration = Date.now() - startTime;
      console.log(`✅ Generation complete in ${duration}ms (${result.success ? 'SUCCESS' : 'FAILED'})`);
      
      return result;
      
    } catch (error) {
      console.error(`❌ Generation failed:`, error);
      throw error;
    }
  }

  /**
   * Quick generation from simple inputs
   */
  async ask(
    question: string,
    domain: TaskFrame['domain'] = 'general',
    options: {
      style?: 'executive_brief' | 'technical' | 'empathetic';
      format?: 'json' | 'markdown' | 'text';
      must_cite?: boolean;
      max_words?: number;
      sources?: string[];
    } = {}
  ) {
    const taskFrame = TaskFrameBuilder
      .create('qa_with_citations', domain)
      .setInputs({ 
        question,
        sources: options.sources 
      })
      .setConstraints({
        style: options.style || 'executive_brief',
        format: options.format || 'json',
        tone: 'neutral',
        length: { max_words: options.max_words || 120 },
        safety: { no_speculation: true }
      })
      .setContextPolicy({
        retrieval: { k: 6, rerank: true },
        must_cite: options.must_cite ?? true,
        fallback_on_low_confidence: 'insufficient_evidence'
      })
      .setPreferences({
        verbosity: 'tight',
        examples_profile: 'business',
        reasoning_style: 'direct'
      })
      .setOutputSchema('schemas/qa.json')
      .build();

    return await this.generate(taskFrame);
  }

  /**
   * Run evaluation on golden set
   */
  async evaluate(goldenSetPath: string, version: string = 'current') {
    console.log(`📊 Running evaluation with golden set: ${goldenSetPath}`);
    return await this.evaluator.evaluate(goldenSetPath, version);
  }

  /**
   * Run smoke test
   */
  async smokeTest(goldenSetPath: string, maxExamples: number = 5) {
    console.log(`🔍 Running smoke test with ${maxExamples} examples`);
    return await this.evaluator.smokeTest(goldenSetPath, maxExamples);
  }

  /**
   * Get telemetry dashboard
   */
  getDashboard(timeRange: { start: string; end: string }) {
    return this.telemetry.getDashboardData(timeRange);
  }

  /**
   * Generate telemetry report
   */
  generateReport(timeRange: { start: string; end: string }) {
    return this.telemetry.generateReport(timeRange);
  }

  /**
   * Export configuration for external use
   */
  exportConfig() {
    return {
      version: '1.0.0',
      basePath: this.basePath,
      enableTelemetry: this.enableTelemetry,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Utility functions for common operations
 */
export const Utils = {
  /**
   * Create TaskFrame from natural language description
   */
  parseNaturalLanguage(description: string): Partial<TaskFrame> {
    // Simple NL parsing - would be enhanced with proper NLP
    const lower = description.toLowerCase();
    
    let goal: TaskFrame['goal'] = 'qa_with_citations';
    if (lower.includes('summarize') || lower.includes('summary')) goal = 'summarize';
    if (lower.includes('analyze') || lower.includes('analysis')) goal = 'analyze';
    if (lower.includes('plan') || lower.includes('planning')) goal = 'generate_plan';
    if (lower.includes('classify') || lower.includes('category')) goal = 'classify';
    
    let domain: TaskFrame['domain'] = 'general';
    if (lower.includes('policy') || lower.includes('policies')) domain = 'policies';
    if (lower.includes('technical') || lower.includes('code')) domain = 'technical_docs';
    if (lower.includes('business') || lower.includes('marketing')) domain = 'business_plans';
    if (lower.includes('legal') || lower.includes('contract')) domain = 'legal';
    
    let style: any = 'executive_brief';
    if (lower.includes('technical') || lower.includes('detailed')) style = 'technical';
    if (lower.includes('friendly') || lower.includes('casual')) style = 'empathetic';
    
    return {
      goal,
      domain,
      constraints: {
        style,
        format: 'json',
        tone: 'neutral',
        length: { max_words: 200 },
        safety: { no_speculation: true }
      }
    };
  },

  /**
   * Validate TaskFrame completeness
   */
  validateTaskFrame(frame: Partial<TaskFrame>): string[] {
    const errors: string[] = [];
    
    if (!frame.goal) errors.push('Missing goal');
    if (!frame.domain) errors.push('Missing domain');
    if (!frame.constraints) errors.push('Missing constraints');
    if (!frame.context_policy) errors.push('Missing context_policy');
    if (!frame.output_schema) errors.push('Missing output_schema');
    
    return errors;
  },

  /**
   * Generate example TaskFrames for testing
   */
  generateExamples(): TaskFrame[] {
    return [
      TaskFrameBuilder
        .create('qa_with_citations', 'policies')
        .setInputs({ question: 'What is the travel policy for international trips?' })
        .setConstraints({
          style: 'executive_brief',
          format: 'json',
          tone: 'neutral',
          length: { max_words: 120 }
        })
        .setContextPolicy({
          retrieval: { k: 6, rerank: true },
          must_cite: true,
          fallback_on_low_confidence: 'insufficient_evidence'
        })
        .setOutputSchema('schemas/qa.json')
        .build(),
        
      TaskFrameBuilder
        .create('analyze', 'technical_docs')
        .setInputs({ question: 'Analyze the performance implications of this API design' })
        .setConstraints({
          style: 'technical',
          format: 'json',
          tone: 'neutral',
          length: { max_words: 300 }
        })
        .setContextPolicy({
          retrieval: { k: 8, rerank: true },
          must_cite: true,
          fallback_on_low_confidence: 'caveat'
        })
        .setOutputSchema('schemas/qa.json')
        .build()
    ];
  }
};

export default PerfectPromptGenerator;