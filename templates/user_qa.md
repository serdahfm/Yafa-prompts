# QA Task Template

## Question
{{inputs.question}}

## Context
{{#retrieved_contexts}}
**[{{chunk_id}}]** ({{title}} §{{section}}): {{text}}

{{/retrieved_contexts}}

{{#few_shot_examples}}
## Examples
{{#examples}}
**Q:** {{question}}
**A:** {{answer}}
{{#citations}}**Citations:** {{.}}{{/citations}}

{{/examples}}
{{/few_shot_examples}}

## Task
Based on the provided context, answer the question following these requirements:

1. **Answer Format**: Return valid JSON matching the schema
2. **Citations**: {{#context_policy.must_cite}}Reference specific chunks using [chunk_id] format{{/context_policy.must_cite}}{{^context_policy.must_cite}}Citations are optional{{/context_policy.must_cite}}
3. **Evidence Standard**: {{context_policy.fallback_on_low_confidence}}
4. **Length Limit**: {{#constraints.length.max_words}}Maximum {{constraints.length.max_words}} words in the answer field{{/constraints.length.max_words}}

## Response Schema
```json
{
  "answer": "Your main response here",
  "citations": [{"chunk_id": "source_id", "relevance": 0.95, "excerpt": "supporting text"}],
  "confidence": 0.85,
  "reasoning": "Brief explanation of your reasoning process",
  "flags": ["insufficient_evidence"],
  "related_questions": ["What about...", "How does..."]
}
```

Provide your response as valid JSON only:
