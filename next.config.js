/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false,
    images: {
        domains: ['cloudinary.com', 'res.cloudinary.com'],
      }

}

module.exports = nextConfig
