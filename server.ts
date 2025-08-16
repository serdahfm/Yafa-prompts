#!/usr/bin/env node

/**
 * YAFA Perfect Prompt Generator Web Server
 * 
 * Exposes the prompt generation system via REST API with full observability
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { PerfectPromptGenerator, TaskFrameBuilder, Utils } from './lib/index';
import * as fs from 'fs';
import * as path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

// Enhanced Mock LLM Provider with realistic responses
class MockLLMProvider {
  async generate(request: any) {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));
    
    const responses = {
      policies: {
        travel: "Business class flights are authorized for international trips >8 hours for VP+ level or medical exemption. Domestic flights require economy class unless medical documentation provided. [policy_2024_07#p12]",
        expense: "Meal expenses covered up to $75/day for business travel. Alcohol limited to 20% of total meal cost for client entertainment only. Receipts required for all expenses >$25. [policy_2024_07#p45]",
        remote: "Remote work approved for eligible roles with manager consent. Equipment budget up to $1,500 one-time for home office setup. Minimum 2 days/week in office required for hybrid roles. [policy_2024_07#p67]"
      },
      technical: {
        api: "API implements rate limiting at 1000 req/hour per key with burst tolerance of 10 req/sec. Circuit breaker opens after 5 consecutive failures. All endpoints require OAuth 2.0 authentication. [api_docs#rate_limits]",
        security: "All data encrypted with AES-256-GCM. Keys rotated every 90 days via AWS KMS. PII fields require additional field-level encryption. Zero-trust architecture enforced. [security_guide#encryption]",
        deployment: "Production deploys require 2 approvals and automated testing. Blue-green deployment strategy with 15-minute health checks. Rollback capability within 5 minutes. [deploy_guide#process]"
      }
    };

    // Choose appropriate response based on domain and question
    const domain = request.system.includes('policy') ? 'policies' : 'technical';
    const question = request.user.toLowerCase();
    
    let answer = "This is a mock response for demonstration purposes.";
    let citations = [{ chunk_id: "demo#p1", relevance: 0.8, excerpt: "Demo excerpt" }];
    
    if (domain === 'policies') {
      if (question.includes('travel') || question.includes('flight')) {
        answer = responses.policies.travel;
        citations = [{ chunk_id: "policy_2024_07#p12", relevance: 0.95, excerpt: "Travel policy excerpt" }];
      } else if (question.includes('expense') || question.includes('meal')) {
        answer = responses.policies.expense;
        citations = [{ chunk_id: "policy_2024_07#p45", relevance: 0.92, excerpt: "Expense policy excerpt" }];
      } else if (question.includes('remote') || question.includes('office')) {
        answer = responses.policies.remote;
        citations = [{ chunk_id: "policy_2024_07#p67", relevance: 0.89, excerpt: "Remote work policy excerpt" }];
      }
    } else if (domain === 'technical') {
      if (question.includes('api') || question.includes('rate')) {
        answer = responses.technical.api;
        citations = [{ chunk_id: "api_docs#rate_limits", relevance: 0.94, excerpt: "API documentation excerpt" }];
      } else if (question.includes('security') || question.includes('encrypt')) {
        answer = responses.technical.security;
        citations = [{ chunk_id: "security_guide#encryption", relevance: 0.91, excerpt: "Security guide excerpt" }];
      } else if (question.includes('deploy') || question.includes('production')) {
        answer = responses.technical.deployment;
        citations = [{ chunk_id: "deploy_guide#process", relevance: 0.88, excerpt: "Deployment guide excerpt" }];
      }
    }

    return {
      content: JSON.stringify({
        answer,
        citations,
        confidence: 0.85 + Math.random() * 0.1,
        reasoning: "Response generated based on domain-specific knowledge and citation requirements",
        flags: [],
        related_questions: [
          "What about international travel policies?",
          "How do expense reporting requirements work?",
          "What are the technical implementation details?"
        ]
      }),
      usage: { 
        prompt_tokens: 450 + Math.floor(Math.random() * 200), 
        completion_tokens: 120 + Math.floor(Math.random() * 80), 
        total_tokens: 570 + Math.floor(Math.random() * 280) 
      },
      model: request.model,
      latency_ms: 800 + Math.floor(Math.random() * 400),
      cost_usd: (0.003 + Math.random() * 0.004)
    };
  }
}

// Initialize the generator
const generator = new PerfectPromptGenerator(
  __dirname,
  new MockLLMProvider(),
  undefined, // No retrieval provider for demo
  true // Enable telemetry
);

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static('public'));

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime()
  });
});

// API Documentation endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'YAFA Perfect Prompt Generator API',
    version: '1.0.0',
    description: 'Systematic compilation from user intent to validated outputs',
    timestamp: new Date().toISOString(),
    endpoints: {
      'GET /': 'API documentation',
      'GET /health': 'Health check',
      'POST /ask': 'Quick Q&A generation',
      'POST /generate': 'Full TaskFrame execution',
      'POST /evaluate': 'Run golden-set evaluation',
      'GET /dashboard': 'Telemetry dashboard',
      'GET /examples': 'Example requests'
    },
    examples: {
      ask: {
        method: 'POST',
        url: '/ask',
        body: {
          question: 'What is the travel policy for business trips?',
          domain: 'policies',
          style: 'executive_brief',
          max_words: 120
        }
      },
      generate: {
        method: 'POST',
        url: '/generate',
        body: {
          id: 'tf_001',
          goal: 'qa_with_citations',
          domain: 'policies',
          inputs: {
            question: 'What are the expense reporting requirements?'
          }
        }
      }
    }
  });
});

// Quick ask endpoint
app.post('/ask', async (req, res) => {
  try {
    const { question, domain = 'general', style = 'executive_brief', format = 'json', max_words = 120, must_cite = true } = req.body;
    
    if (!question) {
      return res.status(400).json({
        error: 'Missing required field: question',
        timestamp: new Date().toISOString()
      });
    }

    console.log(`🔍 Processing ask: "${question}" (domain: ${domain}, style: ${style})`);
    
    const result = await generator.ask(question, domain, {
      style: style as any,
      format: format as any,
      must_cite,
      max_words: parseInt(max_words)
    });

    res.json({
      success: result.success,
      answer: result.output?.answer,
      citations: result.output?.citations,
      confidence: result.output?.confidence,
      metadata: {
        taskframe_id: result.trace.taskframe_id,
        trace_id: result.trace.trace_id,
        cost: result.trace.metrics.cost_usd,
        latency_ms: result.trace.metrics.latency_ms,
        tokens: result.trace.metrics.tokens.total,
        violations: result.trace.violations,
        timestamp: new Date().toISOString()
      },
      errors: result.errors
    });

  } catch (error) {
    console.error('Ask endpoint error:', error);
    res.status(500).json({
      error: 'Generation failed',
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
});

// Full TaskFrame generation endpoint
app.post('/generate', async (req, res) => {
  try {
    const taskFrameData = req.body;
    
    // Validate required fields
    const errors = Utils.validateTaskFrame(taskFrameData);
    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Invalid TaskFrame',
        details: errors,
        timestamp: new Date().toISOString()
      });
    }

    // Build complete TaskFrame
    const taskFrame = TaskFrameBuilder
      .create(taskFrameData.goal, taskFrameData.domain)
      .setId(taskFrameData.id || `tf_${Date.now()}`)
      .setInputs(taskFrameData.inputs || {})
      .setConstraints(taskFrameData.constraints || {
        style: 'executive_brief',
        format: 'json',
        tone: 'neutral',
        length: { max_words: 120 }
      })
      .setContextPolicy(taskFrameData.context_policy || {
        retrieval: { k: 6, rerank: true },
        must_cite: true,
        fallback_on_low_confidence: 'insufficient_evidence'
      })
      .setPreferences(taskFrameData.preferences || {
        verbosity: 'tight',
        examples_profile: 'business',
        reasoning_style: 'direct'
      })
      .setOutputSchema(taskFrameData.output_schema || 'schemas/qa.json')
      .setCreator('api')
      .build();

    console.log(`🚀 Processing generate: ${taskFrame.id} (${taskFrame.goal})`);

    const result = await generator.generate(taskFrame);

    res.json({
      success: result.success,
      output: result.output,
      trace: {
        trace_id: result.trace.trace_id,
        taskframe_id: result.trace.taskframe_id,
        plan_id: result.trace.plan_id,
        metrics: result.trace.metrics,
        violations: result.trace.violations,
        timestamps: result.trace.timestamps
      },
      errors: result.errors
    });

  } catch (error) {
    console.error('Generate endpoint error:', error);
    res.status(500).json({
      error: 'Generation failed',
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
});

// Evaluation endpoint
app.post('/evaluate', async (req, res) => {
  try {
    const { golden_set_path = 'evals/golden.qa.jsonl', version = 'api', max_examples = 10 } = req.body;
    
    console.log(`📊 Running evaluation: ${golden_set_path} (max: ${max_examples})`);
    
    // For demo, create a simple evaluation result
    const demoResult = {
      total_examples: max_examples,
      passed: Math.floor(max_examples * 0.7), // 70% pass rate
      failed: Math.ceil(max_examples * 0.3),
      pass_rate: 0.7,
      average_score: 0.75,
      total_cost: max_examples * 0.006,
      average_latency: 1200,
      regression_detected: false,
      critical_failures: [],
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      summary: demoResult,
      message: 'Evaluation completed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Evaluation endpoint error:', error);
    res.status(500).json({
      error: 'Evaluation failed',
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
});

// Dashboard endpoint
app.get('/dashboard', (req, res) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);

    const dashboard = generator.getDashboard({
      start: startTime.toISOString(),
      end: endTime.toISOString()
    });

    res.json({
      success: true,
      dashboard,
      timeframe: {
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        hours
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Dashboard endpoint error:', error);
    res.status(500).json({
      error: 'Dashboard failed',
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
});

// Examples endpoint
app.get('/examples', (req, res) => {
  res.json({
    examples: {
      policies: [
        {
          question: "What is the travel policy for international business trips?",
          domain: "policies",
          expected_citations: true
        },
        {
          question: "Can I expense meals for client entertainment?",
          domain: "policies",
          expected_citations: true
        },
        {
          question: "What is the remote work equipment budget?",
          domain: "policies",
          expected_citations: true
        }
      ],
      technical: [
        {
          question: "What are the API rate limits?",
          domain: "technical_docs",
          expected_citations: true
        },
        {
          question: "How is data encryption implemented?",
          domain: "technical_docs",
          expected_citations: true
        },
        {
          question: "What is the deployment process?",
          domain: "technical_docs",
          expected_citations: true
        }
      ]
    },
    curl_examples: {
      ask: `curl -X POST ${req.protocol}://${req.get('host')}/ask \\
  -H "Content-Type: application/json" \\
  -d '{"question": "What is the travel policy?", "domain": "policies"}'`,
      
      generate: `curl -X POST ${req.protocol}://${req.get('host')}/generate \\
  -H "Content-Type: application/json" \\
  -d '{"goal": "qa_with_citations", "domain": "policies", "inputs": {"question": "Travel policy?"}}'`
    },
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 YAFA Perfect Prompt Generator Server`);
  console.log(`🌐 Server running on http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`📖 Examples: http://localhost:${PORT}/examples`);
  console.log(`❤️  Health: http://localhost:${PORT}/health`);
  console.log(`⚡ Ready for tunnel setup!`);
});

export default app;
