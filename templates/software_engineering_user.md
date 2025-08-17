# Software Engineering & Architecture Question Template

## 💻 **Question**
{{inputs.question}}

## 🔧 **Technical Context & Sources**
{{#retrieved_contexts}}
**[{{chunk_id}}]** ({{title}} §{{section}}): {{text}}

{{/retrieved_contexts}}

## 🚀 **Technical Examples**
{{#few_shot_examples}}
### Relevant Software Engineering Examples
{{#examples}}
**Q:** {{question}}
**A:** {{answer}}
{{#citations}}**Citations:** {{.}}{{/citations}}

{{/examples}}
{{/few_shot_examples}}

## 🎯 **Technical Analysis Task**
Based on the provided context and your software engineering expertise, analyze this question following these requirements:

### **1. Technical Architecture**
- Identify the **system architecture** and design patterns
- Assess **scalability and performance** considerations
- Evaluate **security implications** and best practices
- Consider **integration requirements** and dependencies

### **2. Implementation Strategy**
- Provide **practical, implementable solutions**
- Include **code examples** and configurations where relevant
- Address **testing and validation** approaches
- Consider **deployment and operational** requirements

### **3. Best Practices**
- Follow **software engineering principles** (SOLID, DRY, etc.)
- Implement **security by design** approaches
- Consider **performance optimization** strategies
- Address **maintainability and code quality**

### **4. Response Format**
Return valid JSON matching this schema:
```json
{
  "answer": "Your technical analysis and solution here",
  "citations": [{"chunk_id": "source_id", "relevance": 0.95, "excerpt": "supporting text"}],
  "confidence": 0.85,
  "reasoning": "Brief explanation of your technical approach",
  "technical_details": {
    "architecture": "System design and patterns",
    "implementation": "Key technical decisions",
    "security": "Security considerations and measures",
    "performance": "Performance implications and optimizations"
  },
  "code_examples": ["Relevant code snippet 1", "Configuration example 2"],
  "testing_strategy": "Testing approach and validation methods",
  "deployment_notes": "Infrastructure and operational considerations",
  "flags": [],
  "related_questions": ["What about...", "How does..."]
}
```

## 🚫 **Important Restrictions**
- **No proprietary or confidential code** or configurations
- **No specific API keys or credentials** in examples
- **No detailed internal architectures** that could create security risks
- **Maintain security best practices** in all recommendations

Provide your response as valid JSON only:
