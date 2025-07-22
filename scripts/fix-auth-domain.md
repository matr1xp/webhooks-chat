# Fix Firebase Authentication Domain Error

## Quick Fix Steps

### 1. Add Domain to Firebase Console
1. Open Firebase Console: https://console.firebase.google.com/project/***REMOVED***/authentication/settings
2. Click on "Authentication" → "Settings" → "Authorized domains"
3. Click "Add domain"
4. Add: `chat.ml1.app`
5. Click "Done"

### 2. Alternative: Using Firebase CLI
```bash
# Add authorized domain via CLI
firebase auth:domain:add chat.ml1.app
```

### 3. Verify Current Authorized Domains
```bash
# List current authorized domains
firebase auth:domain:list
```

## Root Cause
Firebase Authentication requires all domains that use Google Sign-in to be pre-authorized for security reasons. When you deployed to your custom domain, it wasn't added to the authorized domains list.

## Expected Authorized Domains
Your project should have these domains authorized:
- `localhost` (for development)
- `***REMOVED***.web.app` (default Firebase hosting)
- `***REMOVED***.firebaseapp.com` (Firebase app domain)
- `chat.ml1.app` (your custom domain - MISSING)

## After Adding Domain
1. Wait 1-2 minutes for the change to propagate
2. Clear browser cache and cookies for chat.ml1.app
3. Try Google login again

## Verification
Test the login after adding the domain:
1. Go to https://chat.ml1.app
2. Click "Sign in with Google"
3. Should work without the unauthorized-domain error