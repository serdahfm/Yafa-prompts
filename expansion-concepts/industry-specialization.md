# Industry-Specific Prompt Libraries

## Expanded Professional Modes

### Technology Sector
- **DevOps Engineer**: Infrastructure, CI/CD, monitoring
- **Data Scientist**: ML models, data analysis, statistical validation
- **Cybersecurity Analyst**: Threat assessment, vulnerability analysis
- **Product Manager**: Feature specs, user stories, roadmap planning
- **UX/UI Designer**: User research, wireframes, design systems

### Healthcare & Life Sciences
- **Clinical Researcher**: Trial design, regulatory compliance
- **Medical Writer**: Clinical documentation, regulatory submissions
- **Biostatistician**: Clinical data analysis, statistical reports
- **Pharmaceutical Analyst**: Drug development, market analysis

### Finance & Legal
- **Financial Analyst**: Financial modeling, risk assessment
- **Compliance Officer**: Regulatory analysis, audit preparation
- **Legal Researcher**: Case analysis, legal brief preparation
- **Investment Analyst**: Market research, investment thesis

### Marketing & Sales
- **Content Strategist**: Content planning, editorial calendars
- **Sales Engineer**: Technical proposals, solution architecture
- **Brand Manager**: Brand strategy, campaign development
- **Growth Hacker**: A/B testing, conversion optimization

## Specialized Guarantees
- **Industry Terminology**: Correct professional language
- **Regulatory Compliance**: Adherence to industry standards
- **Best Practices**: Current methodologies and frameworks
- **Output Formats**: Industry-standard deliverable structures

## Implementation
```typescript
interface IndustryMode {
  id: string
  name: string
  category: 'Technology' | 'Healthcare' | 'Finance' | 'Marketing'
  specializations: string[]
  requiredFields: string[]
  outputFormats: string[]
  complianceRequirements: string[]
}
```
