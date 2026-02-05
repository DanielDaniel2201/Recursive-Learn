#!/bin/bash

echo "=========================================="
echo "Updating Recursive-Learn Extension..."
echo "=========================================="

echo "1. Pulling latest code from GitHub..."
git pull

echo ""
echo "2. Installing dependencies (if any changed)..."
npm install

echo ""
echo "3. Rebuilding CSS..."
npm run build:css

echo ""
echo "=========================================="
echo "Update Complete!"
echo "Please go to chrome://extensions and click the reload icon on Recursive-Learn."
echo "=========================================="
