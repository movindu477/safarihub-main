#!/bin/bash

echo ""
echo "========================================"
echo "  SafariHub Cypress Test Runner"
echo "========================================"
echo ""

# Check if server is running
echo "Checking if development server is running on PORT 3000..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)

if [ "$STATUS" -eq 200 ] || [ "$STATUS" -eq 304 ]; then
    echo "✅ Development server is running!"
    echo ""
    echo "Starting Cypress tests..."
    echo ""
    npx cypress open
elif [ "$STATUS" -eq 000 ]; then
    echo ""
    echo "❌ Development server is NOT running!"
    echo ""
    echo "Please start the server first:"
    echo "  npm run dev"
    echo ""
    echo "Then run this script again."
    echo ""
    exit 1
else
    echo ""
    echo "⚠️  Server responded with status: $STATUS"
    echo "Attempting to start Cypress anyway..."
    echo ""
    npx cypress open
fi
