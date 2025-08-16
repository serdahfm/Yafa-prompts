import { PromptIR } from './promptIR'
import { runIntent } from './stages/intent'
import { runGapAnalysis } from './stages/gap'
import { runAcceptance } from './stages/acceptance'
import { runTemplateCompose } from './stages/template'
import { runValidation } from './stages/validation'
import { runPolicyGate } from './stages/policyGate'
import { runValidationAgent } from '../agents/validationAgent'
import { runYafaCriticAgent } from '../agents/yafaCriticAgent'

export type PipelineResult = {
  prompt: string
  ir: PromptIR
}

export async function runPipeline(ir: PromptIR): Promise<PipelineResult> {
  let state = ir
  state = runIntent(state)
  state = runGapAnalysis(state)
  state = runAcceptance(state)
  state = await runTemplateCompose(state) // Now async for LLM integration

  // In-line critic: Validation Agent (LLM-optional; deterministic checks now)
  state = await runValidationAgent(state)

  // YAFA Critic Agent if enabled
  state = await runYafaCriticAgent(state)

  state = runValidation(state)
  state = runPolicyGate(state)

  if (!state.composedPrompt) throw new Error('Pipeline failed to compose prompt')
  return { prompt: state.composedPrompt, ir: state }
}



