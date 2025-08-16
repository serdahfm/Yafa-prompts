import { PromptIR } from '../promptIR'

export function runValidation(ir: PromptIR): PromptIR {
  // Lightweight deterministic checks; agentic checks run separately
  if (!ir.composedPrompt || ir.composedPrompt.length < 50) {
    throw new Error('Composed prompt too short or missing')
  }
  return ir
}



