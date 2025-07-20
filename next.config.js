/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL,
    WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,
  },
}

module.exports = nextConfig