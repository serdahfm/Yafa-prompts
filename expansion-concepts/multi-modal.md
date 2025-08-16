# Multi-Modal Prompt Generation

## Beyond Text Prompts
- **Visual Prompts**: Generate prompts for image/video analysis
- **Code Prompts**: Specialized prompts for code generation/review
- **Data Prompts**: Prompts for data analysis and visualization
- **Audio Prompts**: Prompts for transcription and audio analysis

## Context-Aware Generation
- **File Upload Analysis**: Analyze uploaded documents to enhance prompts
- **URL Content Integration**: Scrape and integrate web content
- **Database Connection**: Pull relevant data to inform prompts
- **API Integration**: Connect to external systems for context

## Output Format Guarantees
- **Structured Data**: JSON, XML, CSV output formats
- **Documentation**: Markdown, PDF, Word document generation
- **Code Artifacts**: Complete, runnable code with documentation
- **Visual Specifications**: Wireframes, diagrams, charts

## Implementation Example
```typescript
interface MultiModalPrompt {
  textComponent: string
  attachments?: {
    type: 'image' | 'document' | 'data' | 'code'
    content: string | Buffer
    analysis: string
  }[]
  outputFormat: 'text' | 'json' | 'markdown' | 'code' | 'visual'
  contextSources?: {
    urls?: string[]
    databases?: string[]
    apis?: string[]
  }
}
```

## Guarantees
- **Format Compliance**: Output always matches requested format
- **Context Integration**: Relevant external data incorporated
- **Multi-Modal Coherence**: All components work together seamlessly
