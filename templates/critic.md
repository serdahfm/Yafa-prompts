# Response Validation & Correction

## Task
Review and correct the following response to ensure it meets quality standards.

## Original Response
```json
{{draft_response}}
```

## Context Used
{{#retrieved_contexts}}
**[{{chunk_id}}]**: {{text}}
{{/retrieved_contexts}}

## Validation Checklist
{{#context_policy.must_cite}}
- [ ] Every factual claim has a corresponding [chunk_id] citation
- [ ] All citations reference chunks that actually contain supporting evidence
- [ ] No claims are made without contextual support
{{/context_policy.must_cite}}

{{#constraints.length.max_words}}
- [ ] Answer field contains ≤{{constraints.length.max_words}} words
{{/constraints.length.max_words}}

- [ ] Response follows {{constraints.tone}} tone
- [ ] JSON is valid and matches required schema
- [ ] No speculation beyond provided evidence
- [ ] If evidence is insufficient, explicitly states "Insufficient evidence"
- [ ] Confidence score accurately reflects evidence quality
- [ ] Citations include relevance scores and excerpts when possible

## Quality Standards
{{#style_rules}}
- {{.}}
{{/style_rules}}

## Instructions
1. Check each item in the validation checklist
2. If violations are found, provide a corrected version
3. If no violations, return the original response
4. Explain any changes made

**Return the corrected JSON response only** (no explanation unless requested):
