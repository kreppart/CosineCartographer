#!/bin/bash

# DeployCC - Cosine Cartographer Deployment Script
# Usage: ./deploy.sh "Optional commit message"

set -e  # Exit on any error

cd "$(dirname "$0")/../.."  # Navigate to project root

echo "🔨 Building Cosine Cartographer..."
npm run build

echo ""
echo "📋 Checking for changes..."
if git diff --quiet && git diff --staged --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
    echo "✅ No changes to commit. Build is up to date."
    exit 0
fi

echo ""
echo "📦 Staging changes..."
git add .

# Use provided message or generate default
COMMIT_MSG="${1:-Update Cosine Cartographer}"

echo ""
echo "💾 Committing: $COMMIT_MSG"
git commit -m "$COMMIT_MSG"

echo ""
echo "🚀 Pushing to GitHub..."
git push

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📌 Next step: Go to cPanel → Git Version Control → Click 'Update from Remote'"
