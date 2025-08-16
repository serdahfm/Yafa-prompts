export type LLMProvider = 'openai' | 'anthropic'

export interface LLMClient {
  provider: LLMProvider
  complete(prompt: string, options?: { model?: string; temperature?: number; maxTokens?: number }): Promise<string>
}

export interface LLMGenerationOptions {
  model?: string
  temperature?: number
  maxTokens?: number
}

// OpenAI Client Implementation
export class OpenAIClient implements LLMClient {
  provider: LLMProvider = 'openai'
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async complete(prompt: string, options: LLMGenerationOptions = {}): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model || 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2000,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json() as any
    return data.choices[0]?.message?.content || 'No response generated'
  }
}

// Anthropic Client Implementation  
export class AnthropicClient implements LLMClient {
  provider: LLMProvider = 'anthropic'
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async complete(prompt: string, options: LLMGenerationOptions = {}): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: options.model || 'claude-3-sonnet-20240229',
        max_tokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.7,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json() as any
    return data.content[0]?.text || 'No response generated'
  }
}

// Factory function to create LLM client
export function createLLMClient(provider: LLMProvider, apiKey: string): LLMClient {
  switch (provider) {
    case 'openai':
      return new OpenAIClient(apiKey)
    case 'anthropic':
      return new AnthropicClient(apiKey)
    default:
      throw new Error(`Unsupported LLM provider: ${provider}`)
  }
}

// Environment-based client factory
export function createLLMClientFromEnv(): LLMClient {
  const openaiKey = process.env.OPENAI_API_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY

  console.log('DEBUG - Environment check:')
  console.log('OPENAI_API_KEY:', openaiKey ? `${openaiKey.substring(0, 15)}...` : 'NOT SET')
  console.log('ANTHROPIC_API_KEY:', anthropicKey ? `${anthropicKey.substring(0, 15)}...` : 'NOT SET')

  if (openaiKey) {
    console.log('✅ Using OpenAI client')
    return new OpenAIClient(openaiKey)
  } else if (anthropicKey) {
    console.log('✅ Using Anthropic client')
    return new AnthropicClient(anthropicKey)
  } else {
    console.warn('❌ No LLM API keys found in environment, using null client')
    return NullLLM
  }
}

// Fallback for when no API keys are available
export const NullLLM: LLMClient = {
  provider: 'openai',
  async complete(prompt: string) {
    console.error('🚨 CRITICAL: LLM generation requested but no API keys configured!')
    console.error('📋 Setup Instructions:')
    console.error('   1. Get OpenAI API key: https://platform.openai.com/api-keys')
    console.error('   2. Set environment: export OPENAI_API_KEY=sk-your-key-here')
    console.error('   3. Or use Anthropic: export ANTHROPIC_API_KEY=sk-ant-your-key-here')
    console.error('   4. Restart the server')
    
    throw new Error('LLM_NOT_CONFIGURED: No OpenAI or Anthropic API key found. YAFA requires LLM access for intelligent prompt generation.')
  },
}



