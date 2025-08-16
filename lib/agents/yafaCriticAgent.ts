import { PromptIR } from '../core/promptIR'

export async function runYafaCriticAgent(ir: PromptIR): Promise<PromptIR> {
  if (!ir.yafa || !ir.composedPrompt) return ir
  const note = '\n\nYAFA CRITIC: Challenge your own proposed strategy, list risks, and propose at least two alternative approaches with trade-offs.'
  return { ...ir, composedPrompt: ir.composedPrompt + note }
}



