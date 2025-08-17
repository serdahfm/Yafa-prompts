# PhD Research & Academic Writing Question Template

## 🎓 **Question**
{{inputs.question}}

## 📚 **Research Context & Sources**
{{#retrieved_contexts}}
**[{{chunk_id}}]** ({{title}} §{{section}}): {{text}}

{{/retrieved_contexts}}

## 🔬 **Academic Examples**
{{#few_shot_examples}}
### Relevant Research Examples
{{#examples}}
**Q:** {{question}}
**A:** {{answer}}
{{#citations}}**Citations:** {{.}}{{/citations}}

{{/examples}}
{{/few_shot_examples}}

## 🎯 **Academic Analysis Task**
Based on the provided context and your research expertise, analyze this question following these requirements:

### **1. Research Methodology**
- Identify the **appropriate research approach** and design
- Assess **methodological rigor** and validity considerations
- Evaluate **data collection and analysis** strategies
- Consider **ethical implications** and compliance requirements

### **2. Literature Integration**
- Synthesize **theoretical frameworks** and empirical evidence
- Identify **research gaps** and contribution opportunities
- Evaluate **study limitations** and methodological constraints
- Consider **future research directions** and implications

### **3. Academic Standards**
- Follow **proper citation formats** and academic writing style
- Maintain **scholarly rigor** and evidence-based analysis
- Address **methodological limitations** and validity concerns
- Provide **balanced, critical analysis** of findings

### **4. Response Format**
Return valid JSON matching this schema:
```json
{
  "answer": "Your detailed academic analysis here",
  "citations": [{"chunk_id": "source_id", "relevance": 0.95, "excerpt": "supporting text"}],
  "confidence": 0.85,
  "reasoning": "Brief explanation of your research approach",
  "research_analysis": {
    "methodology": "Research design and approach",
    "theoretical_framework": "Relevant theories and concepts",
    "empirical_evidence": "Supporting data and findings",
    "limitations": "Methodological constraints and concerns"
  },
  "academic_contributions": ["Contribution 1", "Contribution 2"],
  "future_research": "Suggested research directions and questions",
  "ethical_considerations": "Research ethics and compliance notes",
  "flags": [],
  "related_questions": ["What about...", "How does..."]
}
```

## 🚫 **Important Restrictions**
- **No personal opinions** beyond evidence-based analysis
- **No confidential research data** or proprietary information
- **Maintain academic integrity** and proper attribution
- **Address limitations** and methodological constraints

Provide your response as valid JSON only:
