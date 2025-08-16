import { PromptIR } from '../promptIR'

export function runGapAnalysis(ir: PromptIR): PromptIR {
  const clarifying: string[] = []
  const updatedSlots = ir.requirementSlots.map((slot) => {
    if (slot.required && !slot.value) {
      clarifying.push(`Please provide ${slot.label}.`)
    }
    return slot
  })
  return { ...ir, requirementSlots: updatedSlots, clarifyingQuestions: clarifying }
}



