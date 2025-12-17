#!/bin/bash

# Trackdesk Backend Startup Script
echo "🚀 Starting Trackdesk Backend..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create one from env.production"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if Prisma client is generated
if [ ! -d "node_modules/.prisma" ]; then
    echo "🔧 Generating Prisma client..."
    npx prisma generate
fi

# Run database migrations
echo "🗄️ Running database migrations..."
npx prisma migrate deploy

# Create logs directory if it doesn't exist
mkdir -p logs

# Start the server
echo "🌟 Starting Trackdesk Backend Server..."
npm run dev


