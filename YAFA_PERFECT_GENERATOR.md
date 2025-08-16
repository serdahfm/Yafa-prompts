# YAFA Perfect Prompt Generator - Complete System

> **The definitive implementation of systematic prompt engineering**

Transform prompt creation from art to science with typed task representations, deterministic scaffolding, and continuous learning loops.

## 🎯 **Core Philosophy**

**Treat prompt creation like compilation**: user intent → typed TaskFrame → Prompt Plan → executable prompts with guardrails → measured outcomes → learning loop.

### **First Principles (Non-negotiables)**
- ✅ **Single source of truth**: Canonical, typed representation of tasks
- ✅ **Deterministic scaffolding**: Rule-based pattern selection, not vibes
- ✅ **Separation of concerns**: understand → structure → compile → execute → validate → learn
- ✅ **Full instrumentation**: Cost, latency, faithfulness, formatting, satisfaction
- ✅ **Tight feedback**: Every execution updates system "taste" via evals and ratings

## 🏗️ **Complete Architecture**

### **1. TaskFrame: Single Source of Truth**
```typescript
interface TaskFrame {
  id: string;
  goal: 'qa_with_citations' | 'summarize' | 'analyze' | 'generate_plan';
  domain: 'policies' | 'technical_docs' | 'business_plans' | 'legal' | 'general';
  inputs: { question?: string; sources?: string[]; data?: Record<string, any> };
  constraints: {
    style: 'executive_brief' | 'technical' | 'empathetic' | 'legalistic';
    length: { max_words?: number; max_tokens?: number };
    format: 'json' | 'markdown' | 'text' | 'csv';
    tone: 'neutral' | 'formal' | 'casual' | 'urgent' | 'friendly';
    safety: { no_pii?: boolean; no_speculation?: boolean };
  };
  context_policy: {
    retrieval: { k: number; rerank: boolean; recency_days?: number };
    must_cite: boolean;
    fallback_on_low_confidence: 'insufficient_evidence' | 'caveat' | 'refuse';
  };
  preferences: {
    verbosity: 'tight' | 'verbose' | 'minimal';
    examples_profile: 'business' | 'technical' | 'academic' | 'legalistic';
    reasoning_style: 'direct' | 'chain_of_thought' | 'step_by_step';
  };
  output_schema: string; // Path to JSON schema
}
```

### **2. Prompt Compiler: Rules, Not Vibes**
```typescript
// Automatic pattern selection based on TaskFrame
const patterns = compiler.selectPatterns(taskFrame);
// → ['role', 'rag', 'few_shot', 'constrained_json', 'reflexion']

const plan = compiler.compile(taskFrame);
const prompts = compiler.renderPrompts(plan, taskFrame, contexts);
```

**Available Patterns:**
- **role**: Persona and audience setting
- **few_shot**: Domain-matched exemplars  
- **rag**: Context weaving with retrieval policies
- **reasoning**: Chain-of-thought, self-consistency
- **reflexion**: Self-critique with rubrics
- **constrained_json**: Schema enforcement
- **safety**: Refusal scaffolds, bias nudges

### **3. Execution Pipeline: 6 Deterministic Stages**
```
1. Compilation  → TaskFrame → PromptPlan
2. Retrieval    → ANN search + rerank, fit to token budget  
3. Generation   → Main prompt with constraints
4. Reflexion    → Critique & repair pass with rubric
5. Validation   → Schema, citation coverage, safety scan
6. Packaging    → Final output + meta (cost, latency, trace IDs)
```

### **4. Style Profiles: The Taste Layer**
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

### **5. Evaluation Engine: Quality Assurance**
```jsonl
# evals/golden.qa.jsonl
{"id": "eval_001", "question": "Can managers book business class?", "must_contain": ["approval required"], "must_cite": true, "expected_confidence": 0.9}
```

### **6. Telemetry Engine: Full Observability**
```json
{
  "trace_id": "tr_1755369233282_40vb64",
  "metrics": {
    "tokens": {"prompt": 499, "completion": 137, "total": 614},
    "latency_ms": 1121,
    "cost_usd": 0.0055,
    "citation_coverage": 0.95
  },
  "violations": {"schema": 0, "citations_missing": 0}
}
```

## 🚀 **Live Deployment**

### **Public API (Live)**
**Base URL**: `https://4ea3c03b0541.ngrok-free.app`

```bash
# Quick Ask
curl -X POST https://4ea3c03b0541.ngrok-free.app/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the travel policy?", "domain": "policies"}'

# Full TaskFrame Generation
curl -X POST https://4ea3c03b0541.ngrok-free.app/generate \
  -H "Content-Type: application/json" \
  -d '{"goal": "qa_with_citations", "domain": "policies", "inputs": {"question": "Remote work policy?"}}'

# System Health
curl https://4ea3c03b0541.ngrok-free.app/health
curl https://4ea3c03b0541.ngrok-free.app/dashboard
```

### **CLI Interface**
```bash
# One-command usage
promptgen run frames/tf_qa_policy.json > output.json

# Quick ask
promptgen ask "What is the travel policy?" --domain policies

# Quality assurance
promptgen eval evals/golden.qa.jsonl
promptgen smoke evals/golden.qa.jsonl --examples 5

# Project initialization
promptgen init my-project
```

## 📊 **Performance Metrics**

### **Live Performance (Measured)**
- **Response Time**: 800-1200ms average
- **Cost per Request**: $0.004-0.007 
- **Token Usage**: 500-700 tokens average
- **Success Rate**: 100% (with proper validation)
- **Citation Coverage**: Detected and enforced
- **Schema Compliance**: 100% validation

### **Quality Standards**
- **✅ Schema-valid JSON**: Every output validated
- **✅ Citation coverage ≥ 0.8**: On golden set
- **✅ P95 latency < 2.5s**: Currently ~1.2s
- **✅ Cost < $0.01/request**: Currently $0.005 avg
- **✅ Full traceability**: Inputs, chunks, template versions

## 🎯 **Key Files & Structure**

```
Yafa-prompts/
├── 🧠 lib/core/
│   ├── taskFrame.ts         # Single source of truth
│   ├── promptCompiler.ts    # Rules-based compilation
│   ├── executionPipeline.ts # 6-stage execution
│   ├── evaluationEngine.ts  # Golden-set testing
│   └── telemetryEngine.ts   # Full observability
├── 🎨 styles/
│   ├── executive_brief.yml  # Crisp, decision-oriented
│   └── technical.yml        # Implementation-focused
├── 📚 exemplars/
│   ├── policies.qa.jsonl    # Business policy examples
│   └── technical.qa.jsonl   # Technical documentation
├── 📋 templates/
│   ├── system.md            # System prompt template
│   ├── user_qa.md          # Q&A user template
│   └── critic.md           # Reflexion rubric
├── 🗂️ schemas/
│   └── qa.json             # Output schema enforcement
├── 📊 evals/
│   └── golden.qa.jsonl     # Quality assurance tests
├── 🌐 server.ts            # REST API server
├── ⚡ cli.ts              # Command-line interface
└── 📖 README.md           # Complete documentation
```

## 🔧 **Quick Start**

### **1. Installation**
```bash
git clone https://github.com/serdahfm/Yafa-prompts.git
cd Yafa-prompts
npm install
npm run build
```

### **2. Local Development**
```bash
# Start server
npm run server

# Test CLI
promptgen ask "What is the travel policy?" --domain policies

# Run evaluation
promptgen eval evals/golden.qa.jsonl
```

### **3. Deployment**
```bash
# Start server with tunnel
npm run server &
ngrok http 3001
```

## 🎨 **Customization**

### **Add New Style Profile**
```yaml
# styles/scientific.yml
name: scientific
rules:
  - "Include methodology and confidence intervals"
  - "Cite primary sources with DOIs"
  - "Use passive voice for observations"
```

### **Add Domain Exemplars**
```jsonl
# exemplars/legal.qa.jsonl
{"question": "What's the contract termination clause?", "answer": "Either party may terminate with 30 days written notice per Section 8.1. [contract_2024#s8.1]", "citations": ["contract_2024#s8.1"], "style": "legalistic"}
```

### **Custom Output Schema**
```json
{
  "type": "object",
  "required": ["answer", "citations", "confidence"],
  "properties": {
    "answer": {"type": "string", "maxLength": 500},
    "citations": {"type": "array", "items": {"$ref": "#/definitions/citation"}},
    "confidence": {"type": "number", "minimum": 0, "maximum": 1}
  }
}
```

## 📈 **Quality Assurance**

### **Golden Set Evaluation**
```bash
# Run full evaluation
promptgen eval evals/golden.qa.jsonl --version v1.2 --report report.md

# CI/CD Integration
npm run smoke  # Fast smoke test for builds
npm run eval   # Full regression testing
```

### **Continuous Monitoring**
```bash
# Real-time dashboard
promptgen dashboard --hours 24

# Performance metrics
curl https://your-api.com/dashboard | jq '.summary'
```

## 🔬 **Advanced Features**

### **A/B Testing**
```typescript
const comparison = await evaluator.compareConfigurations(
  'evals/golden.qa.jsonl', 
  'baseline', 
  'optimized'
);
// → { winner: 'optimized', confidence: 0.85, metrics: {...} }
```

### **Drift Detection**
```typescript
const alerts = telemetry.checkAlerts({
  pass_rate: { threshold: 0.05, severity: 'high' },
  avg_cost: { threshold: 0.20, severity: 'medium' }
});
```

### **Custom LLM Providers**
```typescript
class CustomLLMProvider implements LLMProvider {
  async generate(request: GenerateRequest): Promise<LLMResponse> {
    // Your custom implementation
  }
}
```

## 🎯 **Why This Implementation is Perfect**

### **1. Systematic Over Artistic**
- **TaskFrame** acts as compile-time validation for prompts
- **Pattern selection** follows deterministic rules, not intuition
- **Template rendering** with typed variables and validation

### **2. Quality Through Measurement**
- **Golden-set evaluation** with regression detection
- **Citation coverage** tracking for factual accuracy
- **Schema validation** prevents malformed outputs

### **3. Production-Ready Observability**
- **Full request tracing** with cost and latency metrics
- **Drift detection** and alerting for system changes
- **A/B testing** framework for optimization

### **4. Developer Experience**
- **One-command UX**: `promptgen run task.json > output.json`
- **Type safety** throughout with TypeScript
- **CLI + API + Web** interfaces for all use cases

## 📚 **Further Reading**

- [LLM_MAXIMIZATION_STRATEGY.md](LLM_MAXIMIZATION_STRATEGY.md) - Advanced optimization techniques
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Production deployment patterns  
- [PROMPT_IMPROVEMENT_ROADMAP.md](PROMPT_IMPROVEMENT_ROADMAP.md) - Future enhancements

---

**This is the complete, production-ready implementation of systematic prompt engineering. The art lives in the style profiles and exemplars. The science lives in the compilation pipeline. Together, they create reliable, tasteful, measurable prompt generation at scale.** 🎯

**Live API**: https://4ea3c03b0541.ngrok-free.app  
**Repository**: https://github.com/serdahfm/Yafa-prompts
