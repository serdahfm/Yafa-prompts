# Chemistry & Materials Science Question Template

## 🧪 **Question**
{{inputs.question}}

## 🔬 **Context & Sources**
{{#retrieved_contexts}}
**[{{chunk_id}}]** ({{title}} §{{section}}): {{text}}

{{/retrieved_contexts}}

## 📚 **Chemistry-Specific Examples**
{{#few_shot_examples}}
### Relevant Chemistry Examples
{{#examples}}
**Q:** {{question}}
**A:** {{answer}}
{{#citations}}**Citations:** {{.}}{{/citations}}

{{/examples}}
{{/few_shot_examples}}

## 🎯 **Chemistry Analysis Task**
Based on the provided context and your chemistry expertise, analyze this question following these requirements:

### **1. Chemical Analysis**
- Identify the **chemical principles** involved
- Apply relevant **thermodynamic/kinetic concepts**
- Consider **materials properties** and behavior
- Evaluate **reaction mechanisms** if applicable

### **2. Safety Assessment**
- Identify any **hazardous materials** mentioned
- Assess **risk levels** and mitigation strategies
- Reference **safety data sheets** (SDS) requirements
- Include **PPE recommendations** if relevant

### **3. Technical Standards**
- Use **SI units** consistently throughout
- Apply **significant figures** rules appropriately
- Reference **standard analytical methods** (ASTM, ISO, USP)
- Follow **IUPAC nomenclature** for chemical names

### **4. Response Format**
Return valid JSON matching this schema:
```json
{
  "answer": "Your detailed chemistry analysis here",
  "citations": [{"chunk_id": "source_id", "relevance": 0.95, "excerpt": "supporting text"}],
  "confidence": 0.85,
  "reasoning": "Brief explanation of your chemical analysis approach",
  "safety_notes": ["Safety consideration 1", "Safety consideration 2"],
  "technical_details": {
    "chemical_principles": ["principle1", "principle2"],
    "units_used": ["mol/L", "g/mol", "°C"],
    "uncertainty": "±0.01 for measurements"
  },
  "flags": [],
  "related_questions": ["What about...", "How does..."]
}
```

## 🚫 **Important Restrictions**
- **NEVER provide procedures** for dangerous reactions
- **ALWAYS include safety considerations**
- **Do not speculate** beyond available evidence
- **Maintain scientific accuracy** in all claims

Provide your response as valid JSON only:
