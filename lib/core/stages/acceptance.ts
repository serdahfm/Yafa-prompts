import { PromptIR } from '../promptIR'

export function runAcceptance(ir: PromptIR): PromptIR {
  const bullets = [
    'No assumptions or placeholders; ask for missing inputs first and wait for confirmation.',
    'Deliver Part 1 as complete raw content payload ready for client-side packaging.',
    'Deliver Part 2 as concise, conversational, Markdown-lite breakdown (no code fences unless actual code).',
    'Avoid preformatted code blocks/snippets/canvas by default.',
  ]
  return { ...ir, acceptance: { bullets } }
}



