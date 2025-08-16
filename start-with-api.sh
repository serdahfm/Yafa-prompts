#!/bin/bash

# Start YAFA MS with API key
# Make sure to set OPENAI_API_KEY environment variable before running this script

if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ Error: OPENAI_API_KEY environment variable is not set"
    echo "Please set it with: export OPENAI_API_KEY=your_key_here"
    exit 1
fi

echo "Starting YAFA MS with API key configured..."

# Start both services
npm run dev
