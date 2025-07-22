# Deployment Guide

This guide covers deploying the chat interface static site to various cloud hosting platforms.

## Prerequisites

✅ **Completed Phase 3**: Static site generation is working
✅ **Environment Variables**: All required environment variables configured  
✅ **Cloud Functions**: Firebase Cloud Functions deployed and tested
✅ **Build Validation**: Static build passes all validation checks

## Quick Deploy Commands

```bash
# Deploy to Firebase Hosting
npm run deploy:firebase

# Deploy to Netlify
npm run deploy:netlify

# Deploy to Vercel
npm run deploy:vercel
```

## Platform-Specific Setup

### Firebase Hosting (Recommended)

Firebase Hosting is the recommended platform since we're already using Firebase for Cloud Functions.

#### Prerequisites
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Verify project access
firebase projects:list
```

#### Deploy
```bash
npm run deploy:firebase
```

#### Manual Deploy
```bash
# Build and validate
npm run deploy:prepare

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

### Netlify

#### Prerequisites
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login
```

#### Deploy
```bash
npm run deploy:netlify
```

#### Manual Deploy
```bash
# Build and validate
npm run deploy:prepare

# Deploy to Netlify
netlify deploy --prod --dir=out
```

### Vercel

#### Prerequisites
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login
```

#### Deploy
```bash
npm run deploy:vercel
```

#### Manual Deploy
```bash
# Build and validate
npm run deploy:prepare

# Deploy to Vercel
vercel --prod
```

## Build Pipeline

### Build Commands

```bash
# Standard build
npm run build

# Build with validation and optimization
npm run build:static

# Build with bundle analysis
npm run build:analyze

# Full deployment preparation
npm run deploy:prepare
```

### Build Pipeline Steps

1. **Type Check**: `tsc --noEmit`
2. **Linting**: `next lint` 
3. **Static Build**: `next build` (with static export)
4. **Compression**: Gzip all assets
5. **Validation**: Verify build integrity

### Build Validation

The build validation script checks:

- ✅ **Build Directory**: Exists and contains required files
- ✅ **Environment Variables**: Properly embedded in bundles
- ✅ **Bundle Sizes**: Within acceptable limits (< 2MB total)
- ✅ **HTML Pages**: Valid structure and asset references
- ✅ **Static Assets**: All required assets present

## Environment Variables

### Development (.env.local)
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_FIREBASE_PROJECT_ID=***REMOVED***
NEXT_PUBLIC_WEBHOOK_SEND_URL=***REMOVED***
# ... other vars
```

### Production (.env.production)
```env
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=***REMOVED***
NEXT_PUBLIC_WEBHOOK_SEND_URL=***REMOVED***
# ... other vars
```

## Performance Optimizations

### Build Optimizations
- ✅ **Static Export**: No server-side dependencies
- ✅ **Bundle Analysis**: Identify large dependencies
- ✅ **Asset Compression**: Gzip compression for all assets
- ✅ **Cache Headers**: Long-term caching for static assets

### CDN Configuration
```
# Cache Headers
*.js, *.css: Cache-Control: public, max-age=31536000, immutable
*.png, *.jpg, *.ico: Cache-Control: public, max-age=86400
```

### Bundle Analysis
```bash
# Generate bundle analysis report
npm run build:analyze
```

## Troubleshooting

### Common Issues

#### Build Fails
```bash
# Check for TypeScript errors
npm run type-check

# Check for linting issues
npm run lint

# Try basic build without validation
npm run build
```

#### Environment Variables Missing
```bash
# Validate environment variables
node scripts/validate-build.js
```

#### Large Bundle Size
```bash
# Analyze bundle size
npm run build:analyze

# Check for large dependencies
du -sh node_modules/*
```

#### Deployment Fails
```bash
# Check CLI installation
firebase --version
netlify --version
vercel --version

# Check authentication
firebase projects:list
netlify status
vercel whoami
```

## Monitoring & Maintenance

### Performance Monitoring
- Use Google PageSpeed Insights
- Monitor Core Web Vitals
- Check bundle size regularly

### Updates
```bash
# Update dependencies
npm update

# Rebuild and validate
npm run deploy:prepare

# Redeploy
npm run deploy:[platform]
```

### Security
- Regularly update dependencies
- Monitor for security vulnerabilities
- Keep Firebase SDK updated

## Advanced Configuration

### Custom Domain Setup

#### Firebase Hosting
```bash
firebase hosting:channel:deploy [channel-id]
```

#### Netlify
Configure in Netlify dashboard: Site settings > Domain management

#### Vercel  
Configure in Vercel dashboard: Project settings > Domains

### Environment-Specific Builds
```bash
# Development build
NODE_ENV=development npm run build

# Production build  
NODE_ENV=production npm run build:static
```

---

*For more information, see the main [DEPLOYMENT.md](./DEPLOYMENT.md) file.*