import { PromptIR } from '../core/promptIR'

// Placeholder deterministic validator that simulates an agentic check.
export async function runValidationAgent(ir: PromptIR): Promise<PromptIR> {
  if (!ir.composedPrompt) return ir
  let text = ir.composedPrompt
  // Simple heuristics for assumptions
  const assumptionTokens = [/\bTBD\b/i, /\bplaceholder\b/i, /\bassume\b/i]
  for (const tok of assumptionTokens) {
    if (tok.test(text)) {
      text += '\n\nPOLICY REMINDER: Do not use assumptions or placeholders; ask clarifying questions first.'
      break
    }
  }
  return { ...ir, composedPrompt: text }
}



