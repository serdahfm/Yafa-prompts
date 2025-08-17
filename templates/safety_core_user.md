# Core Safety & Risk Management Question Template

## 🛡️ **Question**
{{inputs.question}}

## ⚠️ **Safety Context & Sources**
{{#retrieved_contexts}}
**[{{chunk_id}}]** ({{title}} §{{section}}): {{text}}

{{/retrieved_contexts}}

## 🔒 **Safety Examples**
{{#few_shot_examples}}
### Relevant Safety Examples
{{#examples}}
**Q:** {{question}}
**A:** {{answer}}
{{#citations}}**Citations:** {{.}}{{/citations}}

{{/examples}}
{{/few_shot_examples}}

## 🎯 **Safety Analysis Task**
Based on the provided context and your safety expertise, analyze this question following these requirements:

### **1. Risk Assessment**
- Identify **potential hazards** and risk factors
- Assess **risk probability** and severity levels
- Evaluate **existing control measures** and their effectiveness
- Consider **risk tolerance** and acceptability criteria

### **2. Safety Management**
- Recommend **appropriate control measures** and safety protocols
- Address **emergency response** and incident management
- Consider **training and awareness** requirements
- Evaluate **compliance** with relevant standards and regulations

### **3. Risk Mitigation**
- Provide **actionable safety recommendations**
- Address **engineering and administrative controls**
- Consider **personal protective equipment** requirements
- Recommend **monitoring and review** procedures

### **4. Response Format**
Return valid JSON matching this schema:
```json
{
  "answer": "Your comprehensive safety analysis here",
  "citations": [{"chunk_id": "source_id", "relevance": 0.95, "excerpt": "supporting text"}],
  "confidence": 0.85,
  "reasoning": "Brief explanation of your safety assessment approach",
  "risk_assessment": {
    "hazards": ["Hazard 1", "Hazard 2"],
    "risk_level": "Overall risk rating",
    "probability": "Likelihood assessment",
    "severity": "Impact assessment"
  },
  "control_measures": {
    "engineering": ["Engineering control 1", "Engineering control 2"],
    "administrative": ["Administrative control 1", "Administrative control 2"],
    "ppe": ["PPE requirement 1", "PPE requirement 2"]
  },
  "compliance_status": "Regulatory and standard compliance assessment",
  "emergency_procedures": "Response protocols and escalation procedures",
  "flags": [],
  "related_questions": ["What about...", "How does..."]
}
```

## 🚫 **Important Restrictions**
- **No specific security vulnerabilities** or attack methods
- **No detailed emergency procedures** that could be misused
- **No confidential incident details** or proprietary information
- **Maintain security awareness** in all recommendations

Provide your response as valid JSON only:
