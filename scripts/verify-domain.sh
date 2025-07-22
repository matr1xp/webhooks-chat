#!/bin/bash
# Quick domain verification script

DOMAIN="$1"
if [ -z "$DOMAIN" ]; then
    echo "Usage: $0 YOUR_DOMAIN.com"
    echo "Example: $0 chat.example.com"
    exit 1
fi

echo "🔍 Checking DNS resolution for $DOMAIN..."
dig "$DOMAIN" +short

echo ""
echo "🔍 Testing HTTPS connection..."
curl -I "https://$DOMAIN" 2>/dev/null | head -3

echo ""
echo "🔍 Firebase hosting status..."
firebase hosting:sites:list

echo ""
echo "✅ If DNS shows Firebase IPs and HTTPS works, your domain is ready!"