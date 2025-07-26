# Apple Domain Verification

This directory is for Apple domain verification files.

## Steps to add Apple domain verification:

1. Go to Apple Developer Console → Services IDs → Your Service ID → Configure Sign In with Apple
2. Add domain: `n8n-automation-33c28.firebaseapp.com`
3. Download the verification file (usually named `apple-developer-domain-association.txt`)
4. Place the downloaded file in this directory
5. Deploy to Firebase hosting
6. Verify domain in Apple Developer Console

## Example file structure:
```
public/.well-known/
├── apple-developer-domain-association.txt (from Apple)
└── README.md (this file)
```