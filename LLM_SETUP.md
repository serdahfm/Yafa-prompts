# YAFA MS - LLM Configuration Guide

YAFA MS requires LLM access for intelligent prompt generation and auto-detection features. **All prompts are now LLM-generated** for optimal quality and professional context adaptation.

## 🚨 Critical Requirement

**YAFA will not function properly without LLM configuration.** The system now throws clear errors instead of silently falling back to basic templates.

## 🔑 Quick Setup (Development)

### Option 1: OpenAI (Recommended)

1. **Get API Key**: Visit https://platform.openai.com/api-keys
2. **Create New Key**: Click "Create new secret key"
3. **Copy Key**: Starts with `sk-proj-` or `sk-`
4. **Set Environment Variable**:
   ```bash
   export OPENAI_API_KEY=sk-your-openai-api-key-here
   ```

### Option 2: Anthropic (Alternative)

1. **Get API Key**: Visit https://console.anthropic.com/settings/keys
2. **Create New Key**: Click "Create Key"
3. **Copy Key**: Starts with `sk-ant-`
4. **Set Environment Variable**:
   ```bash
   export ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key-here
   ```

## 🚀 Running with LLM

```bash
# Set your API key
export OPENAI_API_KEY=sk-your-key-here

# Start the server
cd apps/server && npm run dev

# Or use the root script
npm run dev:server
```

## 🔧 Production Setup (AWS Secrets Manager)

For production deployment, use the provided script:

```bash
# Configure AWS profile first
./scripts/setup_aws_profile.zsh

# Store LLM secret in AWS
./scripts/store_llm_secret.zsh
```

## ✅ Verification

### Check Health Endpoint
```bash
curl http://localhost:8787/api/health
```

Should show:
```json
{
  "status": "healthy",
  "services": {
    "llm": "configured"
  }
}
```

### Test Generation
```bash
curl -X POST http://localhost:8787/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Help me set up a CI/CD pipeline",
    "mode": "General Purpose",
    "yafa": true,
    "autoDetectMode": true
  }'
```

## 🚨 Error Messages

### LLM Not Configured
```
LLM_CONFIGURATION_REQUIRED: YAFA requires LLM access for intelligent prompt generation.
```

**Solution**: Follow the setup steps above.

### LLM Temporarily Unavailable
```
⚠️ LLM temporarily unavailable, using enhanced template fallback
```

**Causes**: Rate limits, network issues, API downtime
**Solution**: Wait and retry, or check API status pages.

## 💰 Cost Considerations

- **Auto-detection**: Adds ~1 additional API call per request when YAFA mode is enabled
- **Prompt generation**: 1 API call per unique prompt (cached for 15 minutes)
- **Typical cost**: $0.01-0.05 per request depending on input complexity

## 🎯 Features Requiring LLM

1. **Auto-detection**: Professional mode detection from user input
2. **Intelligent prompts**: Context-aware prompt generation
3. **YAFA mode**: Enhanced technical analysis and critical thinking
4. **Quality scoring**: Prompt quality assessment

## 🔧 Troubleshooting

### Server Won't Start
- Check if port 8787 is available: `lsof -i :8787`
- Kill existing process: `pkill -f "node.*8787"`

### API Key Issues
- Verify key format (OpenAI: `sk-proj-*` or `sk-*`, Anthropic: `sk-ant-*`)
- Check API quota/billing in provider dashboard
- Test key with direct API call

### Environment Variables Not Working
```bash
# Check if variable is set
echo $OPENAI_API_KEY

# Set in current session
export OPENAI_API_KEY=your-key

# Make permanent (add to ~/.zshrc or ~/.bashrc)
echo 'export OPENAI_API_KEY=your-key' >> ~/.zshrc
source ~/.zshrc
```

## 🎯 Benefits of LLM-Generated Prompts

1. **Dynamic Adaptation**: Prompts adapt to professional context automatically
2. **Higher Quality**: LLM understands nuances better than static templates
3. **Consistency**: Professional-grade outputs across all modes
4. **Intelligence**: Auto-detection provides seamless user experience

---

**Need Help?** The system now provides clear error messages and setup instructions when LLM is not configured.
