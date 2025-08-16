#!/bin/bash
set -e

echo "🚀 YAFA MS - Robust Startup Script"
echo ""

# Cleanup function
cleanup() {
    echo "🧹 Cleaning up processes..."
    pkill -f "tsx.*src/index.ts" 2>/dev/null || true
    pkill -f "vite.*apps/web" 2>/dev/null || true
    sleep 2
    exit 0
}

# Trap Ctrl+C to cleanup
trap cleanup INT

# Kill any existing processes
echo "1. Cleaning up existing processes..."
pkill -f "tsx.*src/index.ts" 2>/dev/null || true
pkill -f "vite.*apps/web" 2>/dev/null || true
sleep 3

# Setup environment
echo "2. Setting up environment..."
export AWS_PROFILE=Yafa-ss
export AWS_REGION=us-east-1
export OPENAI_API_KEY=$(aws secretsmanager get-secret-value --secret-id yafa/ms/llm/openai/api_key --query SecretString --output text)

if [[ -z "$OPENAI_API_KEY" ]]; then
    echo "❌ Failed to load OpenAI key"
    exit 1
fi

echo "✅ Environment configured"

# Start server in background with proper env
echo "3. Starting YAFA server..."
cd apps/server
AWS_PROFILE="$AWS_PROFILE" AWS_REGION="$AWS_REGION" OPENAI_API_KEY="$OPENAI_API_KEY" npm run dev &
SERVER_PID=$!

# Wait for server to start
echo "4. Waiting for server to start..."
sleep 8

# Check if server is running
if ! curl -s http://localhost:8787/api/health > /dev/null; then
    echo "❌ Server failed to start"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi

echo "✅ Server is running"

# Start web interface
echo "5. Starting web interface..."
cd ../..
npm run dev:web &
WEB_PID=$!

echo ""
echo "🎉 YAFA MS is running!"
echo "📊 Server: http://localhost:8787"
echo "🌐 Web UI: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
wait
