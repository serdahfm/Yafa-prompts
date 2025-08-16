/**
 * Evaluation Engine: Golden-Set Testing and Continuous Learning
 * 
 * Ensures quality and prevents regressions through systematic evaluation
 */

import { TaskFrame, ValidationResult } from './taskFrame';
import { ExecutionPipeline, LLMProvider, RetrievalProvider } from './executionPipeline';
import { TaskFrameBuilder } from './taskFrame';
import * as fs from 'fs';
import * as path from 'path';

interface GoldenExample {
  id: string;
  question: string;
  domain: TaskFrame['domain'];
  must_contain: string[];
  must_not_contain?: string[];
  must_cite: boolean;
  expected_confidence: number;
  max_cost_usd: number;
  expected_flags?: string[];
  timeout_ms?: number;
}

interface EvaluationResult {
  example_id: string;
  passed: boolean;
  score: number;
  metrics: {
    cost_usd: number;
    latency_ms: number;
    citation_coverage: number;
    confidence: number;
    word_count: number;
  };
  violations: {
    missing_content: string[];
    forbidden_content: string[];
    cost_exceeded: boolean;
    timeout_exceeded: boolean;
    low_confidence: boolean;
    citation_failures: string[];
  };
  output: any;
  trace_id: string;
}

export interface EvaluationSummary {
  total_examples: number;
  passed: number;
  failed: number;
  pass_rate: number;
  average_score: number;
  total_cost: number;
  average_latency: number;
  regression_detected: boolean;
  critical_failures: string[];
  results: EvaluationResult[];
}

export class EvaluationEngine {
  private pipeline: ExecutionPipeline;
  private benchmarkResults: Map<string, EvaluationSummary> = new Map();

  constructor(
    private basePath: string,
    llmProvider: LLMProvider,
    retrievalProvider?: RetrievalProvider
  ) {
    this.pipeline = new ExecutionPipeline(basePath, llmProvider, retrievalProvider);
  }

  /**
   * Run evaluation on golden set
   */
  async evaluate(
    goldenSetPath: string, 
    version: string = 'current',
    parallel: boolean = false
  ): Promise<EvaluationSummary> {
    
    const examples = this.loadGoldenSet(goldenSetPath);
    console.log(`Running evaluation on ${examples.length} examples (version: ${version})`);

    // Run evaluations
    const results = parallel 
      ? await this.runParallelEvaluations(examples)
      : await this.runSequentialEvaluations(examples);

    // Calculate summary
    const summary = this.calculateSummary(results, version);
    
    // Store for regression detection
    this.benchmarkResults.set(version, summary);
    
    // Check for regressions
    summary.regression_detected = this.detectRegression(summary, version);
    
    // Log results
    this.logEvaluationResults(summary);
    
    return summary;
  }

  /**
   * Quick smoke test with subset of examples
   */
  async smokeTest(goldenSetPath: string, maxExamples: number = 5): Promise<boolean> {
    const allExamples = this.loadGoldenSet(goldenSetPath);
    const examples = allExamples.slice(0, maxExamples);
    
    const results = await this.runSequentialEvaluations(examples);
    const passRate = results.filter(r => r.passed).length / results.length;
    
    console.log(`Smoke test: ${results.length} examples, ${(passRate * 100).toFixed(1)}% pass rate`);
    
    return passRate >= 0.8; // 80% pass rate for smoke test
  }

  /**
   * Run A/B test between two configurations
   */
  async compareConfigurations(
    goldenSetPath: string,
    configA: string,
    configB: string
  ): Promise<{
    winner: string;
    confidence: number;
    metrics_comparison: Record<string, { a: number; b: number; improvement: number }>;
  }> {
    
    const summaryA = await this.evaluate(goldenSetPath, configA);
    const summaryB = await this.evaluate(goldenSetPath, configB);
    
    const metrics = {
      pass_rate: {
        a: summaryA.pass_rate,
        b: summaryB.pass_rate,
        improvement: ((summaryB.pass_rate - summaryA.pass_rate) / summaryA.pass_rate) * 100
      },
      avg_score: {
        a: summaryA.average_score,
        b: summaryB.average_score,
        improvement: ((summaryB.average_score - summaryA.average_score) / summaryA.average_score) * 100
      },
      avg_cost: {
        a: summaryA.total_cost / summaryA.total_examples,
        b: summaryB.total_cost / summaryB.total_examples,
        improvement: ((summaryA.total_cost / summaryA.total_examples - summaryB.total_cost / summaryB.total_examples) / (summaryA.total_cost / summaryA.total_examples)) * 100
      },
      avg_latency: {
        a: summaryA.average_latency,
        b: summaryB.average_latency,
        improvement: ((summaryA.average_latency - summaryB.average_latency) / summaryA.average_latency) * 100
      }
    };

    // Simple scoring: pass rate (50%) + quality (30%) + efficiency (20%)
    const scoreA = summaryA.pass_rate * 0.5 + summaryA.average_score * 0.3 + (1 - (summaryA.total_cost / summaryA.total_examples) / 0.02) * 0.2;
    const scoreB = summaryB.pass_rate * 0.5 + summaryB.average_score * 0.3 + (1 - (summaryB.total_cost / summaryB.total_examples) / 0.02) * 0.2;
    
    return {
      winner: scoreB > scoreA ? configB : configA,
      confidence: Math.abs(scoreB - scoreA) / Math.max(scoreA, scoreB),
      metrics_comparison: metrics
    };
  }

  /**
   * Generate evaluation report
   */
  generateReport(summary: EvaluationSummary): string {
    const report = `
# Evaluation Report

## Summary
- **Total Examples**: ${summary.total_examples}
- **Pass Rate**: ${(summary.pass_rate * 100).toFixed(1)}%
- **Average Score**: ${summary.average_score.toFixed(3)}
- **Total Cost**: $${summary.total_cost.toFixed(4)}
- **Average Latency**: ${summary.average_latency.toFixed(0)}ms
- **Regression Detected**: ${summary.regression_detected ? '⚠️ YES' : '✅ NO'}

## Critical Failures
${summary.critical_failures.length > 0 
  ? summary.critical_failures.map(f => `- ${f}`).join('\n')
  : '✅ No critical failures'}

## Detailed Results
${summary.results.map(r => `
### ${r.example_id} ${r.passed ? '✅' : '❌'}
- **Score**: ${r.score.toFixed(3)}
- **Cost**: $${r.metrics.cost_usd.toFixed(4)}
- **Latency**: ${r.metrics.latency_ms}ms
- **Citation Coverage**: ${(r.metrics.citation_coverage * 100).toFixed(1)}%
- **Confidence**: ${(r.metrics.confidence * 100).toFixed(1)}%
${r.violations.missing_content.length > 0 ? `- **Missing Content**: ${r.violations.missing_content.join(', ')}` : ''}
${r.violations.forbidden_content.length > 0 ? `- **Forbidden Content**: ${r.violations.forbidden_content.join(', ')}` : ''}
`).join('\n')}
`;

    return report;
  }

  /**
   * Private implementation methods
   */
  private async runSequentialEvaluations(examples: GoldenExample[]): Promise<EvaluationResult[]> {
    const results: EvaluationResult[] = [];
    
    for (const example of examples) {
      try {
        const result = await this.evaluateExample(example);
        results.push(result);
        
        // Progress indicator
        console.log(`Evaluated ${results.length}/${examples.length}: ${example.id} ${result.passed ? '✅' : '❌'}`);
      } catch (error) {
        console.error(`Failed to evaluate ${example.id}:`, error);
        results.push(this.createFailureResult(example, error));
      }
    }
    
    return results;
  }

  private async runParallelEvaluations(examples: GoldenExample[]): Promise<EvaluationResult[]> {
    const promises = examples.map(example => 
      this.evaluateExample(example).catch(error => this.createFailureResult(example, error))
    );
    
    return await Promise.all(promises);
  }

  private async evaluateExample(example: GoldenExample): Promise<EvaluationResult> {
    const startTime = Date.now();
    
    // Build TaskFrame from example
    const taskFrame = TaskFrameBuilder
      .create('qa_with_citations', example.domain)
      .setInputs({ question: example.question })
      .setConstraints({
        style: 'executive_brief',
        format: 'json',
        tone: 'neutral',
        length: { max_words: 120 }
      })
      .setContextPolicy({
        retrieval: { k: 6, rerank: true },
        must_cite: example.must_cite,
        fallback_on_low_confidence: 'insufficient_evidence'
      })
      .setPreferences({
        verbosity: 'tight',
        examples_profile: 'business',
        reasoning_style: 'direct'
      })
      .setOutputSchema('schemas/qa.json')
      .build();

    // Execute pipeline
    const pipelineResult = await this.pipeline.execute(taskFrame);
    const latency = Date.now() - startTime;

    // Evaluate result
    const result: EvaluationResult = {
      example_id: example.id,
      passed: true,
      score: 1.0,
      metrics: {
        cost_usd: pipelineResult.trace.metrics.cost_usd,
        latency_ms: latency,
        citation_coverage: pipelineResult.trace.metrics.citation_coverage,
        confidence: pipelineResult.output?.confidence || 0,
        word_count: pipelineResult.output?._metadata?.word_count || 0
      },
      violations: {
        missing_content: [],
        forbidden_content: [],
        cost_exceeded: false,
        timeout_exceeded: false,
        low_confidence: false,
        citation_failures: []
      },
      output: pipelineResult.output,
      trace_id: pipelineResult.trace.trace_id
    };

    // Check violations
    this.checkContentViolations(result, example, pipelineResult.output);
    this.checkMetricViolations(result, example);
    
    // Calculate overall score
    result.score = this.calculateExampleScore(result, example);
    result.passed = result.score >= 0.7; // 70% threshold

    return result;
  }

  private checkContentViolations(result: EvaluationResult, example: GoldenExample, output: any) {
    const answerText = output?.answer?.toLowerCase() || '';
    
    // Check must_contain
    for (const required of example.must_contain) {
      if (!answerText.includes(required.toLowerCase())) {
        result.violations.missing_content.push(required);
      }
    }
    
    // Check must_not_contain
    if (example.must_not_contain) {
      for (const forbidden of example.must_not_contain) {
        if (answerText.includes(forbidden.toLowerCase())) {
          result.violations.forbidden_content.push(forbidden);
        }
      }
    }
    
    // Check citation requirements
    if (example.must_cite && result.metrics.citation_coverage < 0.8) {
      result.violations.citation_failures.push('Low citation coverage');
    }
  }

  private checkMetricViolations(result: EvaluationResult, example: GoldenExample) {
    // Check cost
    if (result.metrics.cost_usd > example.max_cost_usd) {
      result.violations.cost_exceeded = true;
    }
    
    // Check timeout
    if (example.timeout_ms && result.metrics.latency_ms > example.timeout_ms) {
      result.violations.timeout_exceeded = true;
    }
    
    // Check confidence
    if (result.metrics.confidence < example.expected_confidence) {
      result.violations.low_confidence = true;
    }
  }

  private calculateExampleScore(result: EvaluationResult, example: GoldenExample): number {
    let score = 1.0;
    
    // Content penalties
    score -= result.violations.missing_content.length * 0.2;
    score -= result.violations.forbidden_content.length * 0.3;
    
    // Citation penalty
    if (example.must_cite && result.metrics.citation_coverage < 0.8) {
      score -= 0.2;
    }
    
    // Efficiency bonuses/penalties
    if (result.violations.cost_exceeded) score -= 0.1;
    if (result.violations.timeout_exceeded) score -= 0.1;
    if (result.violations.low_confidence) score -= 0.1;
    
    return Math.max(0, Math.min(1, score));
  }

  private calculateSummary(results: EvaluationResult[], version: string): EvaluationSummary {
    const passed = results.filter(r => r.passed).length;
    const totalCost = results.reduce((sum, r) => sum + r.metrics.cost_usd, 0);
    const totalLatency = results.reduce((sum, r) => sum + r.metrics.latency_ms, 0);
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;

    const criticalFailures: string[] = [];
    for (const result of results.filter(r => !r.passed)) {
      if (result.violations.missing_content.length > 0) {
        criticalFailures.push(`${result.example_id}: Missing required content`);
      }
      if (result.violations.cost_exceeded) {
        criticalFailures.push(`${result.example_id}: Cost exceeded`);
      }
    }

    return {
      total_examples: results.length,
      passed,
      failed: results.length - passed,
      pass_rate: passed / results.length,
      average_score: avgScore,
      total_cost: totalCost,
      average_latency: totalLatency / results.length,
      regression_detected: false, // Will be set by detectRegression
      critical_failures: criticalFailures,
      results
    };
  }

  private detectRegression(current: EvaluationSummary, version: string): boolean {
    const baseline = this.benchmarkResults.get('baseline') || this.benchmarkResults.get('main');
    if (!baseline) return false;

    // Regression if pass rate drops >5% or average score drops >10%
    const passRateRegression = (baseline.pass_rate - current.pass_rate) > 0.05;
    const scoreRegression = (baseline.average_score - current.average_score) / baseline.average_score > 0.1;
    
    return passRateRegression || scoreRegression;
  }

  private createFailureResult(example: GoldenExample, error: any): EvaluationResult {
    return {
      example_id: example.id,
      passed: false,
      score: 0,
      metrics: { cost_usd: 0, latency_ms: 0, citation_coverage: 0, confidence: 0, word_count: 0 },
      violations: {
        missing_content: ['Execution failed'],
        forbidden_content: [],
        cost_exceeded: false,
        timeout_exceeded: false,
        low_confidence: true,
        citation_failures: []
      },
      output: { error: error.message },
      trace_id: 'failed'
    };
  }

  private loadGoldenSet(goldenSetPath: string): GoldenExample[] {
    const content = fs.readFileSync(goldenSetPath, 'utf8');
    const lines = content.trim().split('\n');
    return lines.map(line => JSON.parse(line));
  }

  private logEvaluationResults(summary: EvaluationSummary) {
    console.log('\n📊 Evaluation Summary:');
    console.log(`   Pass Rate: ${(summary.pass_rate * 100).toFixed(1)}%`);
    console.log(`   Average Score: ${summary.average_score.toFixed(3)}`);
    console.log(`   Total Cost: $${summary.total_cost.toFixed(4)}`);
    console.log(`   Average Latency: ${summary.average_latency.toFixed(0)}ms`);
    console.log(`   Regression: ${summary.regression_detected ? '⚠️  DETECTED' : '✅ None'}`);
    
    if (summary.critical_failures.length > 0) {
      console.log('\n❌ Critical Failures:');
      summary.critical_failures.forEach(failure => console.log(`   - ${failure}`));
    }
  }
}
