/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Ignore ESLint errors during build (production)
    // TODO: Fix ESLint errors (apostrophes non échappées) progressivement
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
