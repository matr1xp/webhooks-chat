# Custom Domain Setup for Firebase Hosting

## Overview
Configure your own domain to point to the Firebase Hosted chat interface at `https://***REMOVED***.web.app`.

## Prerequisites
- Domain name that you own and control
- Access to your domain's DNS settings
- Firebase CLI installed and authenticated

## Setup Methods

### Method 1: Using Firebase CLI (Recommended)

#### Step 1: Add Custom Domain
```bash
# Navigate to project directory
cd /Users/marlon/workspace/Projects/N8N/chat-interface

# Add your custom domain
firebase hosting:channel:deploy YOUR_DOMAIN.com --only hosting
```

Or use the interactive setup:
```bash
firebase hosting:sites:create
```

#### Step 2: Configure DNS Records
Firebase will provide you with DNS records to add to your domain:

**For Apex Domain (example.com):**
```
Type: A
Name: @
Value: [Firebase will provide IP addresses]
```

**For Subdomain (chat.example.com):**
```
Type: CNAME
Name: chat (or your chosen subdomain)
Value: ***REMOVED***.web.app
```

#### Step 3: Verify Domain Ownership
Firebase will ask you to verify domain ownership by adding a TXT record:
```
Type: TXT
Name: @ (or _firebase-hosting-challenge)
Value: [Firebase will provide verification code]
```

### Method 2: Using Firebase Console (Alternative)

#### Step 1: Open Firebase Console
1. Go to https://console.firebase.google.com/project/***REMOVED***
2. Navigate to "Hosting" section
3. Click "Add custom domain"

#### Step 2: Enter Your Domain
- Enter your domain name (e.g., `chat.yourdomain.com`)
- Follow the verification steps

#### Step 3: Configure DNS
Add the DNS records provided by Firebase to your domain provider.

## DNS Configuration Examples

### Common DNS Providers

#### Cloudflare
1. Login to Cloudflare dashboard
2. Select your domain
3. Go to DNS settings
4. Add the records provided by Firebase
5. Set proxy status to "DNS only" (gray cloud) initially

#### Namecheap
1. Login to Namecheap account
2. Go to Domain List → Manage
3. Navigate to Advanced DNS
4. Add the A/CNAME records as provided

#### GoDaddy
1. Login to GoDaddy account
2. Go to My Products → DNS
3. Add the records in the DNS Management section

#### Google Domains
1. Login to Google Domains
2. Select your domain
3. Go to DNS settings
4. Add custom resource records

## SSL Certificate
Firebase automatically provisions and manages SSL certificates for custom domains. This process can take up to 24 hours after DNS propagation.

## Verification Process

### Step 1: Check DNS Propagation
```bash
# Check if DNS has propagated
dig YOUR_DOMAIN.com
nslookup YOUR_DOMAIN.com

# Check CNAME for subdomain
dig chat.YOUR_DOMAIN.com CNAME
```

### Step 2: Test Custom Domain
```bash
# Test HTTP response
curl -I https://YOUR_DOMAIN.com

# Test site content
curl -s https://YOUR_DOMAIN.com | head -10
```

### Step 3: Firebase Status Check
```bash
# Check hosting status
firebase hosting:sites:list

# Check domain status
firebase hosting:channel:list
```

## Update Environment Variables

Once your custom domain is working, update the environment variables:

### Update .env.production
```env
# Update the app URL to your custom domain
NEXT_PUBLIC_APP_URL=https://YOUR_DOMAIN.com
```

### Rebuild and Redeploy
```bash
# Rebuild with updated environment
npm run deploy:firebase
```

## Troubleshooting

### Common Issues

#### 1. DNS Not Propagating
- DNS propagation can take up to 48 hours
- Use online DNS checkers to verify propagation
- Clear local DNS cache: `sudo dnsflush` (macOS) or `ipconfig /flushdns` (Windows)

#### 2. SSL Certificate Pending
- SSL provisioning can take up to 24 hours
- Ensure DNS records are correctly configured
- Check Firebase Console for certificate status

#### 3. Domain Verification Failed
- Double-check the TXT record value
- Ensure there are no typos in the DNS records
- Some providers require @ symbol for apex domain

#### 4. Site Not Loading
```bash
# Check Firebase hosting status
firebase hosting:channel:list

# Verify DNS resolution
nslookup YOUR_DOMAIN.com

# Test with curl
curl -v https://YOUR_DOMAIN.com
```

## Security Considerations

### HSTS (HTTP Strict Transport Security)
Firebase automatically enables HSTS for custom domains to enforce HTTPS connections.

### Content Security Policy
Consider updating CSP headers if you have them configured to include your new domain.

### CORS Configuration
If you're using the domain for API calls, ensure CORS is properly configured in your Cloud Functions.

## Performance Optimization

### CDN Benefits
Your custom domain will still benefit from Firebase's global CDN for optimal performance worldwide.

### Cache Headers
The existing cache configuration will continue to work with your custom domain:
- Static assets: 1-year cache
- Images: 1-day cache  
- HTML: No cache with revalidation

## Example Setup Script

Here's a helper script to automate some of the verification:

```bash
#!/bin/bash
# save as scripts/verify-custom-domain.sh

DOMAIN="$1"
if [ -z "$DOMAIN" ]; then
    echo "Usage: $0 YOUR_DOMAIN.com"
    exit 1
fi

echo "🔍 Checking DNS for $DOMAIN..."
dig "$DOMAIN" +short

echo "🔍 Checking SSL certificate..."
openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" < /dev/null 2>/dev/null | openssl x509 -noout -dates

echo "🔍 Testing HTTP response..."
curl -I "https://$DOMAIN" 2>/dev/null | head -5

echo "🔍 Firebase hosting status..."
firebase hosting:sites:list
```

Make it executable and use:
```bash
chmod +x scripts/verify-custom-domain.sh
./scripts/verify-custom-domain.sh yourdomain.com
```

## Next Steps After Domain Setup

1. **Update Documentation**: Update README.md and other docs with new domain
2. **Update Bookmarks**: Change any development bookmarks to new domain
3. **Monitor Performance**: Use Google PageSpeed Insights to test new domain
4. **Set Up Analytics**: Configure Google Analytics with new domain if needed
5. **Update n8n Configuration**: Update any n8n workflows that reference the old domain

---

*For additional help, see the [Firebase Custom Domain Documentation](https://firebase.google.com/docs/hosting/custom-domain)*