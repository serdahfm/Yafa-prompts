# 🚀 YAFFA Engine - Autonomous Prompt Constructor

**Transform simple requests into sophisticated prompts for downstream LLMs**

A modern, ChatGPT-style interface that analyzes user intent and constructs powerful, highly-engineered prompts that compel downstream LLMs to produce exceptional, functionally complete outputs.

![YAFFA Engine Interface](https://via.placeholder.com/800x400/0d1117/ffffff?text=YAFFA+Engine+Interface)

## ✨ Features

### 🎯 **Autonomous Prompt Construction**
- **No static templates** - each prompt is dynamically constructed based on deep analysis
- **Implicit intent detection** - automatically identifies desired output formats (PowerPoint, Excel, Python scripts, etc.)
- **Schema injection** for specific file types and structures
- **Persona assignment** - assigns optimal personas to downstream LLMs

### 🎛️ **Two Operating Modes**

#### 🔴 **YAFFA Mode (Precision Engineering)**
- Deterministic, unambiguous prompts for exact results
- Single optimal solution path with verification steps
- Tool-like reliability for known requirements

#### 🔵 **Discovery Mode (Creative Exploration)**  
- Forces downstream LLMs to provide 2-3 alternative approaches
- Historical precedents and examples included
- Self-critique and meta-analysis of solution space

### 🔄 **Sovereign Iterative Loop**
- **Complete context synthesis** of original prompt + LLM response + user feedback
- **Coherent next iterations** that build directly on previous work
- **No context loss** between iterations

### 🌙 **Modern Interface**
- Dark theme identical to ChatGPT
- Clean, professional design
- Responsive and mobile-friendly
- Real-time feedback and loading states

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/serdahfm/yaffa-engine.git
   cd yaffa-engine
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env and add your OpenAI API key
   echo "OPENAI_API_KEY=your_api_key_here" > .env
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

5. **Start the server**
   ```bash
   npm start
   ```

6. **Access the interface**
   - Local: http://localhost:3001/cartridge
   - For public access, use ngrok: `ngrok http 3001`

## 📖 How to Use

### **Initial Generation**
1. **Enter what you want to create**: "make a presentation about quarterly sales"
2. **Choose mode**: Discovery (creative) or YAFFA (precision)  
3. **Click "Generate Master Prompt"**
4. **Copy the result** to ChatGPT, Claude, or any LLM

### **Sovereign Loop (Refinement)**
1. **Click "Refine Results"**
2. **Paste the LLM's complete response**
3. **Describe what needs improvement** 
4. **Click "Generate Refined Prompt"**
5. **Get a new, improved prompt** that builds on everything

## 🛠️ API Endpoints

### Core Endpoints
- `GET /cartridge` - Main interface
- `POST /generate-master-prompt` - Generate sophisticated prompts
- `POST /detect-domain` - Automatic domain detection
- `GET /health` - Server health check

### Example API Usage

```bash
curl -X POST http://localhost:3001/generate-master-prompt \
  -H "Content-Type: application/json" \
  -d '{
    "primaryRequest": "create a Python script for data analysis",
    "mode": "yaffa", 
    "sovereignLoop": false
  }'
```

## 🏗️ Architecture

### Core Components
- **Prompt Compiler** - Maps requests to sophisticated prompt patterns
- **Domain Router** - Automatically detects content domains and contexts
- **Cartridge System** - Modular domain-specific configurations
- **Execution Pipeline** - Multi-stage prompt processing
- **Telemetry Engine** - Comprehensive observability and metrics

### Key Files
```
├── server.ts              # Main Express server
├── public/
│   └── chatgpt-style.html  # Modern web interface
├── lib/core/              # Core prompt engineering logic
├── domains/               # Domain-specific cartridges
├── templates/             # Prompt templates
└── dist/                  # Compiled TypeScript
```

## 🔧 Configuration

### Environment Variables
```bash
OPENAI_API_KEY=your_openai_api_key
PORT=3001
NODE_ENV=production
```

### Customization
- **Add new domains**: Create YAML files in `/domains/`
- **Modify templates**: Edit files in `/templates/`
- **Customize styles**: Update `/styles/` configurations

## 📊 Examples

### Input: "make a presentation about quarterly sales"
**Generated Output:**
- **System Prompt**: "You are an expert business analyst and presentation designer..."
- **User Prompt**: "Create a PowerPoint presentation about quarterly sales that includes..."
- **Constraints**: "The presentation must be structured with a title slide..."

### Input: "create a Python script for data analysis" 
**Generated Output:**
- **System Prompt**: "You are a highly skilled Python developer and data analyst..."
- **User Prompt**: "Create a Python script that handles the following tasks..."
- **Constraints**: "The script must be written in Python 3.x, use libraries such as pandas..."

## 🧪 Development

### Build Commands
```bash
npm run build        # Compile TypeScript
npm run dev          # Development mode with hot reload
npm run test         # Run test suite
npm run lint         # Check code quality
```

### Testing
```bash
# Run the test script
./test-and-deploy.sh

# Manual API testing
curl http://localhost:3001/health
curl -X POST http://localhost:3001/generate-master-prompt \
  -H "Content-Type: application/json" \
  -d '{"primaryRequest": "test", "mode": "discovery", "sovereignLoop": false}'
```

## 🌐 Deployment

### Using ngrok (for development)
```bash
# Start the server
npm start

# In another terminal, create tunnel
ngrok http 3001
```

### Production Deployment
- Deploy to any Node.js hosting platform (Vercel, Railway, Heroku, etc.)
- Ensure environment variables are properly configured
- Use PM2 or similar for process management

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🔗 Links

- **Live Demo**: [Your deployed URL here]
- **Documentation**: [Full docs]
- **Issues**: [GitHub Issues](https://github.com/serdahfm/yaffa-engine/issues)

## 📧 Support

For support, email support@yaffa-engine.com or create an issue on GitHub.

---

**Built with ❤️ by the YAFFA team**

*Transforming the art of prompt engineering into systematic excellence*