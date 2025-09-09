/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    domains: ['cloudinary.com', 'res.cloudinary.com'],
  },
  eslint: {
    ignoreDuringBuilds: true, // build never fails due to lint
  },

}

module.exports = nextConfig
