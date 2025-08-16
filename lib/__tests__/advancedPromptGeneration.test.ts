import { describe, it, expect, beforeEach } from 'vitest'
import { createInitialIR } from '../core/promptIR'
import { advancedPromptGenerator } from '../agents/advancedPromptGenerator'

describe('Advanced Prompt Generation', () => {
  describe('Chain-of-Thought Reasoning', () => {
    it('should enable chain-of-thought for complex DevOps tasks', () => {
      const ir = createInitialIR({
        id: 'test-1',
        mission: 'Design and implement a scalable CI/CD pipeline for microservices architecture',
        mode: 'DevOps Engineer',
        yafa: true
      })

      expect(ir.advancedTechniques?.chainOfThought?.enabled).toBe(true)
      expect(ir.advancedTechniques?.complexity).toBe('complex')
    })

    it('should determine appropriate step count based on mission complexity', () => {
      const shortMission = createInitialIR({
        id: 'test-2',
        mission: 'Help with Docker',
        mode: 'DevOps Engineer',
        yafa: true
      })

      const longMission = createInitialIR({
        id: 'test-3',
        mission: 'Design a comprehensive enterprise microservices architecture with automated deployment pipelines, monitoring, logging, security scanning, and disaster recovery procedures that can handle 10,000+ requests per second with 99.99% uptime',
        mode: 'DevOps Engineer', 
        yafa: true
      })

      expect(shortMission.advancedTechniques?.chainOfThought?.stepCount).toBe(3)
      expect(longMission.advancedTechniques?.chainOfThought?.stepCount).toBe(6)
    })

    it('should enable few-shot for creative UX/UI tasks', () => {
      const ir = createInitialIR({
        id: 'test-4',
        mission: 'Design a mobile app interface with good examples',
        mode: 'UX/UI Designer',
        yafa: true
      })

      expect(ir.advancedTechniques?.fewShot?.enabled).toBe(true)
      expect(ir.advancedTechniques?.fewShot?.qualityLevel).toBe('expert')
    })

    it('should use zero-shot optimization for non-YAFA mode', () => {
      const ir = createInitialIR({
        id: 'test-5',
        mission: 'Help me analyze data',
        mode: 'Data Scientist',
        yafa: false
      })

      expect(ir.advancedTechniques?.zeroShot?.enabled).toBe(true)
      expect(ir.advancedTechniques?.zeroShot?.contextRichness).toBe('standard')
      expect(ir.advancedTechniques?.complexity).toBe('simple')
    })
  })

  describe('Technique Selection Intelligence', () => {
    it('should assess complexity correctly', () => {
      const simple = createInitialIR({
        id: 'test-6',
        mission: 'Explain what Docker is',
        mode: 'DevOps Engineer',
        yafa: true
      })

      const moderate = createInitialIR({
        id: 'test-7',
        mission: 'Analyze the performance of our current system',
        mode: 'DevOps Engineer',
        yafa: true
      })

      const complex = createInitialIR({
        id: 'test-8',
        mission: 'Optimize and architect a new microservices deployment strategy',
        mode: 'DevOps Engineer',
        yafa: true
      })

      expect(simple.advancedTechniques?.complexity).toBe('simple')
      expect(moderate.advancedTechniques?.complexity).toBe('moderate')
      expect(complex.advancedTechniques?.complexity).toBe('complex')
    })

    it('should recommend chain-of-thought for complex architectural modes', () => {
      const architect = createInitialIR({
        id: 'test-9',
        mission: 'Design a system',
        mode: 'Software Architect',
        yafa: true
      })

      expect(architect.advancedTechniques?.chainOfThought?.enabled).toBe(true)
    })
  })

  describe('Prompt Generation Output', () => {
    it('should generate chain-of-thought prompts with step structure', async () => {
      const ir = createInitialIR({
        id: 'test-10',
        mission: 'Optimize database performance for high-traffic application',
        mode: 'Data Scientist',
        yafa: true
      })

      const result = await advancedPromptGenerator.generateAdvancedPrompt(ir)

      expect(result.prompt).toContain('step-by-step')
      expect(result.prompt).toContain('Senior Data Scientist')
      expect(result.prompt).toContain('8+ years')
      expect(result.techniquesUsed).toContain('Chain-of-Thought Reasoning')
      expect(result.metadata.effectivenessScore).toBeGreaterThan(0.8)
    })

    it('should generate few-shot prompts with examples', async () => {
      const ir = createInitialIR({
        id: 'test-11',
        mission: 'Create a style guide template',
        mode: 'UX/UI Designer',
        yafa: true
      })

      const result = await advancedPromptGenerator.generateAdvancedPrompt(ir)

      expect(result.prompt).toContain('examples')
      expect(result.prompt).toContain('Senior UX/UI Designer')
      expect(result.techniquesUsed).toContain('Few-Shot Learning')
    })

    it('should include metadata with complexity and effectiveness scores', async () => {
      const ir = createInitialIR({
        id: 'test-12',
        mission: 'Help with basic task',
        mode: 'General Purpose',
        yafa: false
      })

      const result = await advancedPromptGenerator.generateAdvancedPrompt(ir)

      expect(result.metadata).toHaveProperty('complexity')
      expect(result.metadata).toHaveProperty('effectivenessScore')
      expect(result.metadata).toHaveProperty('estimatedTokens')
      expect(result.metadata).toHaveProperty('reasoning')
      expect(result.metadata.effectivenessScore).toBeGreaterThan(0)
      expect(result.metadata.effectivenessScore).toBeLessThanOrEqual(0.95)
    })
  })
})

describe('Technique-Specific Generation', () => {
  it('should include domain-specific guidance for technical modes', async () => {
    const ir = createInitialIR({
      id: 'test-13',
      mission: 'Implement security measures',
      mode: 'Cybersecurity Analyst',
      yafa: true
    })

    const result = await advancedPromptGenerator.generateAdvancedPrompt(ir)

    expect(result.prompt).toContain('threat models')
    expect(result.prompt).toContain('security frameworks')
  })

  it('should provide structured output formatting', async () => {
    const ir = createInitialIR({
      id: 'test-14',
      mission: 'Create project plan',
      mode: 'Product Manager',
      yafa: true
    })

    const result = await advancedPromptGenerator.generateAdvancedPrompt(ir)

    expect(result.prompt).toContain('section headers')
    expect(result.prompt).toContain('bullet points')
  })
})
