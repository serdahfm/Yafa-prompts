import { PromptIR } from '../promptIR'

const forbiddenPatterns = [/```/g, /<pre><code>/gi]

export function runPolicyGate(ir: PromptIR): PromptIR {
  let text = ir.composedPrompt || ''
  for (const pat of forbiddenPatterns) {
    if (pat.test(text)) {
      // remove fenced/pre blocks defensively
      text = text.replace(pat, '')
    }
  }
  // enforce plain text default
  return { ...ir, composedPrompt: text }
}



