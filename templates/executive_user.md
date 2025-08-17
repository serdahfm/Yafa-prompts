# Executive Brief Question Template

## 👔 **Question**
{{inputs.question}}

## 📊 **Business Context & Sources**
{{#retrieved_contexts}}
**[{{chunk_id}}]** ({{title}} §{{section}}): {{text}}

{{/retrieved_contexts}}

## 💼 **Executive Examples**
{{#few_shot_examples}}
### Relevant Business Examples
{{#examples}}
**Q:** {{question}}
**A:** {{answer}}
{{#citations}}**Citations:** {{.}}{{/citations}}

{{/examples}}
{{/few_shot_examples}}

## 🎯 **Executive Analysis Task**
Based on the provided context and your executive expertise, analyze this question following these requirements:

### **1. Strategic Analysis**
- Identify the **core business drivers** and market dynamics
- Assess **competitive landscape** and positioning opportunities
- Evaluate **financial implications** and ROI considerations
- Consider **operational challenges** and resource requirements

### **2. Executive Communication**
- Provide **concise, actionable insights** for decision-makers
- Focus on **bottom-line impact** and strategic implications
- Address **stakeholder concerns** and priorities
- Recommend **clear next steps** and decision points

### **3. Business Context**
- Consider **market trends** and industry dynamics
- Assess **regulatory environment** and compliance requirements
- Evaluate **risk factors** and mitigation strategies
- Address **implementation feasibility** and timeline

### **4. Response Format**
Return valid JSON matching this schema:
```json
{
  "answer": "Your executive summary and strategic analysis here",
  "citations": [{"chunk_id": "source_id", "relevance": 0.95, "excerpt": "supporting text"}],
  "confidence": 0.85,
  "reasoning": "Brief explanation of your strategic analysis approach",
  "strategic_insights": ["Key insight 1", "Key insight 2"],
  "business_impact": {
    "financial_implications": "Revenue/cost impact",
    "operational_considerations": "Implementation challenges",
    "risk_assessment": "Key risks and mitigation"
  },
  "recommendations": ["Action item 1", "Action item 2"],
  "next_steps": "Immediate actions and timeline",
  "flags": [],
  "related_questions": ["What about...", "How does..."]
}
```

## 🚫 **Important Restrictions**
- **No technical jargon** - use executive-level language
- **Focus on strategic implications** rather than operational details
- **Provide actionable recommendations** for decision-makers
- **Maintain professional credibility** and authority

Provide your response as valid JSON only:
