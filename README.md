# YAFA Perfect Prompt Generator

> **Systematic compilation from user intent to validated outputs**  
> **🌐 LIVE API**: https://4ea3c03b0541.ngrok-free.app

Transform the art of prompt engineering into a systematic compilation process with typed task representations, deterministic scaffolding, and continuous learning loops.

## 🚀 **LIVE DEPLOYMENT - Ready to Use**

**Public API**: `https://4ea3c03b0541.ngrok-free.app`  
**Status**: ✅ Active and responding  
**Performance**: ~1000ms avg, $0.005 per request

## 🎯 Core Philosophy

**Treat prompt creation like compilation**: user intent → typed TaskFrame → Prompt Plan → executable prompts with guardrails → measured outcomes → learning loop.

The "art" gets systematized without losing finesse through:
- **Single source of truth**: Canonical, typed representation of tasks
- **Deterministic scaffolding**: Rule-based pattern selection (few-shot, RAG, critique)
- **Separation of concerns**: understand → structure → compile → execute → validate → learn
- **Full instrumentation**: Cost, latency, faithfulness, formatting, satisfaction
- **Tight feedback**: Every execution updates system "taste" via evals and ratings

## 🚀 Quick Start

```bash
# Install
npm install yafa-perfect-prompt-generator

# Initialize new project
npx promptgen init my-project
cd my-project

# Quick ask
npx promptgen ask "What is the travel policy for business trips?" --domain policies

# Run with TaskFrame
npx promptgen run frames/qa_policy.json

# Evaluate quality
npx promptgen eval evals/golden.qa.jsonl

# Smoke test
npx promptgen smoke evals/golden.qa.jsonl --examples 5
```

## 🏗️ Architecture

### 1. TaskFrame: Single Source of Truth

Every prompt starts with a typed, model-agnostic task representation:

```typescript
const taskFrame = TaskFrameBuilder
  .create('qa_with_citations', 'policies')
  .setInputs({ 
    question: "What is the travel upgrade entitlement?",
    sources: ["policy_2024_07.pdf"] 
  })
  .setConstraints({
    style: 'executive-brief',
    length: { max_words: 120 },
    format: 'json',
    tone: 'neutral',
    safety: { no_pii: true, no_speculation: true }
  })
  .setContextPolicy({
    retrieval: { k: 6, rerank: true, recency_days: 365 },
    must_cite: true,
    fallback_on_low_confidence: 'insufficient_evidence'
  })
  .build();
```

### 2. Prompt Compiler: Rules, Not Vibes

Maps TaskFrames to executable prompts using pattern selection:

```typescript
// Automatic pattern selection based on task requirements
const patterns = compiler.selectPatterns(taskFrame);
// → ['role', 'rag', 'few_shot', 'constrained_json', 'reflexion']

const plan = compiler.compile(taskFrame);
const prompts = compiler.renderPrompts(plan, taskFrame, contexts);
```

**Available Patterns:**
- **Role**: Persona and audience setting
- **Few-Shot**: Domain-matched exemplars  
- **RAG**: Context weaving with retrieval policies
- **Reasoning**: Chain-of-thought, self-consistency
- **Reflexion**: Self-critique with rubrics
- **Constraint**: Schema enforcement, length caps
- **Safety**: Refusal scaffolds, bias nudges

### 3. Execution Pipeline: Skinny but Potent

```typescript
// Minimal stages with maximum impact
const result = await pipeline.execute(taskFrame);
// Ingest → Retrieve → Generate → Reflexion → Validate → Package
```

**Pipeline Stages:**
1. **Ingest & Normalize** - Language detect, redaction
2. **Retrieve** - ANN search + rerank, fit to token budget  
3. **Generate** - Main prompt with constraints
4. **Reflexion** - Critique & repair pass with rubric
5. **Validate** - Schema, citation coverage, safety scan
6. **Package** - Final output + meta (cost, latency, trace IDs)

### 4. Style Profiles: The Taste Layer

Reusable tone/voice kits with opinionated house style:

```yaml
# styles/executive_brief.yml
name: executive_brief
rules:
  - "Lead with the answer in 1-2 sentences"
  - "Use crisp, neutral tone; no hedging"  
  - "If evidence is thin, say 'Insufficient evidence'"
tone_markers:
  positive: ["confirmed", "established", "clear policy states"]
  negative: ["insufficient evidence", "policy unclear"]
avoid:
  - "It seems that..."
  - "Based on my understanding..."
```

### 5. Evaluation Engine: Quality Assurance

Golden-set testing with regression detection:

```typescript
// Run evaluation suite
const summary = await evaluator.evaluate('evals/golden.qa.jsonl');

// A/B test configurations  
const comparison = await evaluator.compareConfigurations(
  'evals/golden.qa.jsonl', 'baseline', 'optimized'
);
```

### 6. Telemetry: Full Observability

Track everything for continuous improvement:

```typescript
// Automatic instrumentation
trace: {
  tokens: { prompt: 1020, completion: 130 },
  latency_ms: 1180,
  cost_usd: 0.0041,
  citation_coverage: 0.95,
  violations: { schema: 0, citations_missing: 0 }
}

// Dashboard and alerting
const dashboard = generator.getDashboard({ 
  start: '2024-01-01', 
  end: '2024-01-31' 
});
```

## 📊 Usage Patterns

### Basic Q&A with Citations

```typescript
const result = await generator.ask(
  "What's our policy on first-class flights to Europe?",
  'policies',
  { 
    style: 'executive_brief',
    must_cite: true,
    max_words: 120 
  }
);
```

### Technical Analysis

```typescript
const taskFrame = TaskFrameBuilder
  .create('analyze', 'technical_docs')
  .setInputs({ 
    question: "Analyze the performance implications of this API design",
    sources: ["api_spec_v2.json"] 
  })
  .setConstraints({
    style: 'technical',
    format: 'json',
    length: { max_words: 300 }
  })
  .build();

const result = await generator.generate(taskFrame);
```

### Business Plan Generation

```typescript
const planFrame = TaskFrameBuilder
  .create('generate_plan', 'business_plans')
  .setInputs({ 
    text: "Create a go-to-market strategy for our new AI tool",
    data: { budget: 500000, timeline: "6 months" }
  })
  .setConstraints({
    style: 'executive_brief',
    format: 'markdown',
    length: { max_words: 1000 }
  })
  .build();
```

## 🔧 Configuration

### Style Profiles

Create custom styles in `styles/`:

```yaml
name: scientific
description: "Precise, research-oriented style"
rules:
  - "Include methodology and confidence intervals"
  - "Cite primary sources with DOIs when available"
  - "Use passive voice for observations"
structure:
  answer_first: false
  citation_style: "[Author, Year]"
  include_examples: true
```

### Exemplars

Train the system with domain-specific examples in `exemplars/`:

```jsonl
{"question": "What's the API rate limit?", "answer": "1000 requests/hour per API key. Burst limit: 10 req/sec. [api_docs#rate_limits]", "citations": ["api_docs#rate_limits"], "style": "technical"}
```

### Output Schemas  

Define strict output contracts in `schemas/`:

```json
{
  "type": "object",
  "required": ["answer", "citations", "confidence"],
  "properties": {
    "answer": { "type": "string", "maxLength": 1000 },
    "citations": { 
      "type": "array",
      "items": { 
        "type": "object",
        "required": ["chunk_id", "relevance"]
      }
    },
    "confidence": { "type": "number", "minimum": 0, "maximum": 1 }
  }
}
```

## 📈 Quality Assurance

### Golden Set Evaluation

```bash
# Create evaluation set
cat > evals/policies.jsonl << EOF
{"id": "eval_001", "question": "Can managers book business class?", "must_contain": ["approval required"], "must_cite": true, "expected_confidence": 0.9}
{"id": "eval_002", "question": "What's the home office budget?", "must_contain": ["$1,500"], "must_cite": true, "expected_confidence": 0.95}
EOF

# Run evaluation
npx promptgen eval evals/policies.jsonl --version v1.2
```

### Continuous Integration

```yaml
# .github/workflows/quality.yml
- name: Smoke Test
  run: npm run smoke
  
- name: Full Evaluation  
  run: npm run eval
  
- name: Check Regression
  run: |
    if npm run eval | grep "regression_detected.*true"; then
      echo "Regression detected!"
      exit 1
    fi
```

### Drift Detection

Automatic monitoring of key metrics:

```typescript
// Alerts when pass rate drops >5% or cost increases >20%
const alerts = telemetry.checkAlerts({
  pass_rate: { threshold: 0.05, severity: 'high' },
  avg_cost: { threshold: 0.20, severity: 'medium' }
});
```

## 🎛️ CLI Reference

```bash
# Core commands
promptgen run <taskframe.json>           # Execute TaskFrame
promptgen ask <question> [options]       # Quick Q&A
promptgen create-frame <description>      # Generate TaskFrame from NL

# Quality assurance  
promptgen eval <golden-set.jsonl>        # Run evaluation
promptgen smoke <golden-set.jsonl>       # Quick smoke test
promptgen dashboard --hours 24           # Show telemetry

# Project management
promptgen init <project-name>            # Initialize new project
```

### Command Options

```bash
# Ask command
--domain <policies|technical_docs|business_plans|legal|general>
--style <executive_brief|technical|empathetic>  
--format <json|markdown|text>
--no-cite                    # Disable citations
--words <number>             # Max word count

# Run command  
--output <path>              # Output file
--telemetry                  # Enable telemetry (default: true)

# Eval command
--version <tag>              # Version tag for tracking
--report <path>              # Generate detailed report
```

## 🔍 Debugging & Observability

### Trace Analysis

Every execution generates comprehensive traces:

```json
{
  "trace_id": "tr_1704123456_abc123",
  "taskframe_id": "tf_001", 
  "metrics": {
    "tokens": { "prompt": 1020, "completion": 130 },
    "latency_ms": 1180,
    "cost_usd": 0.0041,
    "citation_coverage": 0.95
  },
  "violations": {
    "schema": 0,
    "citations_missing": 0, 
    "safety_flags": []
  }
}
```

### Performance Monitoring

```bash
# Real-time dashboard
npx promptgen dashboard

# Custom queries
npx promptgen query metrics \
  --metric "execution.latency_ms" \
  --aggregation p95 \
  --group-by model,domain
```

## 🎯 Production Deployment

### Environment Setup

```bash
# Required environment variables
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."

# Optional configuration
export YAFA_TELEMETRY_ENDPOINT="https://your-analytics.com/api"
export YAFA_CACHE_REDIS_URL="redis://localhost:6379"
```

### Docker Deployment

```dockerfile
FROM node:18-alpine
COPY . /app
WORKDIR /app
RUN npm ci --production
EXPOSE 3000
CMD ["node", "server.js"]
```

### Scaling Considerations

- **Horizontal**: Each instance handles independent requests
- **Caching**: Redis for compiled prompt plans and retrieval results  
- **Monitoring**: Ship traces to observability platform (DataDog, New Relic)
- **Cost Control**: Set per-user/per-tenant token budgets

## 🤝 Contributing

1. **Fork** the repository
2. **Create** feature branch: `git checkout -b feature/amazing-improvement`
3. **Add** golden set examples for new features
4. **Run** full evaluation: `npm run eval`  
5. **Ensure** no regressions: Pass rate ≥ 90%
6. **Submit** pull request with evaluation results

### Development Setup

```bash
git clone https://github.com/serdahfm/Yafa-prompts.git
cd Yafa-prompts
npm install
npm run build
npm run smoke  # Verify installation
```

## 📜 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Built on the YAFA-MS (Yet Another Framework Agnostic Mission Solver) architecture, combining systematic prompt engineering with production-ready observability and quality assurance.

---

**Ready to systematize your prompt engineering?** Start with `npx promptgen init my-project` and experience the power of compilation over crafting.
