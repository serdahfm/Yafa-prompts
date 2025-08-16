import React, { useMemo, useState, useRef, useEffect } from 'react'

type Mode = 
  | 'General Purpose'
  // Technology Sector
  | 'DevOps Engineer'
  | 'Data Scientist'
  | 'Cybersecurity Analyst'
  | 'Product Manager'
  | 'UX/UI Designer'
  | 'Software Architect'
  | 'Machine Learning Engineer'
  | 'Cloud Solutions Architect'
  // Healthcare & Life Sciences
  | 'Clinical Researcher'
  | 'Medical Writer'
  | 'Biostatistician'
  | 'Pharmaceutical Analyst'
  | 'Regulatory Affairs Specialist'
  // Finance & Legal
  | 'Financial Analyst'
  | 'Compliance Officer'
  | 'Legal Researcher'
  | 'Investment Analyst'
  | 'Risk Management Specialist'
  // Marketing & Sales
  | 'Content Strategist'
  | 'Sales Engineer'
  | 'Brand Manager'
  | 'Growth Hacker'
  | 'Digital Marketing Specialist'
  // Original broad categories
  | 'Science Researcher / Laboratory Professional'
  | 'Process Engineer / Development Engineer'
  | 'Business Consultant / Developer / Market Analyst'

interface QualityScore {
  overall: number
  breakdown: {
    clarity: number
    completeness: number
    effectiveness: number
    professional: number
  }
  recommendations: string[]
  confidence: number
}

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  quality?: QualityScore | null
  version?: string
  feedbackSubmitted?: boolean
}

interface ModeDetectionResult {
  wasAutoDetected: boolean
  detectedMode?: Mode
  confidence?: number
  reasoning?: string
  keywords?: string[]
  alternativeModes?: Array<{
    mode: Mode
    confidence: number
  }>
}

export default function App() {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<Mode>('General Purpose')
  const [yafa, setYafa] = useState(false)
  const [autoDetectMode, setAutoDetectMode] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [lastDetection, setLastDetection] = useState<ModeDetectionResult | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const theme = useMemo(() => (yafa ? 'rgb(239 68 68)' : 'rgb(16 163 127)'), [yafa])

  // Apply YAFA theme to document root
  useEffect(() => {
    const root = document.documentElement
    if (yafa) {
      root.classList.add('yafa-mode')
      document.body.classList.add('yafa-mode')
    } else {
      root.classList.remove('yafa-mode')
      document.body.classList.remove('yafa-mode')
    }
    
    // Cleanup on unmount
    return () => {
      root.classList.remove('yafa-mode')
      document.body.classList.remove('yafa-mode')
    }
  }, [yafa])

  const generate = async () => {
    if (!input.trim()) return
    
    setIsGenerating(true)
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    setInput('')
    
    try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        input, 
        mode, 
        yafa, 
        autoDetectMode: yafa && autoDetectMode 
      }),
    })
    
    const data = await res.json()
    
    // Handle LLM configuration errors specifically
    if (!res.ok && data.error === 'LLM_CONFIGURATION_REQUIRED') {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `🚨 LLM Configuration Required\n\n${data.message}\n\n📋 Setup Instructions:\n• ${data.setupInstructions?.openai}\n• ${data.setupInstructions?.anthropic}\n• ${data.setupInstructions?.environment}\n\nPlease configure API keys and restart the server.`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
      return
    }
    
    // Handle other server errors
    if (!res.ok) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.error || `Server error: ${res.status} ${res.statusText}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
      return
    }
      
    // Store detection results if available
    if (data.modeDetection) {
      setLastDetection(data.modeDetection)
    }
    
    // Add assistant response with quality data
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'assistant',
      content: data.prompt || 'No response generated',
      timestamp: new Date(),
      quality: data.quality || null,
      version: data.version || '1.0.0'
    }
    
    setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Prompt generation error:', error)
      
      let errorContent = 'Error generating prompt. Please try again.'
      
      // Handle specific error types
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorContent = 'Unable to connect to the server. Please check your connection and try again.'
      } else if (error instanceof Error) {
        errorContent = `Generation failed: ${error.message}`
      }
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant', 
        content: errorContent,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    }
    
    setIsGenerating(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      generate()
    }
  }

  const copyMessage = async (content: string) => {
    await navigator.clipboard.writeText(content)
    // Could add toast notification here
  }

  const submitFeedback = async (messageId: string, rating: number, feedback?: string) => {
    try {
      await fetch('/api/feedback/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          promptId: messageId, 
          rating, 
          feedback 
        }),
      })
      // Update message to show feedback submitted
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, feedbackSubmitted: true }
          : msg
      ))
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    }
  }

  const QualityIndicator = ({ quality }: { quality: QualityScore }) => {
    const getScoreColor = (score: number) => {
      if (score >= 90) return '#10b981' // green
      if (score >= 75) return '#f59e0b' // yellow
      return '#ef4444' // red
    }

    return (
      <div style={{ 
        marginTop: '8px', 
        padding: '8px', 
        background: '#1f2937', 
        borderRadius: '6px',
        fontSize: '12px'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          marginBottom: '6px' 
        }}>
          <span style={{ color: '#d1d5db' }}>Quality Score:</span>
          <span style={{ 
            color: getScoreColor(quality.overall),
            fontWeight: 'bold',
            fontSize: '14px'
          }}>
            {quality.overall}/100
          </span>
          <span style={{ color: '#9ca3af', fontSize: '11px' }}>
            ({quality.confidence}% confidence)
          </span>
        </div>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '6px',
          marginBottom: '6px'
        }}>
          {Object.entries(quality.breakdown).map(([key, score]) => (
            <div key={key} style={{ textAlign: 'center' }}>
              <div style={{ color: '#9ca3af', fontSize: '10px', textTransform: 'capitalize' }}>
                {key}
              </div>
              <div style={{ color: getScoreColor(score), fontWeight: 'bold' }}>
                {score}
              </div>
            </div>
          ))}
        </div>
        
        {quality.recommendations.length > 0 && (
          <details style={{ marginTop: '6px' }}>
            <summary style={{ 
              color: '#fbbf24', 
              cursor: 'pointer', 
              fontSize: '11px' 
            }}>
              Recommendations ({quality.recommendations.length})
            </summary>
            <ul style={{ 
              margin: '4px 0 0 16px', 
              color: '#d1d5db',
              fontSize: '11px',
              lineHeight: '1.4'
            }}>
              {quality.recommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
    )
  }

  const FeedbackWidget = ({ messageId, feedbackSubmitted }: { messageId: string, feedbackSubmitted?: boolean }) => {
    const [showFeedback, setShowFeedback] = useState(false)
    const [selectedRating, setSelectedRating] = useState(0)
    const [feedbackText, setFeedbackText] = useState('')

    if (feedbackSubmitted) {
      return (
        <div style={{ 
          marginTop: '8px', 
          fontSize: '11px', 
          color: '#10b981' 
        }}>
          ✓ Thank you for your feedback!
        </div>
      )
    }

    return (
      <div style={{ marginTop: '8px' }}>
        {!showFeedback ? (
          <button
            onClick={() => setShowFeedback(true)}
            style={{
              background: 'transparent',
              border: '1px solid #565869',
              color: '#d1d5db',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            Rate this prompt
          </button>
        ) : (
          <div style={{ 
            background: '#1f2937', 
            padding: '8px', 
            borderRadius: '6px',
            fontSize: '12px'
          }}>
            <div style={{ marginBottom: '6px', color: '#d1d5db' }}>Rate this prompt:</div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
              {[1, 2, 3, 4, 5].map(rating => (
                <button
                  key={rating}
                  onClick={() => setSelectedRating(rating)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '16px',
                    cursor: 'pointer',
                    color: rating <= selectedRating ? '#fbbf24' : '#6b7280'
                  }}
                >
                  ⭐
                </button>
              ))}
            </div>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Optional feedback..."
              style={{
                width: '100%',
                background: '#374151',
                border: '1px solid #6b7280',
                color: '#ffffff',
                padding: '4px',
                borderRadius: '4px',
                fontSize: '11px',
                minHeight: '40px',
                resize: 'vertical'
              }}
            />
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
              <button
                onClick={() => {
                  if (selectedRating > 0) {
                    submitFeedback(messageId, selectedRating, feedbackText)
                    setShowFeedback(false)
                  }
                }}
                disabled={selectedRating === 0}
                style={{
                  background: selectedRating > 0 ? '#10b981' : '#6b7280',
                  border: 'none',
                  color: '#ffffff',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  cursor: selectedRating > 0 ? 'pointer' : 'not-allowed'
                }}
              >
                Submit
              </button>
              <button
                onClick={() => setShowFeedback(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid #6b7280',
                  color: '#d1d5db',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  const clearConversation = () => {
    setMessages([])
  }

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  return (
    <div 
      className={yafa ? 'yafa-mode' : ''}
      style={{ 
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', 
        background: 'var(--bg-primary)', 
        color: 'var(--text-primary)', 
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease'
      }}>
      {/* Header */}
      <header 
        className={yafa ? 'yafa-glow' : ''}
        style={{ 
          padding: '12px 20px', 
          borderBottom: `1px solid var(--border-color)`,
          background: 'var(--bg-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'all 0.3s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h1 
            className={yafa ? 'yafa-text' : ''}
            style={{ 
              margin: 0, 
              fontSize: '16px', 
              fontWeight: '600',
              transition: 'all 0.3s ease'
            }}>
            YAFA-prompts {yafa && '🔥'}
          </h1>
          <button 
            className={yafa ? 'yafa-button' : ''}
            onClick={clearConversation}
            style={{
              background: 'transparent',
              border: `1px solid var(--border-color)`,
              color: 'var(--text-primary)',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            + New chat
          </button>
        </div>
        
        <button
          className={yafa ? 'yafa-button' : ''}
          onClick={() => setShowSettings(!showSettings)}
          style={{
            background: 'transparent',
            border: `1px solid var(--border-color)`,
            color: 'var(--text-primary)',
            padding: '8px',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
        >
          ⚙️
        </button>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div 
          className={yafa ? 'yafa-glow' : ''}
          style={{
            background: 'var(--bg-secondary)',
            borderBottom: `1px solid var(--border-color)`,
            padding: '16px 20px',
            transition: 'all 0.3s ease'
          }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <label style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>
                Professional Mode:
                {yafa && autoDetectMode && (
                  <span style={{ color: '#10b981', fontSize: '12px', marginLeft: '8px' }}>
                    🤖 Auto-detection enabled
                  </span>
                )}
              </label>
              <select 
                value={mode} 
                onChange={(e) => setMode(e.target.value as Mode)}
                disabled={yafa && autoDetectMode}
                style={{
                  background: yafa && autoDetectMode ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                  border: `1px solid var(--border-color)`,
                  color: yafa && autoDetectMode ? 'var(--text-secondary)' : 'var(--text-primary)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  minWidth: '200px',
                  cursor: yafa && autoDetectMode ? 'not-allowed' : 'pointer'
                }}
              >
                <option value="General Purpose">General Purpose</option>
                
                <optgroup label="🚀 Technology">
                  <option value="DevOps Engineer">DevOps Engineer</option>
                  <option value="Data Scientist">Data Scientist</option>
                  <option value="Cybersecurity Analyst">Cybersecurity Analyst</option>
                  <option value="Product Manager">Product Manager</option>
                  <option value="UX/UI Designer">UX/UI Designer</option>
                  <option value="Software Architect">Software Architect</option>
                  <option value="Machine Learning Engineer">ML Engineer</option>
                  <option value="Cloud Solutions Architect">Cloud Architect</option>
                </optgroup>
                
                <optgroup label="🏥 Healthcare & Life Sciences">
                  <option value="Clinical Researcher">Clinical Researcher</option>
                  <option value="Medical Writer">Medical Writer</option>
                  <option value="Biostatistician">Biostatistician</option>
                  <option value="Pharmaceutical Analyst">Pharmaceutical Analyst</option>
                  <option value="Regulatory Affairs Specialist">Regulatory Affairs</option>
                </optgroup>
                
                <optgroup label="💰 Finance & Legal">
                  <option value="Financial Analyst">Financial Analyst</option>
                  <option value="Compliance Officer">Compliance Officer</option>
                  <option value="Legal Researcher">Legal Researcher</option>
                  <option value="Investment Analyst">Investment Analyst</option>
                  <option value="Risk Management Specialist">Risk Management</option>
                </optgroup>
                
                <optgroup label="📈 Marketing & Sales">
                  <option value="Content Strategist">Content Strategist</option>
                  <option value="Sales Engineer">Sales Engineer</option>
                  <option value="Brand Manager">Brand Manager</option>
                  <option value="Growth Hacker">Growth Hacker</option>
                  <option value="Digital Marketing Specialist">Digital Marketing</option>
                </optgroup>
                
                <optgroup label="📚 Broad Categories">
                  <option value="Science Researcher / Laboratory Professional">Science Research</option>
                  <option value="Process Engineer / Development Engineer">Engineering</option>
                  <option value="Business Consultant / Developer / Market Analyst">Business Analysis</option>
                </optgroup>
              </select>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label 
                className={yafa ? 'yafa-glow' : ''}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8, 
                  fontSize: '14px',
                  padding: yafa ? '8px 12px' : '4px',
                  borderRadius: '8px',
                  transition: 'all 0.3s ease'
                }}>
                <input 
                  type="checkbox" 
                  checked={yafa} 
                  onChange={(e) => setYafa(e.target.checked)}
                  style={{ 
                    transform: 'scale(1.2)',
                    accentColor: yafa ? '#dc2626' : '#6b7280'
                  }}
                />
                <span 
                  className={yafa ? 'yafa-text' : ''}
                  style={{ 
                    color: yafa ? '#fecaca' : 'var(--text-secondary)',
                    fontWeight: yafa ? 'bold' : 'normal',
                    transition: 'all 0.3s ease'
                  }}>
                  YAFA Mode {yafa ? '🔥⚡' : '⚪'}
                </span>
              </label>
              
              {yafa && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '13px', marginLeft: '24px' }}>
                  <input 
                    type="checkbox" 
                    checked={autoDetectMode} 
                    onChange={(e) => setAutoDetectMode(e.target.checked)}
                    style={{ transform: 'scale(1.0)' }}
                  />
                  <span style={{ color: '#10b981' }}>
                    🤖 Auto-detect professional mode from input
                  </span>
                </label>
              )}
            </div>
          </div>
          
          {/* Mode Detection Results */}
          {lastDetection && lastDetection.wasAutoDetected && (
            <div style={{
              marginTop: '12px',
              padding: '12px',
              background: '#1a1a2e',
              border: '1px solid #10b981',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '13px', color: '#10b981', fontWeight: 'bold', marginBottom: '6px' }}>
                🎯 Auto-Detected Professional Mode
              </div>
              <div style={{ fontSize: '12px', color: '#d1d5db', lineHeight: '1.4' }}>
                <div style={{ marginBottom: '4px' }}>
                  <strong style={{ color: '#fbbf24' }}>{lastDetection.detectedMode}</strong> 
                  {lastDetection.confidence && (
                    <span style={{ color: '#9ca3af' }}>
                      {' '}({Math.round(lastDetection.confidence * 100)}% confidence)
                    </span>
                  )}
                </div>
                {lastDetection.reasoning && (
                  <div style={{ color: '#9ca3af', fontSize: '11px' }}>
                    {lastDetection.reasoning}
                  </div>
                )}
                {lastDetection.keywords && lastDetection.keywords.length > 0 && (
                  <div style={{ marginTop: '6px' }}>
                    <span style={{ color: '#9ca3af', fontSize: '11px' }}>Keywords: </span>
                    {lastDetection.keywords.slice(0, 3).map((keyword, idx) => (
                      <span key={idx} style={{ 
                        color: '#10b981', 
                        fontSize: '11px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        padding: '2px 4px',
                        borderRadius: '3px',
                        marginRight: '4px'
                      }}>
                        {keyword}
                      </span>
                    ))}
                  </div>
                )}
                {lastDetection.alternativeModes && lastDetection.alternativeModes.length > 0 && (
                  <div style={{ marginTop: '6px', fontSize: '11px', color: '#9ca3af' }}>
                    Also considered: {lastDetection.alternativeModes.slice(0, 2).map(alt => alt.mode).join(', ')}
                  </div>
                )}
              </div>
              <button
                onClick={() => setLastDetection(null)}
                style={{
                  marginTop: '8px',
                  background: 'transparent',
                  border: '1px solid #4b5563',
                  color: '#9ca3af',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}
      {/* Main Chat Area */}
      <main style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        maxWidth: '768px',
        margin: '0 auto',
        width: '100%',
        transition: 'all 0.3s ease'
      }}>
        {/* Messages Container */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          {messages.length === 0 ? (
            // Welcome Screen
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              flex: 1,
              textAlign: 'center',
              gap: '20px'
            }}>
              <div style={{ fontSize: '32px' }}>🚀</div>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>
                YAFA-prompts
              </h2>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '16px', maxWidth: '600px' }}>
                Transform your ideas into structured, professional prompts optimized for AI models. 
                Just describe what you need and I'll create the perfect prompt for you.
              </p>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                gap: '12px',
                width: '100%',
                maxWidth: '600px'
              }}>
                {[
                  "Create a research methodology for analyzing user feedback",
                  "Design a technical implementation plan for a new feature", 
                  "Generate a business analysis framework for market research"
                ].map((example, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(example)}
                    style={{
                      background: 'var(--bg-secondary)',
                      border: `1px solid var(--border-color)`,
                      color: 'var(--text-primary)',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                  >
                    {example}
              </button>
            ))}
          </div>
            </div>
          ) : (
            // Chat Messages
            messages.map((message) => (
              <div key={message.id} style={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: message.type === 'user' ? 'flex-end' : 'flex-start'
              }}>
                <div style={{
                  background: message.type === 'user' ? theme : '#40414f',
                  color: '#ffffff',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  maxWidth: '80%',
                  fontSize: '14px',
                  lineHeight: '1.5'
                }}>
                          {message.type === 'assistant' ? (
          <div>
            <div style={{ 
              fontSize: '12px', 
              color: '#d1d5db', 
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>Generated Prompt</span>
              {message.version && (
                <span style={{ 
                  background: '#1f2937', 
                  padding: '2px 6px', 
                  borderRadius: '4px',
                  fontSize: '10px',
                  color: '#10b981'
                }}>
                  v{message.version}
                </span>
              )}
              <button
                onClick={() => copyMessage(message.content)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#d1d5db',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                📋 Copy
              </button>
            </div>
            <div style={{ 
              fontFamily: 'Monaco, Consolas, monospace',
              fontSize: '13px',
              whiteSpace: 'pre-wrap'
            }}>
              {message.content}
            </div>
            {message.quality && <QualityIndicator quality={message.quality} />}
            <FeedbackWidget messageId={message.id} feedbackSubmitted={message.feedbackSubmitted} />
          </div>
        ) : (
          message.content
        )}
                </div>
          </div>
            ))
          )}
          
          {isGenerating && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ 
                background: '#40414f',
                color: '#ffffff',
                padding: '12px 16px',
                borderRadius: '12px',
                fontSize: '14px'
              }}>
                Generating your prompt...
          </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div style={{ 
          padding: '20px',
          borderTop: `1px solid var(--border-color)`,
          transition: 'all 0.3s ease'
        }}>
          <div 
            className={yafa ? 'yafa-glow' : ''}
            style={{ 
              position: 'relative',
              background: 'var(--bg-secondary)',
              borderRadius: '12px',
              border: `1px solid var(--border-color)`,
              transition: 'all 0.3s ease'
            }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={yafa ? "🔥 Describe your challenge - YAFA will craft the perfect prompt..." : "Describe what you need a prompt for..."}
              style={{
                width: '100%',
                minHeight: '24px',
                maxHeight: '120px',
                padding: '12px 50px 12px 16px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '16px',
                lineHeight: '1.5',
                resize: 'none',
                outline: 'none',
                fontFamily: 'inherit',
                transition: 'all 0.3s ease'
              }}
            />
            <button
              className={yafa ? 'yafa-button' : ''}
              onClick={generate}
              disabled={!input.trim() || isGenerating}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: input.trim() && !isGenerating ? 'var(--accent-color)' : 'var(--border-color)',
                border: 'none',
                color: '#ffffff',
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                cursor: input.trim() && !isGenerating ? 'pointer' : 'not-allowed',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease'
              }}
            >
              {yafa ? '🔥' : '↗'}
            </button>
          </div>
          <div style={{ 
            fontSize: '12px', 
            color: 'var(--text-secondary)', 
            textAlign: 'center', 
            marginTop: '8px' 
          }}>
            Press Enter to send, Shift+Enter for new line
          </div>
        </div>
      </main>
    </div>
  )
}



