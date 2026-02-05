#!/bin/bash

# Cosine Cartographer - Build & Deploy Script
# --------------------------------------------

set -e  # Exit on any error

echo "🔨 Building Cosine Cartographer..."

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build production version
echo "📦 Creating production build..."
npm run build

echo "✅ Build complete! Files are in ./dist/"
echo ""
echo "📁 Build output:"
ls -la dist/

echo ""
echo "🚀 Next steps for deployment:"
echo "   Option 1: Push to GitHub, then pull via cPanel Git"
echo "   Option 2: Upload the ./dist/ folder contents via FTP"
echo ""
