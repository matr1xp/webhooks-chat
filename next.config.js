const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static export for serverless deployment
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Build optimizations
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  // Temporarily disable ESLint during build for static export
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Environment variables for client-side usage
  env: {
    // Firebase configuration (already handled by NEXT_PUBLIC_ prefix)
    // Cloud Functions URLs will be set via environment variables
    NEXT_PUBLIC_FUNCTIONS_BASE_URL: process.env.NEXT_PUBLIC_FUNCTIONS_BASE_URL,
  },
  // Experimental optimizations
  // experimental: {
  //   optimizeCss: true,
  // },
}

module.exports = withBundleAnalyzer(nextConfig)