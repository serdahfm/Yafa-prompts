/**
 * Telemetry Engine: Comprehensive Observability and Learning
 * 
 * Tracks every interaction to enable continuous improvement and debugging
 */

import { ExecutionTrace, TaskFrame, PromptPlan } from './taskFrame';
import * as fs from 'fs';
import * as path from 'path';

interface TelemetryEvent {
  event_type: 'task_start' | 'task_complete' | 'task_error' | 'pattern_selected' | 'model_called' | 'validation_failed';
  timestamp: string;
  trace_id: string;
  taskframe_id?: string;
  plan_id?: string;
  data: Record<string, any>;
  tags: Record<string, string>;
}

interface MetricSample {
  name: string;
  value: number;
  timestamp: string;
  tags: Record<string, string>;
  trace_id?: string;
}

interface AlertRule {
  name: string;
  metric: string;
  condition: 'gt' | 'lt' | 'eq';
  threshold: number;
  window_minutes: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

export interface DriftDetection {
  metric_name: string;
  baseline_value: number;
  current_value: number;
  drift_percentage: number;
  detection_timestamp: string;
  severity: 'warning' | 'critical';
}

export class TelemetryEngine {
  private events: TelemetryEvent[] = [];
  private metrics: MetricSample[] = [];
  private alertRules: AlertRule[] = [];
  private traces: Map<string, ExecutionTrace> = new Map();

  constructor(private basePath: string, private enablePersistence: boolean = true) {
    this.initializeAlertRules();
    
    if (enablePersistence) {
      this.loadPersistedData();
      // Persist data every 60 seconds
      setInterval(() => this.persistData(), 60000);
    }
  }

  /**
   * Record execution trace
   */
  recordTrace(trace: ExecutionTrace) {
    this.traces.set(trace.trace_id, trace);
    
    // Record events
    this.recordEvent({
      event_type: 'task_complete',
      timestamp: trace.timestamps.complete,
      trace_id: trace.trace_id,
      taskframe_id: trace.taskframe_id,
      plan_id: trace.plan_id,
      data: {
        success: true,
        latency_ms: this.calculateLatency(trace),
        cost_usd: trace.metrics.cost_usd,
        token_usage: trace.metrics.tokens,
        violations: trace.violations
      },
      tags: {
        model: trace.model_version,
        compiler_version: trace.compiler_version
      }
    });

    // Record metrics
    this.recordMetrics(trace);
    
    // Check alerts
    this.checkAlerts(trace);
  }

  /**
   * Record custom event
   */
  recordEvent(event: Omit<TelemetryEvent, 'timestamp'> & { timestamp?: string }) {
    const telemetryEvent: TelemetryEvent = {
      ...event,
      timestamp: event.timestamp || new Date().toISOString()
    };
    
    this.events.push(telemetryEvent);
    
    // Keep only last 10k events in memory
    if (this.events.length > 10000) {
      this.events = this.events.slice(-10000);
    }
  }

  /**
   * Record metric sample
   */
  recordMetric(name: string, value: number, tags: Record<string, string> = {}, traceId?: string) {
    const sample: MetricSample = {
      name,
      value,
      timestamp: new Date().toISOString(),
      tags,
      trace_id: traceId
    };
    
    this.metrics.push(sample);
    
    // Keep only last 50k metrics in memory
    if (this.metrics.length > 50000) {
      this.metrics = this.metrics.slice(-50000);
    }
  }

  /**
   * Get telemetry dashboard data
   */
  getDashboardData(timeRange: { start: string; end: string }) {
    const filteredTraces = Array.from(this.traces.values())
      .filter(trace => 
        trace.timestamps.start >= timeRange.start && 
        trace.timestamps.start <= timeRange.end
      );

    return {
      summary: this.calculateSummaryStats(filteredTraces),
      cost_trends: this.calculateCostTrends(filteredTraces),
      latency_percentiles: this.calculateLatencyPercentiles(filteredTraces),
      error_rates: this.calculateErrorRates(filteredTraces),
      model_performance: this.calculateModelPerformance(filteredTraces),
      drift_alerts: this.detectDrift(filteredTraces),
      top_violations: this.getTopViolations(filteredTraces)
    };
  }

  /**
   * Query events with filters
   */
  queryEvents(filters: {
    event_type?: string;
    trace_id?: string;
    taskframe_id?: string;
    start_time?: string;
    end_time?: string;
    tags?: Record<string, string>;
  }): TelemetryEvent[] {
    
    return this.events.filter(event => {
      if (filters.event_type && event.event_type !== filters.event_type) return false;
      if (filters.trace_id && event.trace_id !== filters.trace_id) return false;
      if (filters.taskframe_id && event.taskframe_id !== filters.taskframe_id) return false;
      if (filters.start_time && event.timestamp < filters.start_time) return false;
      if (filters.end_time && event.timestamp > filters.end_time) return false;
      
      if (filters.tags) {
        for (const [key, value] of Object.entries(filters.tags)) {
          if (event.tags[key] !== value) return false;
        }
      }
      
      return true;
    });
  }

  /**
   * Query metrics with aggregation
   */
  queryMetrics(
    metricName: string,
    aggregation: 'avg' | 'sum' | 'min' | 'max' | 'count' | 'p95' | 'p99',
    timeRange: { start: string; end: string },
    groupBy?: string[]
  ) {
    const filteredMetrics = this.metrics.filter(metric => 
      metric.name === metricName &&
      metric.timestamp >= timeRange.start &&
      metric.timestamp <= timeRange.end
    );

    if (groupBy && groupBy.length > 0) {
      return this.aggregateMetricsByGroup(filteredMetrics, aggregation, groupBy);
    } else {
      return this.aggregateMetrics(filteredMetrics, aggregation);
    }
  }

  /**
   * Generate comprehensive report
   */
  generateReport(timeRange: { start: string; end: string }): string {
    const data = this.getDashboardData(timeRange);
    
    return `
# Telemetry Report
**Period**: ${timeRange.start} to ${timeRange.end}

## Summary Statistics
- **Total Executions**: ${data.summary.total_executions}
- **Success Rate**: ${(data.summary.success_rate * 100).toFixed(1)}%
- **Average Cost**: $${data.summary.avg_cost.toFixed(4)}
- **Average Latency**: ${data.summary.avg_latency.toFixed(0)}ms
- **Total Token Usage**: ${data.summary.total_tokens.toLocaleString()}

## Performance Metrics
### Latency Percentiles
- **P50**: ${data.latency_percentiles.p50}ms
- **P95**: ${data.latency_percentiles.p95}ms
- **P99**: ${data.latency_percentiles.p99}ms

### Cost Analysis
- **Total Cost**: $${data.cost_trends.total.toFixed(4)}
- **Cost per 1K Tokens**: $${data.cost_trends.per_1k_tokens.toFixed(4)}

### Model Performance
${Object.entries(data.model_performance).map(([model, stats]: [string, any]) => `
**${model}**:
  - Success Rate: ${(stats.success_rate * 100).toFixed(1)}%
  - Avg Latency: ${stats.avg_latency.toFixed(0)}ms
  - Avg Cost: $${stats.avg_cost.toFixed(4)}
`).join('')}

## Quality Metrics
### Top Violations
${data.top_violations.map((violation: any) => `- ${violation.type}: ${violation.count} occurrences`).join('\n')}

### Error Rates
- **Schema Violations**: ${(data.error_rates.schema * 100).toFixed(1)}%
- **Citation Failures**: ${(data.error_rates.citations * 100).toFixed(1)}%
- **Safety Flags**: ${(data.error_rates.safety * 100).toFixed(1)}%

## Drift Detection
${data.drift_alerts.length > 0 
  ? data.drift_alerts.map((alert: DriftDetection) => `
⚠️  **${alert.metric_name}** drift detected:
  - Baseline: ${alert.baseline_value}
  - Current: ${alert.current_value}
  - Drift: ${alert.drift_percentage.toFixed(1)}%
  - Severity: ${alert.severity}
`).join('')
  : '✅ No significant drift detected'}

## Recommendations
${this.generateRecommendations(data).map(rec => `- ${rec}`).join('\n')}
`;
  }

  /**
   * Private implementation methods
   */
  private recordMetrics(trace: ExecutionTrace) {
    const tags = {
      model: trace.model_version,
      compiler_version: trace.compiler_version
    };

    // Core metrics
    this.recordMetric('execution.latency_ms', this.calculateLatency(trace), tags, trace.trace_id);
    this.recordMetric('execution.cost_usd', trace.metrics.cost_usd, tags, trace.trace_id);
    this.recordMetric('execution.tokens.total', trace.metrics.tokens.total, tags, trace.trace_id);
    this.recordMetric('execution.tokens.prompt', trace.metrics.tokens.prompt, tags, trace.trace_id);
    this.recordMetric('execution.tokens.completion', trace.metrics.tokens.completion, tags, trace.trace_id);
    
    // Quality metrics
    this.recordMetric('quality.citation_coverage', trace.metrics.citation_coverage, tags, trace.trace_id);
    this.recordMetric('quality.schema_violations', trace.violations.schema, tags, trace.trace_id);
    this.recordMetric('quality.citations_missing', trace.violations.citations_missing, tags, trace.trace_id);
    
    // Efficiency metrics
    this.recordMetric('efficiency.retrieved_chunks', trace.metrics.retrieved_chunks, tags, trace.trace_id);
    this.recordMetric('efficiency.cost_per_token', trace.metrics.cost_usd / trace.metrics.tokens.total, tags, trace.trace_id);
  }

  private calculateLatency(trace: ExecutionTrace): number {
    const start = new Date(trace.timestamps.start).getTime();
    const end = new Date(trace.timestamps.complete).getTime();
    return end - start;
  }

  private initializeAlertRules() {
    this.alertRules = [
      {
        name: 'High Cost Alert',
        metric: 'execution.cost_usd',
        condition: 'gt',
        threshold: 0.05,
        window_minutes: 5,
        severity: 'high',
        enabled: true
      },
      {
        name: 'High Latency Alert',
        metric: 'execution.latency_ms',
        condition: 'gt',
        threshold: 10000,
        window_minutes: 5,
        severity: 'medium',
        enabled: true
      },
      {
        name: 'Low Citation Coverage',
        metric: 'quality.citation_coverage',
        condition: 'lt',
        threshold: 0.7,
        window_minutes: 10,
        severity: 'medium',
        enabled: true
      },
      {
        name: 'Schema Violations',
        metric: 'quality.schema_violations',
        condition: 'gt',
        threshold: 0,
        window_minutes: 1,
        severity: 'high',
        enabled: true
      }
    ];
  }

  private checkAlerts(trace: ExecutionTrace) {
    const now = new Date();
    
    for (const rule of this.alertRules.filter(r => r.enabled)) {
      const windowStart = new Date(now.getTime() - rule.window_minutes * 60 * 1000);
      
      // Get recent metrics for this rule
      const recentMetrics = this.metrics.filter(m => 
        m.name === rule.metric &&
        new Date(m.timestamp) >= windowStart
      );

      if (recentMetrics.length === 0) continue;

      const latestValue = recentMetrics[recentMetrics.length - 1].value;
      
      let triggered = false;
      switch (rule.condition) {
        case 'gt':
          triggered = latestValue > rule.threshold;
          break;
        case 'lt':
          triggered = latestValue < rule.threshold;
          break;
        case 'eq':
          triggered = latestValue === rule.threshold;
          break;
      }

      if (triggered) {
        this.recordEvent({
          event_type: 'task_error',
          trace_id: trace.trace_id,
          data: {
            alert_rule: rule.name,
            metric: rule.metric,
            value: latestValue,
            threshold: rule.threshold,
            severity: rule.severity
          },
          tags: {
            alert: 'true',
            severity: rule.severity
          }
        });
      }
    }
  }

  private calculateSummaryStats(traces: ExecutionTrace[]) {
    const successful = traces.filter(t => t.violations.schema === 0);
    const totalCost = traces.reduce((sum, t) => sum + t.metrics.cost_usd, 0);
    const totalLatency = traces.reduce((sum, t) => sum + this.calculateLatency(t), 0);
    const totalTokens = traces.reduce((sum, t) => sum + t.metrics.tokens.total, 0);

    return {
      total_executions: traces.length,
      success_rate: traces.length > 0 ? successful.length / traces.length : 0,
      avg_cost: traces.length > 0 ? totalCost / traces.length : 0,
      avg_latency: traces.length > 0 ? totalLatency / traces.length : 0,
      total_tokens: totalTokens
    };
  }

  private calculateLatencyPercentiles(traces: ExecutionTrace[]) {
    const latencies = traces.map(t => this.calculateLatency(t)).sort((a, b) => a - b);
    
    if (latencies.length === 0) return { p50: 0, p95: 0, p99: 0 };
    
    return {
      p50: latencies[Math.floor(latencies.length * 0.5)],
      p95: latencies[Math.floor(latencies.length * 0.95)],
      p99: latencies[Math.floor(latencies.length * 0.99)]
    };
  }

  private calculateCostTrends(traces: ExecutionTrace[]) {
    const totalCost = traces.reduce((sum, t) => sum + t.metrics.cost_usd, 0);
    const totalTokens = traces.reduce((sum, t) => sum + t.metrics.tokens.total, 0);
    
    return {
      total: totalCost,
      per_1k_tokens: totalTokens > 0 ? (totalCost / totalTokens) * 1000 : 0
    };
  }

  private calculateErrorRates(traces: ExecutionTrace[]) {
    if (traces.length === 0) return { schema: 0, citations: 0, safety: 0 };
    
    return {
      schema: traces.filter(t => t.violations.schema > 0).length / traces.length,
      citations: traces.filter(t => t.violations.citations_missing > 0).length / traces.length,
      safety: traces.filter(t => t.violations.safety_flags.length > 0).length / traces.length
    };
  }

  private calculateModelPerformance(traces: ExecutionTrace[]) {
    const byModel: Record<string, any> = {};
    
    for (const trace of traces) {
      const model = trace.model_version;
      if (!byModel[model]) {
        byModel[model] = {
          count: 0,
          total_cost: 0,
          total_latency: 0,
          successful: 0
        };
      }
      
      byModel[model].count++;
      byModel[model].total_cost += trace.metrics.cost_usd;
      byModel[model].total_latency += this.calculateLatency(trace);
      if (trace.violations.schema === 0) byModel[model].successful++;
    }
    
    // Calculate averages
    for (const [model, stats] of Object.entries(byModel)) {
      (stats as any).success_rate = stats.successful / stats.count;
      (stats as any).avg_cost = stats.total_cost / stats.count;
      (stats as any).avg_latency = stats.total_latency / stats.count;
    }
    
    return byModel;
  }

  private detectDrift(traces: ExecutionTrace[]): DriftDetection[] {
    // Simple drift detection - compare recent vs historical averages
    const drifts: DriftDetection[] = [];
    
    if (traces.length < 20) return drifts; // Need sufficient data
    
    const mid = Math.floor(traces.length / 2);
    const historical = traces.slice(0, mid);
    const recent = traces.slice(mid);
    
    const metrics = ['cost_usd', 'citation_coverage'];
    
    for (const metric of metrics) {
      const historicalAvg = historical.reduce((sum, t) => 
        sum + (metric === 'cost_usd' ? t.metrics.cost_usd : t.metrics.citation_coverage), 0
      ) / historical.length;
      
      const recentAvg = recent.reduce((sum, t) => 
        sum + (metric === 'cost_usd' ? t.metrics.cost_usd : t.metrics.citation_coverage), 0
      ) / recent.length;
      
      const driftPercentage = Math.abs((recentAvg - historicalAvg) / historicalAvg) * 100;
      
      if (driftPercentage > 20) { // 20% drift threshold
        drifts.push({
          metric_name: metric,
          baseline_value: historicalAvg,
          current_value: recentAvg,
          drift_percentage: driftPercentage,
          detection_timestamp: new Date().toISOString(),
          severity: driftPercentage > 50 ? 'critical' : 'warning'
        });
      }
    }
    
    return drifts;
  }

  private getTopViolations(traces: ExecutionTrace[]) {
    const violations: Record<string, number> = {};
    
    for (const trace of traces) {
      if (trace.violations.schema > 0) {
        violations['Schema Violations'] = (violations['Schema Violations'] || 0) + 1;
      }
      if (trace.violations.citations_missing > 0) {
        violations['Missing Citations'] = (violations['Missing Citations'] || 0) + 1;
      }
      if (trace.violations.length_overflow) {
        violations['Length Overflow'] = (violations['Length Overflow'] || 0) + 1;
      }
      for (const flag of trace.violations.safety_flags) {
        violations[`Safety: ${flag}`] = (violations[`Safety: ${flag}`] || 0) + 1;
      }
    }
    
    return Object.entries(violations)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private aggregateMetrics(metrics: MetricSample[], aggregation: string): number {
    if (metrics.length === 0) return 0;
    
    const values = metrics.map(m => m.value);
    
    switch (aggregation) {
      case 'avg':
        return values.reduce((sum, v) => sum + v, 0) / values.length;
      case 'sum':
        return values.reduce((sum, v) => sum + v, 0);
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'count':
        return values.length;
      case 'p95':
        values.sort((a, b) => a - b);
        return values[Math.floor(values.length * 0.95)];
      case 'p99':
        values.sort((a, b) => a - b);
        return values[Math.floor(values.length * 0.99)];
      default:
        return 0;
    }
  }

  private aggregateMetricsByGroup(metrics: MetricSample[], aggregation: string, groupBy: string[]) {
    const groups: Record<string, MetricSample[]> = {};
    
    for (const metric of metrics) {
      const key = groupBy.map(field => metric.tags[field] || 'unknown').join('|');
      if (!groups[key]) groups[key] = [];
      groups[key].push(metric);
    }
    
    const result: Record<string, number> = {};
    for (const [key, groupMetrics] of Object.entries(groups)) {
      result[key] = this.aggregateMetrics(groupMetrics, aggregation);
    }
    
    return result;
  }

  private generateRecommendations(data: any): string[] {
    const recommendations: string[] = [];
    
    if (data.summary.success_rate < 0.9) {
      recommendations.push('Success rate below 90% - review schema validation and error handling');
    }
    
    if (data.summary.avg_cost > 0.02) {
      recommendations.push('High average cost - consider using smaller models or optimizing prompts');
    }
    
    if (data.latency_percentiles.p95 > 5000) {
      recommendations.push('High P95 latency - investigate slow requests and optimize retrieval');
    }
    
    if (data.error_rates.citations > 0.1) {
      recommendations.push('High citation failure rate - improve context quality and citation training');
    }
    
    if (data.drift_alerts.length > 0) {
      recommendations.push('Drift detected - investigate recent changes and update baselines');
    }
    
    return recommendations;
  }

  private persistData() {
    if (!this.enablePersistence) return;
    
    try {
      const telemetryDir = path.join(this.basePath, 'telemetry');
      if (!fs.existsSync(telemetryDir)) {
        fs.mkdirSync(telemetryDir, { recursive: true });
      }
      
      // Save events
      const eventsFile = path.join(telemetryDir, 'events.jsonl');
      const eventsData = this.events.map(e => JSON.stringify(e)).join('\n');
      fs.writeFileSync(eventsFile, eventsData);
      
      // Save metrics
      const metricsFile = path.join(telemetryDir, 'metrics.jsonl');
      const metricsData = this.metrics.map(m => JSON.stringify(m)).join('\n');
      fs.writeFileSync(metricsFile, metricsData);
      
    } catch (error) {
      console.warn('Failed to persist telemetry data:', error);
    }
  }

  private loadPersistedData() {
    if (!this.enablePersistence) return;
    
    try {
      const telemetryDir = path.join(this.basePath, 'telemetry');
      
      // Load events
      const eventsFile = path.join(telemetryDir, 'events.jsonl');
      if (fs.existsSync(eventsFile)) {
        const eventsData = fs.readFileSync(eventsFile, 'utf8');
        this.events = eventsData.trim().split('\n').map(line => JSON.parse(line));
      }
      
      // Load metrics
      const metricsFile = path.join(telemetryDir, 'metrics.jsonl');
      if (fs.existsSync(metricsFile)) {
        const metricsData = fs.readFileSync(metricsFile, 'utf8');
        this.metrics = metricsData.trim().split('\n').map(line => JSON.parse(line));
      }
      
    } catch (error) {
      console.warn('Failed to load persisted telemetry data:', error);
    }
  }
}
